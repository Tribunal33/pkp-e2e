// U72 claim check, chunk K3: licenses, published versions, a new version, DOIs, identifiers, the wizard's Review panel.
// Spec: docs/specs/U72-chapters-work-type.md — Fields 102–107 (the wizard's Review panel "Chapters"), Rule 12
// (186–198, chapter licenses), Rules 14–16 (207–231: published versions, a new version, the wizard's Review step),
// Settings 3–5 (259–271: "Default Chapter License URL", DOI "Chapters", "Enable for Chapters"), A3 (394–407);
// footnotes g, h, n, o, p, q, f-a3 and the open questions td3, td11 (wizard leg), td13, td14, td15, td18.
//
//   PROBE_FEATURE=U72 PROBE_AGENT=ccK3 node bin/probe.js omp shared/playwright/checks/U72/K3/k3.js
//   PROBE_FEATURE=U72 PROBE_AGENT=ccK3 node bin/probe.js ojs shared/playwright/checks/U72/K3/k3.js   (control; also ops)
//   PHASES=a,b (default: all of ALL, in order). State in k3-state-<app>.json under the output folder, so a phase
//   re-runs alone; RESEED=1 seeds afresh (a new tag). One app per process keeps a run under the Bash cap.
//
// OMP, tag prefix u72k3. Press "P": users mg (manager), se (Series editor), sn (Series editor assigned without the
// metadata-edit permission), le (Layout Editor), au (Author); contributors Ada, Ben on the books that need them.
//   W1  draft Edited Volume, chapters "Tides" (subtitle "A Study", authors the submitter, Ada, Ben) and "Harbours":
//       the Review panel as seeded, its "Edit", an edit and a deletion in the same wizard, "Order" (authors, chapters),
//       reload; the wizard left with a changed, unsaved Title.
//   W2  draft Monograph with chapter "Tides": the panel on a Monograph.
//   W3  draft Edited Volume, no chapter (td18): Review, add "Tides"/"A Study", delete it, Submit with an empty list.
//   W4  draft Monograph, no chapter: Review, Submit with an empty list.
//   PUB published Edited Volume, se, sn, le assigned, chapters "Tides", "Harbours" (Rule 14, td3): the published
//       version's Chapters page per role; the manager's "Prologue" and the reader's book page at once; the Layout
//       Editor's "Epilogue".
//   VER published Edited Volume with dates on, a Chapter Manuscript file and a format "PDF" with a file; "Tides"
//       carries everything (Ben, both files), "Harbours" Ada; "Create New Version" on screen (Rule 15, td15, A3).
// Press "LIC": the press license "CC Attribution 4.0" set on screen (Settings › Distribution › License) (td13):
//   L0  Edited Volume, nothing set on the version: the sentence names the press's license; published on screen.
//   L1  Edited Volume, the version's "License URL" CC BY-NC 4.0 typed on "Permissions & Disclosure"; published.
//   L2  Edited Volume, "Default Chapter License URL" https://example.org/chapter-default; published.
//   LM  Monograph: no "License URL", no "Default Chapter License URL"; published: the chapters receive nothing.
//   Each EV book: "Tides" (empty box) and "Harbours" (https://example.org/own-license).
// Press "NOL": no license anywhere: the sentence's absent end; the Permissions page left with an unsaved change.
// Presses "DOFF" (DOIs on, "Chapters" off) and "DON" (DOIs on, "Chapters" on), "Upon publication": a book with
//   "Tides" ("Chapter Page" ticked) and "Harbours" (unticked), published on screen (Settings 4, td14).
// Presses "IDP" ("Publisher ID" › "Enable for Chapters") and "IDU" (URN plugin, chapters on): the "Identifiers" tab
//   (Settings 5), the tab switch with an unsaved change; press P is the default end.
// OJS / OPS: a scratch context's wizard Review (no "Chapters" panel) and "Permissions & Disclosure" (no "Default
//   Chapter License URL"): the read-only controls.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['defaults', 'wizard', 'wizardEmpty', 'license', 'doi', 'ids', 'published', 'version', 'late', 'ids2', 'control'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const T0 = Date.now();
const CCBY = 'https://creativecommons.org/licenses/by/4.0';
const CCBYNC = 'https://creativecommons.org/licenses/by-nc/4.0';
const OWN = 'https://example.org/own-license';
const CHDEF = 'https://example.org/chapter-default';

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const log = (...a) => console.log(`[k3 ${app.name} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const sf = path.join(outDir(), `k3-state-${app.name}.json`);
    let S = (!process.env.RESEED && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k3-facts', {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 2500)); };
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
    const bookPub = (sid) => (db(`select current_publication_id from submissions where submission_id=${sid}`)[0] || '').trim();
    const pubsOf = (sid) => db(`select publication_id from publications where submission_id=${sid} order by publication_id`).map((x) => x.trim());
    const chRows = (pub) => db(`select c.chapter_id, c.seq, c.doi_id, (select doi from dois d where d.doi_id=c.doi_id), (select string_agg(setting_name || ':' || coalesce(locale, '') || '=' || left(setting_value, 70), '; ' order by setting_name) from submission_chapter_settings where chapter_id=c.chapter_id), (select string_agg(a.author_id || '@' || a.seq || '/pub' || au.publication_id, ',' order by a.seq) from submission_chapter_authors a join authors au on au.author_id=a.author_id where a.chapter_id=c.chapter_id) from submission_chapters c where c.publication_id=${pub} order by c.seq`);
    const chFiles = (sid) => db(`select sf.submission_file_id, sf.file_stage, sf.assoc_type, sf.assoc_id, (select setting_value from submission_file_settings s where s.submission_file_id=sf.submission_file_id and setting_name='chapterId'), (select setting_value from submission_file_settings s where s.submission_file_id=sf.submission_file_id and setting_name='name' limit 1) from submission_files sf where sf.submission_id=${sid} order by 1`);

    await app.api.bootstrapProbe(app.contextPath);

    // ================================================================== seed
    if (!S.seeded) {
        const t = tag('u72k3');
        S = {t, errs: {}};
        const ctxBase = (X, name, extra = {}) => ({tag: X, context: {name: `U72 K3 ${name} ${X}`, contactName: 'Paula Principal', contactEmail: `principal${X}@mail.test`}, ...extra});
        if (isOMP) {
            const P = t;
            const users = [
                {username: `${P}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
                {username: `${P}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Series'},
                {username: `${P}sn`, roles: ['sectionEditor'], givenName: 'Nina', familyName: 'Nometa'},
                {username: `${P}le`, roles: ['layoutEditor'], givenName: 'Leo', familyName: 'Layout'},
                {username: `${P}au`, roles: ['author'], givenName: 'Alma', familyName: 'Author'},
            ];
            const ctx = await app.api.createContext(ctxBase(P, 'press', {users}));
            S.P = {path: ctx.path, mg: `${P}mg`, se: `${P}se`, sn: `${P}sn`, le: `${P}le`, au: `${P}au`};
            save();
            const ada = {givenName: 'Ada', familyName: 'Lovel', email: `${P}ada@mail.test`};
            const ben = {givenName: 'Ben', familyName: 'Barrow', email: `${P}ben@mail.test`};
            const prod = ['accept', 'sendToProduction'];
            const part = [{username: `${P}se`, role: 'sectionEditor'}, {username: `${P}sn`, role: 'sectionEditor', canChangeMetadata: false}, {username: `${P}le`, role: 'layoutEditor'}];
            const books = {
                W1: {title: 'K3 Wizard Volume', workType: 'editedVolume', submitted: false, contributors: [ada, ben], files: [{file: 'article.pdf'}],
                    chapters: [{title: 'Tides', subtitle: 'A Study', authors: [`${P}au`, ada.email, ben.email]}, {title: 'Harbours'}]},
                W2: {title: 'K3 Wizard Monograph', submitted: false, files: [{file: 'article.pdf'}], chapters: [{title: 'Tides', subtitle: 'A Study', authors: [`${P}au`]}]},
                W3: {title: 'K3 Empty Volume', workType: 'editedVolume', submitted: false, files: [{file: 'article.pdf'}]},
                W4: {title: 'K3 Empty Monograph', submitted: false, files: [{file: 'article.pdf'}]},
                PUB: {title: 'K3 Published Volume', workType: 'editedVolume', decisions: prod, participants: part, contributors: [ada], published: true,
                    chapters: [{title: 'Tides', authors: [`${P}au`]}, {title: 'Harbours', authors: [ada.email]}]},
                VER: {title: 'K3 Version Volume', workType: 'editedVolume', decisions: prod, contributors: [ada, ben], published: true, enableChapterPublicationDates: true,
                    files: [{file: 'article.pdf', genre: 'Chapter Manuscript'}], publicationFormats: [{name: 'PDF', file: 'replacement.pdf'}],
                    chapters: [{title: 'Tides', subtitle: 'A Study', abstract: 'Tides abstract text.', pages: '1-24', datePublished: '2024-05-01', licenseUrl: OWN, page: true,
                        authors: [ben.email], files: ['files.0', 'publicationFormats.0']},
                    {title: 'Harbours', pages: '25-40', authors: [ada.email]}]},
            };
            S.B = {};
            for (const [k, b] of Object.entries(books)) {
                try {
                    const r = await app.api.createSubmission({tag: `${t}${k.toLowerCase()}`, context: P, submitter: `${P}au`, ...b});
                    S.B[k] = {id: r.submissionId, chapters: r.chapters || null, contributors: r.contributors || null, formats: r.publicationFormats || null};
                } catch (e) { S.errs[k] = flat(e.message, 600); }
                save();
            }
            // Press LIC: license set on screen in the "license" phase; four books.
            try {
                const X = `${t}lic`;
                const c = await app.api.createContext(ctxBase(X, 'license press', {users: [{username: `${X}mg`, roles: ['manager']}, {username: `${X}au`, roles: ['author']}]}));
                S.LIC = {path: c.path, mg: `${X}mg`, au: `${X}au`, books: {}};
                const ev = (title, extra = {}) => ({title, workType: 'editedVolume', decisions: prod, chapters: [{title: 'Tides'}, {title: 'Harbours', licenseUrl: OWN}], ...extra});
                for (const [k, b] of Object.entries({L0: ev('K3 License Press Default'), L1: ev('K3 License Version'), L2: ev('K3 License Chapter Default'),
                    LM: {title: 'K3 License Monograph', decisions: prod, chapters: [{title: 'Tides'}]}})) {
                    const r = await app.api.createSubmission({tag: `${X}${k.toLowerCase()}`, context: X, submitter: `${X}au`, ...b});
                    S.LIC.books[k] = {id: r.submissionId};
                    save();
                }
            } catch (e) { S.errs.LIC = flat(e.message, 600); }
            save();
            // Press NOL: no license anywhere.
            try {
                const X = `${t}nol`;
                const c = await app.api.createContext(ctxBase(X, 'no-license press', {users: [{username: `${X}mg`, roles: ['manager']}, {username: `${X}au`, roles: ['author']}]}));
                const b = await app.api.createSubmission({tag: `${X}b`, context: X, submitter: `${X}au`, title: 'K3 No License Volume', workType: 'editedVolume', decisions: prod, chapters: [{title: 'Tides'}]});
                S.NOL = {path: c.path, mg: `${X}mg`, au: `${X}au`, book: {id: b.submissionId}};
            } catch (e) { S.errs.NOL = flat(e.message, 600); }
            save();
            // Presses DOFF / DON.
            for (const [k, types] of [['DOFF', ['publication']], ['DON', ['publication', 'chapter']]]) {
                try {
                    const X = `${t}${k.toLowerCase()}`;
                    const c = await app.api.createContext(ctxBase(X, `DOI ${k} press`, {enableDois: true, doiPrefix: '10.1234', enabledDoiTypes: types, doiCreationTime: 'publication',
                        users: [{username: `${X}mg`, roles: ['manager']}, {username: `${X}au`, roles: ['author']}]}));
                    const b = await app.api.createSubmission({tag: `${X}b`, context: X, submitter: `${X}au`, title: `K3 DOI Book ${k}`, workType: 'editedVolume', decisions: prod,
                        chapters: [{title: 'Tides', page: true}, {title: 'Harbours'}]});
                    S[k] = {path: c.path, mg: `${X}mg`, au: `${X}au`, book: {id: b.submissionId}};
                } catch (e) { S.errs[k] = flat(e.message, 600); }
                save();
            }
            // Presses IDP (Publisher ID for chapters) and IDU (URN plugin, chapters).
            for (const [k, extra] of [['IDP', {enablePublisherId: ['chapter']}],
                ['IDU', {plugins: {urnpubidplugin: {enabled: true, settings: {enableChapterURN: true, urnPrefix: 'urn:nbn:de:0000-', urnSuffix: 'default', urnNamespace: 'urn:nbn:de', urnCheckNo: false}}}}]]) {
                try {
                    const X = `${t}${k.toLowerCase()}`;
                    const c = await app.api.createContext(ctxBase(X, `ids ${k} press`, {...extra,
                        users: [{username: `${X}mg`, roles: ['manager']}, {username: `${X}le`, roles: ['layoutEditor']}, {username: `${X}au`, roles: ['author']}]}));
                    const b = await app.api.createSubmission({tag: `${X}b`, context: X, submitter: `${X}au`, title: `K3 Identifiers Book ${k}`, decisions: prod,
                        participants: [{username: `${X}le`, role: 'layoutEditor'}], chapters: [{title: 'Tides'}]});
                    S[k] = {path: c.path, mg: `${X}mg`, le: `${X}le`, au: `${X}au`, book: {id: b.submissionId}};
                } catch (e) { S.errs[k] = flat(e.message, 600); }
                save();
            }
        } else {
            const X = t;
            const c = await app.api.createContext(ctxBase(X, 'control', {users: [{username: `${X}mg`, roles: ['manager']}, {username: `${X}au`, roles: ['author']}]}));
            S.X = {path: c.path, mg: `${X}mg`, au: `${X}au`};
            const s = await app.api.createSubmission({tag: `${X}s`, context: X, submitter: `${X}au`, title: 'K3 Control Submission'});
            const d = await app.api.createSubmission({tag: `${X}d`, context: X, submitter: `${X}au`, title: 'K3 Control Draft', submitted: false, ...(app.name === 'ojs' ? {files: [{file: 'article.pdf'}]} : {})});
            S.X.sub = s.submissionId; S.X.draft = d.submissionId;
        }
        S.seeded = true;
        save();
        fact('seed', S);
    }

    // ------------------------------------------------------------------ browser, recorders
    const {page, close} = await launch(app);
    const bad = [], pageErrors = [], dialogs = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push({at: Date.now(), status: r.status(), m: r.request().method(), url: strip(r.url()).slice(0, 200)}); });
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), text: flat(e.message, 300), url: strip(page.url())}));
    let dialogMode = 'accept';
    page.on('dialog', async (d) => {
        dialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 200), answered: d.type() === 'beforeunload' ? 'accept' : dialogMode});
        if (dialogMode === 'dismiss' && d.type() !== 'beforeunload') await d.dismiss().catch(() => {}); else await d.accept().catch(() => {});
    });
    const seqPosts = [];
    page.on('response', async (q) => { if (/save-sequence/i.test(q.url())) seqPosts.push({at: Date.now(), status: q.status(), body: (q.request().postData() || '').slice(0, 600)}); });
    const since = (arr, t0) => arr.filter((e) => e.at >= t0).map(({at, ...x}) => x);
    let snapN = S.snapN || 0;
    async function snap(name, extra, {png = false} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `k3-${String(++snapN).padStart(3, '0')}-${name}`;
        S.snapN = snapN; save();
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
    const grid = () => page.locator('[id^="component-grid-users-chapter-chaptergrid"]').first();
    async function openKey(ctx, sid, key, {author = false} = {}) {
        await go((author ? auUrl : wfUrl)(ctx, sid, key));
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await sleep(1000);
    }
    async function openChapters(ctx, sid, {author = false, pub = null} = {}) {
        const p = pub || bookPub(sid);
        await openKey(ctx, sid, `publication_${p}_chapters`, {author});
        await grid().waitFor({timeout: 15000}).catch(() => {});
        await idle(page);
    }
    async function readGrid() {
        const g = grid();
        if (!(await g.count())) return {grid: false};
        return g.evaluate((root) => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const out = {actions: [...root.querySelectorAll('.header a, .header button')].filter((a) => a.offsetParent !== null).map((a) => t(a)).filter(Boolean),
                links: [...root.querySelectorAll('a.pkp_linkaction_editChapter')].filter((a) => a.offsetParent !== null).map(t)};
            out.text = t(root);
            return out;
        });
    }
    const chapterForm = () => page.locator('form#editChapterForm:visible').first();
    async function readForm() {
        const f = chapterForm();
        await f.locator('input[name^="title["]').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(700);
        const win = page.locator('.pkp_modal_panel:visible, [role="dialog"]:visible').filter({has: page.locator('form#editChapterForm')}).last();
        return {
            windowHeading: flat(await win.locator('h1, h2, .header').first().innerText().catch(() => null), 120),
            tabs: (await page.locator('[role="tab"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)),
            text: flat(await f.innerText().catch(() => ''), 2500),
            description: (await f.locator('.pkpFormField__description, .description').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)).filter(Boolean),
            descLinks: await f.locator('.pkpFormField__description a, .description a').evaluateAll((els) => els.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')}))).catch(() => []),
            inputs: await f.evaluate((root) => [...root.querySelectorAll('input, textarea, select')].filter((e) => e.type !== 'hidden' || /datePublished/.test(e.name)).map((e) => ({name: e.name, type: e.type, value: e.type === 'checkbox' ? e.value : (e.value || '').slice(0, 300), checked: e.type === 'checkbox' ? e.checked : undefined, visible: e.offsetParent !== null,
                label: e.type === 'checkbox' ? (e.closest('label') || e.parentElement).innerText.trim().slice(0, 200) : undefined,
                rich: e.tagName === 'TEXTAREA' && window.tinymce && window.tinymce.get(e.id) ? window.tinymce.get(e.id).getContent() : undefined}))).catch(() => []),
        };
    }
    const boxList = (f, name) => f.inputs.filter((i) => i.name === name).map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.label}`);
    const val = (f, name) => (f.inputs.find((i) => i.name === name) || {}).value ?? null;
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
    async function saveForm() {
        const r = page.waitForResponse((x) => x.request().method() === 'POST' && /update-chapter/i.test(x.url()), {timeout: T}).catch(() => null);
        await chapterForm().getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await r;
        let body = null;
        try { body = resp ? flat(await resp.text(), 300) : null; } catch { /* */ }
        await idle(page); await sleep(900);
        const notices = (await page.locator('.pkp_notification, [role="status"], .pnotify, .ui-pnotify').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
        return {status: resp ? resp.status() : null, body, formStillOpen: await chapterForm().count() > 0, notices};
    }
    async function cancelForm() {
        await chapterForm().locator('a:visible, button:visible').filter({hasText: /^\s*Cancel\s*$/}).first().click().catch(() => {});
        await sleep(700);
    }
    async function rowDelete(title) {
        const row = grid().locator('tr.gridRow').filter({has: page.getByRole('link', {name: title, exact: true})}).first();
        await row.locator('a.show_extras').first().click(); await sleep(500);
        const ctl = page.locator(`#${await row.getAttribute('id')}-control-row`);
        const controls = (await ctl.locator('a:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        await ctl.locator('a.pkp_linkaction_deleteChapter:visible').first().click();
        const cd = page.locator('[role="dialog"]:visible, .pkp_modal_confirmation:visible').filter({hasText: 'Are you sure'}).last();
        await cd.waitFor({timeout: T});
        const confirmText = flat(await cd.innerText(), 300);
        const del = page.waitForResponse((x) => /delete-chapter/i.test(x.url()), {timeout: T}).catch(() => null);
        await cd.getByRole('button', {name: 'OK', exact: true}).click();
        const dr = await del;
        await idle(page); await sleep(900);
        return {controls, confirmText, status: dr ? dr.status() : null};
    }
    async function rowControls(title) {
        const row = grid().locator('tr.gridRow').filter({hasText: title}).first();
        const arrow = row.locator('a.show_extras');
        const out = {arrow: await arrow.count()};
        if (out.arrow) {
            await arrow.first().click(); await sleep(500);
            const ctl = page.locator(`#${await row.getAttribute('id')}-control-row`);
            out.controls = (await ctl.locator('a:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
            await page.locator(`#${await row.getAttribute('id')} a.hide_extras`).first().click().catch(() => {});
            await sleep(300);
        }
        return out;
    }
    /** Publish the book's current version on screen, as the signed-in manager. */
    async function publishOnScreen(ctx, sid, label) {
        const r = {};
        await openKey(ctx, sid, `publication_${bookPub(sid)}_titleAbstract`);
        const controls = () => page.locator('[data-cy="workflow-controls-right"]');
        const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
        await button.waitFor({state: 'visible', timeout: T});
        r.button = flat(await button.innerText(), 60);
        await button.click();
        await sleep(1500); await idle(page);
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        if (await panel.isVisible().catch(() => false)) {
            r.panel = flat(await panel.innerText(), 600);
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click().catch(() => {});
            await sleep(1000);
        }
        const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|make this catalog entry public|publish/i}).last();
        r.confirm = flat(await confirm.innerText().catch(() => ''), 500);
        r.snapConfirm = await snap(`${label}-publish-confirm`, null);
        const w = page.waitForResponse((x) => /\/publications\/\d+\/publish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click().catch((e) => { r.pubErr = flat(e.message, 200); });
        const pr = await w; r.status = pr ? pr.status() : null;
        await idle(page); await sleep(1200);
        r.snapAfter = await snap(`${label}-after-publish`, null, {png: true});
        return r;
    }
    /** The version's "Permissions & Disclosure" page: its fields as data. */
    async function readPerm(ctx, sid, pub, {author = false} = {}) {
        await openKey(ctx, sid, `publication_${pub || bookPub(sid)}_license`, {author});
        await wf().locator('input[name="licenseUrl"]').first().waitFor({timeout: 15000}).catch(() => {});
        await idle(page); await sleep(800);
        return wf().evaluate((root) => {
            const form = root.querySelector('form') || root;
            return {
                labels: [...form.querySelectorAll('label, legend')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
                inputs: [...form.querySelectorAll('input')].filter((e) => e.type !== 'hidden').map((e) => ({name: e.name, value: e.value, disabled: e.disabled, visible: e.offsetParent !== null})),
                text: (form.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1500),
            };
        }).catch((e) => ({err: flat(e.message, 200)}));
    }
    async function savePerm(values) {
        const overrides = [];
        for (const [name, v] of Object.entries(values)) {
            const box = wf().locator(`input[name="${name}"]`).first();
            if (await box.isDisabled().catch(() => false)) {
                const fld = wf().locator('.pkpFormField').filter({has: page.locator(`input[name="${name}"]`)}).first();
                await fld.getByRole('button', {name: /Override/}).first().click().catch(() => {});
                await sleep(400);
                overrides.push({name, enabledAfterOverride: !(await box.isDisabled().catch(() => true))});
            }
            await box.fill(v);
        }
        const sv = page.waitForResponse((x) => /publications\/\d+/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
        const svr = await sv;
        await idle(page); await sleep(900);
        const statuses = (await page.locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean);
        return {status: svr ? svr.status() : null, statuses, overrides};
    }
    async function openSettingsTab(ctx, slug, tabName) {
        await go(cu(ctx, `/management/settings/${slug}`));
        const tab = page.getByRole('tab', {name: tabName, exact: true}).first();
        if (await tab.count()) { await tab.click(); await idle(page); await sleep(900); }
        return page.locator('[role="tabpanel"]:visible').first();
    }
    async function formSave(form) {
        const r = page.waitForResponse((x) => /\/api\/v1\//.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await r;
        const seen = new Set(); const start = Date.now();
        while (Date.now() - start < 6_000) { for (const x of await page.locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])) if (x.trim()) seen.add(x.trim()); if (seen.has('Saved')) break; await sleep(250); }
        return {status: resp ? resp.status() : null, statuses: [...seen], fieldErrors: await form.locator('.pkpFieldError').allInnerTexts().catch(() => [])};
    }
    async function readerToc(ctx, sid) {
        const {page: v, close: vclose} = await launch(app, {record: false});
        try {
            const resp = await v.goto(cu(ctx, `/catalog/book/${sid}`)); await idle(v);
            const s = await screen(v);
            return {status: resp && resp.status(), toc: flat(await v.locator('.chapters, .item.chapters, ul.chapters').first().innerText().catch(() => ''), 800), snapText: flat(s.text?.main || s.text?.body || '', 200)};
        } finally { await vclose(); }
    }

    // ================================================================== wizard helpers
    const current = () => page.locator('.pkpSteps__step__label--current');
    async function wizardTo(name) {
        for (let i = 0; i < 7; i++) {
            const c = flat(await current().innerText().catch(() => ''), 60);
            if (new RegExp(`${name}$`).test(c)) return c;
            const railBtn = page.locator('button.pkpSteps__step__label').filter({hasText: new RegExp(`${name}$`)});
            if (i === 0 && await railBtn.count()) {
                if (await page.locator('.pkpSteps--collapsed').count()) await page.locator('.pkpSteps__controls button').click().catch(() => {});
                await railBtn.first().click().catch(() => {});
            } else {
                await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click().catch(() => {});
            }
            await sleep(1200); await idle(page);
            await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: 20000}).catch(() => {});
        }
        return flat(await current().innerText().catch(() => ''), 60);
    }
    const chaptersPanel = () => page.locator('.submissionWizard__reviewPanel').filter({has: page.locator('h2, h3, h4, .submissionWizard__reviewPanel__header').filter({hasText: /^\s*Chapters\s*$/})}).first();
    async function readReview() {
        await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: 20000}).catch(() => {});
        await idle(page); await sleep(600);
        const p = chaptersPanel();
        const out = {panels: await page.locator('.submissionWizard__reviewPanel').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => { const h = e.querySelector('h2, h3, h4, .submissionWizard__reviewPanel__header'); return h ? h.innerText.replace(/\s+/g, ' ').trim() : '?'; })).catch(() => []),
            banner: flat(await page.locator('.submissionWizard__review_errors').innerText().catch(() => ''), 800), chapters: null};
        if (await p.count()) {
            out.chapters = await p.evaluate((e) => ({
                text: e.innerText.replace(/[ \t]+/g, ' ').trim(),
                header: (e.querySelector('.submissionWizard__reviewPanel__header') || {}).innerText,
                buttons: [...e.querySelectorAll('button, a')].map((b) => ({text: b.innerText.trim(), aria: b.getAttribute('aria-label')})),
                items: [...e.querySelectorAll('.submissionWizard__reviewPanel__item, li')].map((i) => i.innerText.replace(/[ \t]+/g, ' ').trim()),
                html: e.innerHTML.replace(/\s+/g, ' ').slice(0, 2500),
            }));
        }
        return out;
    }
    async function submitWizard() {
        const r = {};
        const box = page.getByRole('checkbox', {name: /agree to the copyright statement/});
        if (await box.count()) { await box.check().catch(() => {}); r.copyrightTicked = true; }
        const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
        r.submitEnabled = await submit.isEnabled().catch(() => null);
        await submit.click().catch((e) => { r.clickErr = flat(e.message, 150); });
        const dlg = page.getByRole('dialog').filter({hasText: 'Are you sure you want to complete this submission?'});
        await dlg.waitFor({timeout: 10000}).catch(() => {});
        r.dialog = flat(await dlg.innerText().catch(() => ''), 300);
        const sr = page.waitForResponse((x) => /\/submit$/.test(x.url().split('?')[0]) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Submit', exact: true}).click().catch((e) => { r.dlgErr = flat(e.message, 150); });
        const resp = await sr; r.submitStatus = resp ? resp.status() : null;
        await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: T}).catch(() => {});
        await idle(page);
        r.completeHeading = await page.getByRole('heading', {name: 'Submission complete'}).count();
        return r;
    }

    // ================================================================== defaults: what a new press has (Settings 3–5 defaults)
    await sect('defaults', async () => {
        if (!isOMP) return;
        const P = S.P;
        const r = {};
        await as(P.mg, P.path);
        const doiPanel = await openSettingsTab(P.path, 'distribution', 'DOIs');
        await doiPanel.locator('input[type="checkbox"]').first().waitFor({timeout: 15000}).catch(() => {});
        r.doiBoxes = await doiPanel.locator('input[type="checkbox"]').evaluateAll((els) => els.map((e) => ({name: e.name, value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim()})));
        r.doiSnap = await snap('defaults-doi-settings', {boxes: r.doiBoxes}, {png: true});
        const licPanel = await openSettingsTab(P.path, 'distribution', 'License');
        r.license = await licPanel.locator('input[name="licenseUrl"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, type: e.type}))).catch(() => []);
        r.licSnap = await snap('defaults-license-settings', {license: r.license});
        await go(cu(P.path, '/management/settings/workflow'));
        const tabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        r.workflowTabs = tabs;
        const md = page.getByRole('tab', {name: 'Metadata', exact: true}).first();
        if (await md.count()) { await md.click(); await idle(page); await sleep(800); }
        const pid = page.getByRole('checkbox', {name: 'Enable for Chapters', exact: true});
        r.pidBox = {count: await pid.count(), checked: await pid.first().isChecked().catch(() => null)};
        r.pidGroup = flat(await page.locator('fieldset, .pkpFormField').filter({hasText: 'Publisher ID'}).first().innerText().catch(() => ''), 600);
        r.pidSnap = await snap('defaults-publisher-id-settings', {pid: r.pidBox, group: r.pidGroup}, {png: true});
        await loc(page, 'Settings › Workflow › Metadata: "Enable for Chapters"', pid);
        // the default chapter window (press P, book W... use PUB's published chapter? use VER is published; use NOL-like: PUB)
        await openChapters(P.path, S.B.PUB.id);
        await editChapterOpen('Tides');
        const f = await readForm();
        r.defaultWindowTabs = f.tabs;
        r.windowSnap = await snap('defaults-chapter-window-tabs', {tabs: f.tabs, heading: f.windowHeading}, {png: true});
        await cancelForm();
        fact('defaults', r);
    });

    // ================================================================== wizard: the Review panel (Fields 102–106, Rule 16, td11 wizard leg)
    await sect('wizard', async () => {
        if (!isOMP) return;
        const P = S.P, W1 = S.B.W1, W2 = S.B.W2;
        const r = {};
        await as(P.au, P.path);
        const wurl = (id) => cu(P.path, `/submission?id=${id}`);
        await go(wurl(W1.id)); await sleep(800);
        r.rail = await page.locator('.pkpSteps__step__label').allInnerTexts().catch(() => []);
        r.reached = await wizardTo('Review');
        r.review0 = await readReview();
        r.s0 = await snap('wizard-w1-review-seeded', {review: r.review0}, {png: true});
        await loc(page, 'Wizard Review: the "Chapters" panel', chaptersPanel());
        // "Edit" in the panel
        const edit = chaptersPanel().getByRole('button', {name: /Edit/}).first();
        r.editName = await edit.getAttribute('aria-label').catch(() => null) || flat(await edit.innerText().catch(() => ''), 60);
        await loc(page, 'Wizard Review "Chapters": its Edit button', edit);
        await edit.click();
        await sleep(1200); await idle(page);
        r.afterEdit = flat(await current().innerText().catch(() => ''), 60);
        r.afterEditUrl = strip(page.url());
        r.afterEditGrid = (await readGrid()).text;
        r.s1 = await snap('wizard-w1-after-panel-edit', {current: r.afterEdit, url: r.afterEditUrl}, {png: true});
        // the page source's click handlers of the review panels' "Edit" (the chapters panel's step id)
        r.editHandlers = await page.evaluate(() => fetch(location.href, {credentials: 'same-origin'}).then((x) => x.text()).then((h) => (h.match(/openStep\([^)]*\)/g) || []))).catch((e) => `ERR ${e.message}`);
        if (!/Details$/.test(r.afterEdit)) {
            // a second press, after a pause, then the Details panel's own "Edit" as the control
            await sleep(1500);
            await chaptersPanel().getByRole('button', {name: /Edit/}).first().click();
            await sleep(1500); await idle(page);
            r.afterEdit2 = flat(await current().innerText().catch(() => ''), 60);
            const detailsPanel = page.locator('.submissionWizard__reviewPanel').filter({has: page.locator('h3, h2').filter({hasText: /^\s*Details\s*$/})}).first();
            await detailsPanel.getByRole('button', {name: /Edit/}).first().click();
            await sleep(1500); await idle(page);
            r.afterDetailsEdit = flat(await current().innerText().catch(() => ''), 60);
            r.s1b = await snap('wizard-w1-after-details-panel-edit', {current: r.afterDetailsEdit}, {png: true});
        }
        await wizardTo('Details');
        await grid().waitFor({timeout: T}).catch(() => {});
        // an edit: Harbours gets subtitle "Ports"
        await editChapterOpen('Harbours');
        await chapterForm().locator('input[name="subtitle[en]"]').fill('Ports');
        r.editSave = await saveForm();
        // an addition: "Estuaries" / "Mouths", Ada ticked
        await addChapterOpen();
        await chapterForm().locator('input[name="title[en]"]').fill('Estuaries');
        await chapterForm().locator('input[name="subtitle[en]"]').fill('Mouths');
        const boxes = chapterForm().locator('input[name="authors[]"]');
        for (let i = 0; i < await boxes.count(); i++) {
            const lab = await boxes.nth(i).evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim());
            if (/Ada/.test(lab)) await boxes.nth(i).check();
        }
        r.addSave = await saveForm();
        await wizardTo('Review');
        r.review1 = await readReview();
        r.s2 = await snap('wizard-w1-review-after-edit-add', {review: r.review1}, {png: true});
        // a deletion: Estuaries
        await wizardTo('Details');
        r.del = await rowDelete('Estuaries').catch((e) => ({err: flat(e.message, 200)}));
        await wizardTo('Review');
        r.review2 = await readReview();
        r.s3 = await snap('wizard-w1-review-after-delete', {review: r.review2}, {png: true});
        // "Order": authors of Tides (Ben above Alma), then a chapter drag (Harbours above Tides)
        await wizardTo('Details');
        const t1 = Date.now();
        await grid().getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(900);
        const tidesBody = () => grid().locator('tbody').filter({has: page.locator('a.pkp_linkaction_editChapter', {hasText: 'Tides'})}).first();
        const authorRow = (name) => tidesBody().locator('tr.gridRow').filter({hasText: name}).first();
        r.orderBefore = flat(await grid().innerText(), 500);
        {
            const from = authorRow('Ben Barrow').locator('td').first();
            const to = authorRow('Alma Author');
            await from.scrollIntoViewIfNeeded().catch(() => {});
            const a = await from.boundingBox(); const b = await to.boundingBox();
            if (a && b) {
                await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
                await page.mouse.down();
                await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 - 6, {steps: 5});
                await page.mouse.move(b.x + b.width / 2, b.y + 2, {steps: 25});
                await sleep(300); await page.mouse.up(); await sleep(600);
            } else r.dragNoBox = true;
        }
        // chapter drag attempt: Harbours row onto Tides' top
        {
            const h = grid().locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_editChapter', {hasText: 'Harbours'})}).first().locator('td').first();
            const target = tidesBody();
            const a = await h.boundingBox(); const b = await target.boundingBox();
            if (a && b) {
                const sx = a.x + a.width - 30;
                await page.mouse.move(sx, a.y + a.height / 2); await page.mouse.down();
                await page.mouse.move(sx, a.y + a.height / 2 - 5, {steps: 5});
                await page.mouse.move(sx, b.y - 12, {steps: 30});
                await sleep(400); await page.mouse.up(); await sleep(700);
            }
        }
        r.orderDuring = flat(await grid().innerText(), 500);
        await grid().getByRole('link', {name: 'Done', exact: true}).or(grid().getByRole('button', {name: 'Done', exact: true})).first().click();
        await idle(page); await sleep(1200);
        r.seq = since(seqPosts, t1);
        r.orderAfterDone = flat(await grid().innerText(), 500);
        r.s4 = await snap('wizard-w1-details-after-order-done', {seq: r.seq}, {png: true});
        await wizardTo('Review');
        r.review3 = await readReview();
        r.s5 = await snap('wizard-w1-review-after-order', {review: r.review3}, {png: true});
        await page.reload(); await idle(page); await sleep(1500);
        r.afterReloadStep = flat(await current().innerText().catch(() => ''), 60);
        if (!/Review$/.test(r.afterReloadStep)) await wizardTo('Review');
        r.review4 = await readReview();
        r.s6 = await snap('wizard-w1-review-after-reload', {review: r.review4}, {png: true});
        r.db = chRows(bookPub(W1.id));
        // Leaving the wizard with a changed, unsaved Title (the stepped screen's way out)
        await wizardTo('Details');
        const d0 = Date.now();
        const titleFrame = page.frameLocator('#titleAbstract-title-control-en_ifr');
        await titleFrame.locator('body').click().catch(() => {});
        await page.keyboard.press('End'); await page.keyboard.type(' Changed');
        await sleep(300);
        await page.locator('.pkpSteps__step__label').filter({hasText: /Review$/}).first().click().catch(() => {});
        await sleep(1500); await idle(page);
        r.leaveViaRail = {step: flat(await current().innerText().catch(() => ''), 60), dialogs: since(dialogs, d0)};
        await wizardTo('Details');
        await titleFrame.locator('body').click().catch(() => {});
        await page.keyboard.press('End'); await page.keyboard.type(' Again');
        await sleep(300);
        const d1 = Date.now();
        await go(cu(P.path, '/dashboard/mySubmissions'));
        r.leaveViaGoto = {url: strip(page.url()), dialogs: since(dialogs, d1)};
        await go(wurl(W1.id)); await sleep(800);
        await wizardTo('Details');
        r.titleAfterReturn = await page.evaluate(() => window.tinymce?.get('titleAbstract-title-control-en')?.getContent() ?? null).catch(() => null);
        r.s7 = await snap('wizard-w1-details-after-leaving', {title: r.titleAfterReturn, leave: r.leaveViaRail, goto: r.leaveViaGoto}, {png: true});
        // W2: a Monograph with a chapter
        await go(wurl(W2.id)); await sleep(800);
        await wizardTo('Review');
        r.w2Review = await readReview();
        r.s8 = await snap('wizard-w2-monograph-review', {review: r.w2Review}, {png: true});
        fact('wizard', r);
    });

    // ================================================================== wizardEmpty: td18 (Edited Volume) and the Monograph end
    await sect('wizardEmpty', async () => {
        if (!isOMP) return;
        const P = S.P, W3 = S.B.W3, W4 = S.B.W4;
        const r = {};
        await as(P.au, P.path);
        const wurl = (id) => cu(P.path, `/submission?id=${id}`);
        await go(wurl(W3.id)); await sleep(800);
        r.w3Reached = await wizardTo('Review');
        r.w3Empty = await readReview();
        r.s0 = await snap('wizard-w3-review-empty', {review: r.w3Empty}, {png: true});
        await wizardTo('Details');
        await addChapterOpen();
        await chapterForm().locator('input[name="title[en]"]').fill('Tides');
        await chapterForm().locator('input[name="subtitle[en]"]').fill('A Study');
        r.addSave = await saveForm();
        await wizardTo('Review');
        r.w3WithTides = await readReview();
        r.s1 = await snap('wizard-w3-review-tides', {review: r.w3WithTides}, {png: true});
        await wizardTo('Details');
        r.del = await rowDelete('Tides').catch((e) => ({err: flat(e.message, 200)}));
        await wizardTo('Review');
        r.w3AfterDelete = await readReview();
        r.s2 = await snap('wizard-w3-review-after-delete', {review: r.w3AfterDelete}, {png: true});
        r.w3Submit = await submitWizard();
        r.s3 = await snap('wizard-w3-after-submit', {submit: r.w3Submit}, {png: true});
        r.w3Db = db(`select submission_id, status, date_submitted, submission_progress from submissions where submission_id=${W3.id}`);
        await go(wurl(W4.id)); await sleep(800);
        r.w4Reached = await wizardTo('Review');
        r.w4Empty = await readReview();
        r.s4 = await snap('wizard-w4-monograph-review-empty', {review: r.w4Empty}, {png: true});
        r.w4Submit = await submitWizard();
        r.s5 = await snap('wizard-w4-after-submit', {submit: r.w4Submit}, {png: true});
        r.w4Db = db(`select submission_id, status, date_submitted, submission_progress from submissions where submission_id=${W4.id}`);
        fact('wizardEmpty', r);
    });

    // ================================================================== license: Rule 12, Settings 3 (td13)
    await sect('license', async () => {
        if (!isOMP) return;
        const X = S.LIC, B = X.books;
        const r = {};
        await as(X.mg, X.path);
        // the press license on screen
        if (!S.licSet) {
            const panel = await openSettingsTab(X.path, 'distribution', 'License');
            const anchor = page.getByRole('radio', {name: 'CC Attribution 4.0', exact: true});
            await anchor.waitFor({state: 'visible', timeout: T}).catch(() => {});
            r.pressLicenseOptions = await panel.locator('input[name="licenseUrl"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim()}))).catch(() => []);
            r.holder = await panel.locator('input[name="copyrightHolderType"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked}))).catch(() => []);
            if (!r.holder.some((h) => h.checked)) await page.getByRole('radio', {name: 'Author', exact: true}).check().catch(() => {});
            await anchor.check().catch((e) => { r.anchorErr = flat(e.message, 150); });
            r.pressLicenseSave = await formSave(page.locator('form').filter({has: anchor}).first());
            r.sLic = await snap('license-press-license-saved', {save: r.pressLicenseSave, options: r.pressLicenseOptions}, {png: true});
            S.licSet = true; save();
        }
        r.pressRow = db(`select setting_name, setting_value from press_settings where press_id=(select press_id from presses where path='${X.path}') and setting_name in ('licenseUrl','copyrightHolderType')`);
        // the version-level settings on screen: L1 version License URL, L2 Default Chapter License URL
        const perm = {};
        for (const k of ['L0', 'L1', 'L2', 'LM']) {
            perm[k] = await readPerm(X.path, B[k].id);
            perm[`${k}snap`] = await snap(`license-perm-${k}-before`, {perm: perm[k]}, {png: k === 'L0' || k === 'LM'});
            if (k === 'L0' || k === 'LM') await loc(page, `Permissions & Disclosure (${k === 'LM' ? 'Monograph' : 'Edited Volume'}): "Default Chapter License URL"`, wf().locator('input[name="chapterLicenseUrl"]'));
            if (k === 'L1' && !S.l1Set) { perm.L1save = await savePerm({licenseUrl: CCBYNC}); S.l1Set = true; save(); }
            if (k === 'L2' && !S.l2Set) { perm.L2save = await savePerm({chapterLicenseUrl: CHDEF}); S.l2Set = true; save(); }
            if (k === 'L1' || k === 'L2') { perm[`${k}after`] = await readPerm(X.path, B[k].id); perm[`${k}afterSnap`] = await snap(`license-perm-${k}-after-save`, {perm: perm[`${k}after`]}); }
        }
        r.perm = perm;
        // the chapter windows before publishing
        const windows = async (k, phase) => {
            const out = {};
            await openChapters(X.path, B[k].id);
            out.grid = (await readGrid()).text;
            for (const t of (k === 'LM' ? ['Tides'] : ['Tides', 'Harbours'])) {
                await editChapterOpen(t);
                const f = await readForm();
                out[t] = {licenseBox: f.inputs.filter((i) => i.name === 'licenseUrl'), description: f.description, descLinks: f.descLinks, labels: f.text.slice(0, 400)};
                out[`${t}Snap`] = await snap(`license-${k}-${t.toLowerCase()}-${phase}`, out[t], {png: t === 'Tides'});
                await cancelForm();
            }
            return out;
        };
        for (const k of ['L0', 'L1', 'L2', 'LM']) r[`${k}before`] = await windows(k, 'before');
        // publish each on screen
        for (const k of ['L0', 'L1', 'L2', 'LM']) {
            if (!S[`pub${k}`]) { r[`${k}publish`] = await publishOnScreen(X.path, B[k].id, `license-${k}`); S[`pub${k}`] = r[`${k}publish`].status === 200; save(); }
        }
        // after publishing: same page reads, then a fresh load
        for (const k of ['L0', 'L1', 'L2', 'LM']) {
            r[`${k}after`] = await windows(k, 'after');
            r[`${k}permAfter`] = await readPerm(X.path, B[k].id);
            r[`${k}permAfterSnap`] = await snap(`license-perm-${k}-after-publish`, {perm: r[`${k}permAfter`]});
            r[`${k}db`] = chRows(bookPub(B[k].id));
            r[`${k}pubRows`] = db(`select setting_name, setting_value from publication_settings where publication_id=${bookPub(B[k].id)} and setting_name in ('licenseUrl','chapterLicenseUrl','copyrightHolder')`);
        }
        // LM: the Monograph's chapter after switching to Edited Volume (what it received)
        // NOL: no license anywhere (the sentence's absent end), and the Permissions page left with a typed, unsaved change
        const N = S.NOL;
        await as(N.mg, N.path);
        await openChapters(N.path, N.book.id);
        await editChapterOpen('Tides');
        const fN = await readForm();
        r.nol = {licenseBox: fN.inputs.filter((i) => i.name === 'licenseUrl'), description: fN.description};
        r.nolSnap = await snap('license-nol-tides', r.nol, {png: true});
        await cancelForm();
        r.nolPerm = await readPerm(N.path, N.book.id);
        await wf().locator('input[name="chapterLicenseUrl"]').first().fill('https://example.org/unsaved');
        await wf().locator('input[name="chapterLicenseUrl"]').first().blur().catch(() => {});
        const d0 = Date.now();
        const chLink = wf().getByRole('link', {name: 'Chapters', exact: true}).last();
        await chLink.click().catch(() => {});
        await sleep(1500); await idle(page);
        r.nolLeave = {dialogs: since(dialogs, d0), url: strip(page.url()), visibleDialogs: (await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 200))};
        r.nolLeaveSnap = await snap('license-nol-left-permissions-unsaved', r.nolLeave, {png: true});
        r.nolPermBack = await readPerm(N.path, N.book.id);
        fact('license', r);
    });

    // ================================================================== doi: Settings 4, td14
    await sect('doi', async () => {
        if (!isOMP) return;
        const r = {};
        for (const k of ['DOFF', 'DON']) {
            const X = S[k];
            if (!X) { r[k] = 'not seeded'; continue; }
            const o = {};
            await as(X.mg, X.path);
            const doiPanel = await openSettingsTab(X.path, 'distribution', 'DOIs');
            o.boxes = await doiPanel.locator('input[type="checkbox"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim()}))).catch(() => []);
            o.settingsSnap = await snap(`doi-${k}-settings`, {boxes: o.boxes});
            if (!S[`pub${k}`]) { o.publish = await publishOnScreen(X.path, X.book.id, `doi-${k}`); S[`pub${k}`] = o.publish.status === 200; save(); }
            await openChapters(X.path, X.book.id);
            for (const t of ['Tides', 'Harbours']) {
                await editChapterOpen(t);
                const f = await readForm();
                o[t] = {tabs: f.tabs, page: f.inputs.filter((i) => i.name === 'isPageEnabled'), note: (f.text.match(/\(This chapter[^)]*\)/) || [null])[0]};
                o[`${t}Snap`] = await snap(`doi-${k}-${t.toLowerCase()}`, o[t], {png: t === 'Tides'});
                await cancelForm();
            }
            if (k === 'DON') {
                // td14: untick "Chapter Page" on Tides, Save, reopen
                await editChapterOpen('Tides');
                await chapterForm().locator('input[name="isPageEnabled"]').uncheck().catch((e) => { o.untickErr = flat(e.message, 150); });
                o.untickedBeforeSave = await chapterForm().locator('input[name="isPageEnabled"]').isChecked().catch(() => null);
                o.untickSave = await saveForm();
                await editChapterOpen('Tides');
                const f2 = await readForm();
                o.tidesAfterUntick = {page: f2.inputs.filter((i) => i.name === 'isPageEnabled'), note: (f2.text.match(/\(This chapter[^)]*\)/) || [null])[0]};
                o.tidesAfterUntickSnap = await snap('doi-DON-tides-after-untick', o.tidesAfterUntick, {png: true});
                await cancelForm();
                await openChapters(X.path, X.book.id);
                await editChapterOpen('Tides');
                const f3 = await readForm();
                o.tidesAfterReload = {page: f3.inputs.filter((i) => i.name === 'isPageEnabled'), note: (f3.text.match(/\(This chapter[^)]*\)/) || [null])[0]};
                await snap('doi-DON-tides-after-reload', o.tidesAfterReload);
                await cancelForm();
                // Harbours: tick "Chapter Page" on the published chapter now: does it get a DOI?
                await editChapterOpen('Harbours');
                await chapterForm().locator('input[name="isPageEnabled"]').check().catch(() => {});
                o.harboursTickSave = await saveForm();
                await editChapterOpen('Harbours');
                const f4 = await readForm();
                o.harboursAfterTick = {page: f4.inputs.filter((i) => i.name === 'isPageEnabled'), note: (f4.text.match(/\(This chapter[^)]*\)/) || [null])[0]};
                await snap('doi-DON-harbours-after-tick', o.harboursAfterTick);
                await cancelForm();
            }
            o.db = chRows(bookPub(X.book.id));
            r[k] = o;
        }
        fact('doi', r);
    });

    // ================================================================== ids: Settings 5
    await sect('ids', async () => {
        if (!isOMP) return;
        const r = {};
        for (const k of ['IDP', 'IDU']) {
            const X = S[k];
            if (!X) { r[k] = 'not seeded'; continue; }
            const o = {};
            await as(X.mg, X.path);
            if (k === 'IDP') {
                await go(cu(X.path, '/management/settings/workflow'));
                const md = page.getByRole('tab', {name: 'Metadata', exact: true}).first();
                if (await md.count()) { await md.click(); await idle(page); await sleep(800); }
                const pid = page.getByRole('checkbox', {name: 'Enable for Chapters', exact: true});
                o.pidBox = {count: await pid.count(), checked: await pid.first().isChecked().catch(() => null)};
                o.settingsSnap = await snap('ids-IDP-settings', o.pidBox);
            } else {
                await go(cu(X.path, '/management/settings/website'));
                const pl = page.getByRole('tab', {name: 'Plugins', exact: true}).first();
                if (await pl.count()) { await pl.click(); await idle(page); await sleep(1200); }
                o.urnRow = flat(await page.locator('tr').filter({hasText: 'URN'}).first().innerText().catch(() => ''), 300);
                o.settingsSnap = await snap('ids-IDU-plugins', {urnRow: o.urnRow});
            }
            await openChapters(X.path, X.book.id);
            await editChapterOpen('Tides');
            const f = await readForm();
            o.mgTabs = f.tabs;
            o.mgSnap = await snap(`ids-${k}-mg-window`, {tabs: f.tabs}, {png: true});
            // the tabbed window left with a changed, unsaved box: type Pages, go to "Identifiers", come back
            const pages = chapterForm().locator('input[name="pages"]');
            await pages.fill('9-99');
            await pages.blur().catch(() => {});
            const d0 = Date.now();
            const idTab = page.getByRole('tab', {name: 'Identifiers', exact: true}).first();
            if (await idTab.count()) {
                await idTab.click(); await sleep(1500); await idle(page);
                o.idTab = {dialogs: since(dialogs, d0), text: flat(await page.locator('[role="tabpanel"]:visible').last().innerText().catch(() => ''), 1200),
                    inputs: await page.locator('[role="tabpanel"]:visible input:visible').evaluateAll((els) => els.map((e) => ({name: e.name, type: e.type, value: e.value}))).catch(() => [])};
                o.idTabSnap = await snap(`ids-${k}-identifiers-tab`, o.idTab, {png: true});
                await loc(page, `Chapter window "Identifiers" tab (${k})`, idTab);
                await page.getByRole('tab', {name: 'Edit Metadata', exact: true}).first().click().catch(() => {});
                await sleep(1500); await idle(page);
                o.pagesAfterTabBack = await chapterForm().locator('input[name="pages"]').inputValue().catch(() => null);
                o.backSnap = await snap(`ids-${k}-back-to-metadata`, {pages: o.pagesAfterTabBack, dialogs: since(dialogs, d0)});
                if (k === 'IDP') {
                    // what the tab's own control does: a publisher ID typed and saved
                    await idTab.click(); await sleep(1500); await idle(page);
                    const box = page.locator('[role="tabpanel"]:visible input[type="text"]:visible').first();
                    if (await box.count()) {
                        await box.fill('K3-PUBID-1');
                        const sv = page.waitForResponse((x) => x.request().method() === 'POST' && /chapter/i.test(x.url()), {timeout: T}).catch(() => null);
                        await page.locator('[role="tabpanel"]:visible').last().getByRole('button', {name: /^(Save|Assign)$/}).first().click().catch((e) => { o.idSaveErr = flat(e.message, 150); });
                        const svr = await sv; o.idSave = svr ? {status: svr.status(), url: strip(svr.url()).slice(0, 150), body: flat(await svr.text().catch(() => ''), 300)} : null;
                        await idle(page); await sleep(900);
                        o.idAfterSave = {notices: (await page.locator('.pkp_notification, [role="status"], .pnotify').allInnerTexts().catch(() => [])).map((x) => flat(x, 150)).filter(Boolean), windowOpen: await page.locator('form#editChapterForm').count()};
                        await snap('ids-IDP-after-id-save', o.idAfterSave, {png: true});
                    }
                }
            }
            await page.keyboard.press('Escape').catch(() => {});
            await sleep(600);
            // an assigned Layout Editor
            await as(X.le, X.path);
            await openChapters(X.path, X.book.id);
            const g = await readGrid();
            o.leLinks = g.links;
            if (g.links && g.links.includes('Tides')) {
                await editChapterOpen('Tides');
                const fl = await readForm();
                o.leTabs = fl.tabs;
                o.leSnap = await snap(`ids-${k}-le-window`, {tabs: fl.tabs}, {png: true});
                await cancelForm();
            } else o.leSnap = await snap(`ids-${k}-le-list`, {g});
            o.idRows = db(`select setting_name, setting_value from submission_chapter_settings where chapter_id in (select chapter_id from submission_chapters where publication_id=${bookPub(X.book.id)}) and setting_name like 'pub-id%'`);
            r[k] = o;
        }
        fact('ids', r);
    });

    // ================================================================== published: Rule 14 (td3)
    await sect('published', async () => {
        if (!isOMP) return;
        const P = S.P, B = S.B.PUB;
        const r = {};
        const warnings = async () => (await wf().getByText(/This version has been published/).allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
        const warningAbove = async () => {
            const w = wf().getByText(/This version has been published/).first();
            const wb = await w.boundingBox().catch(() => null); const gb = await grid().boundingBox().catch(() => null);
            return wb && gb ? wb.y < gb.y : null;
        };
        for (const [who, user, author] of [['mg', P.mg, false], ['se', P.se, false], ['sn', P.sn, false], ['le', P.le, false], ['au', P.au, true]]) {
            const o = {};
            await as(user, P.path);
            await openChapters(P.path, B.id, {author});
            o.url = strip(page.url());
            o.warnings = await warnings();
            o.warningAbove = await warningAbove();
            const g = await readGrid();
            o.actions = g.actions; o.links = g.links; o.text = g.text;
            o.tides = await rowControls('Tides');
            o.snap = await snap(`published-${who}-chapters`, o, {png: true});
            if (who === 'mg' && !S.prologue) {
                await addChapterOpen();
                await chapterForm().locator('input[name="title[en]"]').fill('Prologue');
                o.prologueSave = await saveForm();
                o.gridAfter = (await readGrid()).text;
                o.reader = await readerToc(P.path, B.id);
                S.prologue = true; save();
                o.snapAfter = await snap('published-mg-after-prologue', {save: o.prologueSave, reader: o.reader});
            }
            if (who === 'le' && g.actions && g.actions.includes('Add Chapter') && !S.epilogue) {
                await addChapterOpen();
                await chapterForm().locator('input[name="title[en]"]').fill('Epilogue');
                o.epilogueSave = await saveForm();
                o.gridAfter = (await readGrid()).text;
                await openChapters(P.path, B.id);
                o.gridAfterReload = (await readGrid()).text;
                o.reader = await readerToc(P.path, B.id);
                S.epilogue = true; save();
                o.snapAfter = await snap('published-le-after-epilogue', {save: o.epilogueSave, reader: o.reader});
            }
            if (who === 'au') {
                o.authorViewText = flat(await wf().innerText().catch(() => ''), 1500);
            }
            r[who] = o;
        }
        r.db = chRows(bookPub(B.id));
        fact('published', r);
    });

    // ================================================================== version: Rule 15, A3 (td15)
    await sect('version', async () => {
        if (!isOMP) return;
        const P = S.P, B = S.B.VER;
        const r = {};
        await as(P.mg, P.path);
        const pubs0 = pubsOf(B.id);
        r.pub1 = pubs0[0];
        // the earlier version's chapter windows before "Create New Version"
        const readChapter = async (t) => {
            await editChapterOpen(t);
            const f = await readForm();
            const o = {title: val(f, 'title[en]'), subtitle: val(f, 'subtitle[en]'), abstract: (f.inputs.find((i) => /^abstract/.test(i.name)) || {}).rich ?? (f.inputs.find((i) => /^abstract/.test(i.name)) || {}).value,
                pages: val(f, 'pages'), date: (f.inputs.find((i) => /datePublished/.test(i.name) && i.type !== 'hidden') || {}).value ?? null, dateHidden: (f.inputs.find((i) => /datePublished/.test(i.name) && i.type === 'hidden') || {}).value ?? null,
                license: val(f, 'licenseUrl'), page: (f.inputs.find((i) => i.name === 'isPageEnabled') || {}).checked, note: (f.text.match(/\(This chapter[^)]*\)/) || [null])[0],
                authors: boxList(f, 'authors[]'), files: boxList(f, 'files[]'), hasFilesLabel: /Files/.test(f.text)};
            await cancelForm();
            return o;
        };
        await openChapters(P.path, B.id, {pub: r.pub1});
        r.v1Grid = (await readGrid()).text;
        r.v1Tides = await readChapter('Tides');
        r.v1Harbours = await readChapter('Harbours');
        r.sV1 = await snap('version-v1-before', {tides: r.v1Tides, harbours: r.v1Harbours});
        if (!S.verPub2) {
            await openKey(P.path, B.id, `publication_${r.pub1}_titleAbstract`);
            await wf().getByRole('link', {name: 'Create New Version', exact: true}).first().click();
            const dlg = page.getByRole('dialog', {name: 'Create New Version'});
            await dlg.waitFor({timeout: T}).catch(() => {});
            r.createDialog = flat(await dlg.innerText().catch(() => ''), 800);
            r.sDlg = await snap('version-create-dialog', {t: r.createDialog}, {png: true});
            const created = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
            const cr = await created;
            r.createStatus = cr ? cr.status() : null;
            S.verPub2 = cr ? (await cr.json().catch(() => ({}))).id : null; save();
            await idle(page); await sleep(1200);
            r.sAfterCreate = await snap('version-after-create', {status: r.createStatus, pub2: S.verPub2}, {png: true});
        }
        r.pub2 = S.verPub2 || pubsOf(B.id).slice(-1)[0];
        await openChapters(P.path, B.id, {pub: r.pub2});
        r.v2Grid = (await readGrid()).text;
        r.v2Tides = await readChapter('Tides');
        r.v2Harbours = await readChapter('Harbours');
        r.sV2 = await snap('version-v2-chapters', {grid: r.v2Grid, tides: r.v2Tides, harbours: r.v2Harbours}, {png: true});
        // reopen the new version's Tides on a fresh load
        await openChapters(P.path, B.id, {pub: r.pub2});
        await editChapterOpen('Tides');
        r.sV2Tides = await snap('version-v2-tides-window', null, {png: true});
        await cancelForm();
        // the earlier version's chapters after
        await openChapters(P.path, B.id, {pub: r.pub1});
        r.v1TidesAfter = await readChapter('Tides');
        r.v1HarboursAfter = await readChapter('Harbours');
        r.sV1After = await snap('version-v1-after', {tides: r.v1TidesAfter, harbours: r.v1HarboursAfter}, {png: true});
        r.db1 = chRows(r.pub1); r.db2 = chRows(r.pub2);
        r.files = chFiles(B.id);
        r.formats = db(`select publication_format_id, publication_id from publication_formats where publication_id in (${r.pub1},${r.pub2}) order by 1`);
        r.authors = db(`select author_id, publication_id, seq, email from authors where publication_id in (${r.pub1},${r.pub2}) order by publication_id, seq`);
        fact('version', r);
    });

    // ================================================================== late: a chapter added after publishing (Rule 12b's edge);
    // the published Monograph's chapter seen as an Edited Volume; the "Date Published" box of an undated chapter
    await sect('late', async () => {
        if (!isOMP) return;
        const r = {};
        const X = S.LIC;
        await as(X.mg, X.path);
        await openChapters(X.path, X.books.L0.id);
        if (!S.coda) {
            await addChapterOpen();
            const fa = await readForm();
            r.codaAddWindow = {licenseBox: fa.inputs.filter((i) => i.name === 'licenseUrl'), description: fa.description};
            await chapterForm().locator('input[name="title[en]"]').fill('Coda');
            r.codaSave = await saveForm();
            S.coda = true; save();
        }
        await openChapters(X.path, X.books.L0.id);
        await editChapterOpen('Coda');
        const fc = await readForm();
        r.coda = {licenseBox: fc.inputs.filter((i) => i.name === 'licenseUrl'), description: fc.description};
        r.codaSnap = await snap('late-coda-after-publish', r.coda, {png: true});
        await cancelForm();
        r.codaDb = chRows(bookPub(X.books.L0.id));
        // LM: the published Monograph switched to Edited Volume, then its chapter window
        await openChapters(X.path, X.books.LM.id);
        const wt = wf().locator('[data-cy="sidemodal-header"]').getByRole('button', {name: /^(Monograph|Edited Volume)$/}).first();
        r.lmTypeBefore = flat(await wt.innerText().catch(() => ''), 40);
        if (r.lmTypeBefore === 'Monograph') {
            await wt.click();
            await page.getByRole('menuitem', {name: 'Edited Volume', exact: true}).click().catch((e) => { r.lmSwitchErr = flat(e.message, 150); });
            await sleep(800); await idle(page);
        }
        await openChapters(X.path, X.books.LM.id);
        r.lmTypeAfter = flat(await wf().locator('[data-cy="sidemodal-header"]').getByRole('button', {name: /^(Monograph|Edited Volume)$/}).first().innerText().catch(() => ''), 40);
        await editChapterOpen('Tides');
        const fm = await readForm();
        r.lmTides = {licenseBox: fm.inputs.filter((i) => i.name === 'licenseUrl'), description: fm.description};
        r.lmSnap = await snap('late-lm-as-edited-volume-tides', r.lmTides, {png: true});
        await cancelForm();
        // VER version 1: Harbours has no date; its "Date Published" box as shown, then "Save" untouched
        const P = S.P, B = S.B.VER;
        await as(P.mg, P.path);
        const pub1 = pubsOf(B.id)[0];
        await openChapters(P.path, B.id, {pub: pub1});
        await editChapterOpen('Harbours');
        const dateBox = chapterForm().locator('input[id^="datePublished"]:not([type=hidden])').first();
        r.harboursDate = {shown: await dateBox.inputValue().catch(() => null), visible: await dateBox.isVisible().catch(() => null),
            hidden: await chapterForm().locator('input[type=hidden][name="datePublished"], input[type=hidden][id*="altField"]').evaluateAll((els) => els.map((e) => ({name: e.name, id: e.id, value: e.value}))).catch(() => [])};
        await dateBox.scrollIntoViewIfNeeded().catch(() => {});
        r.harboursDateSnap = await snap('late-ver-v1-harbours-date-box', r.harboursDate, {png: true});
        await loc(page, 'Chapter window: "Date Published" visible box', dateBox);
        r.harboursSaveUntouched = await saveForm();
        r.harboursDbAfter = chRows(pub1).filter((x) => /Harbours/.test(x));
        await openChapters(P.path, B.id, {pub: pub1});
        await editChapterOpen('Harbours');
        r.harboursDateAfterReload = await chapterForm().locator('input[id^="datePublished"]:not([type=hidden])').first().inputValue().catch(() => null);
        await snap('late-ver-v1-harbours-after-save', {date: r.harboursDateAfterReload, db: r.harboursDbAfter});
        await cancelForm();
        fact('late', r);
    });

    // ================================================================== ids2: fn-g's roles on the "Identifiers" tab: the Layout Editor on a published version
    await sect('ids2', async () => {
        if (!isOMP || !S.IDP) return;
        const X = S.IDP;
        const r = {};
        await as(X.mg, X.path);
        if (!S.pubIDP) { r.publish = await publishOnScreen(X.path, X.book.id, 'ids2-IDP'); S.pubIDP = r.publish.status === 200; save(); }
        await as(X.le, X.path);
        await openChapters(X.path, X.book.id);
        const g = await readGrid();
        r.leLinks = g.links; r.leActions = g.actions;
        if (g.links && g.links.includes('Tides')) {
            await editChapterOpen('Tides');
            const f = await readForm();
            r.leTabs = f.tabs;
            r.leSnap = await snap('ids2-IDP-le-published-window', {tabs: f.tabs}, {png: true});
            await cancelForm();
        } else r.leSnap = await snap('ids2-IDP-le-published-list', {g});
        fact('ids2', r);
    });

    // ================================================================== control: OJS and OPS (read-only)
    await sect('control', async () => {
        if (isOMP) return;
        const X = S.X;
        const r = {};
        await as(X.au, X.path);
        await go(cu(X.path, `/submission?id=${X.draft}`)); await sleep(800);
        r.reached = await wizardTo('Review');
        r.review = await readReview();
        r.chaptersText = await page.getByText('Chapters', {exact: true}).count();
        r.s0 = await snap('control-wizard-review', {review: r.review}, {png: true});
        await as(X.mg, X.path);
        r.perm = await readPerm(X.path, X.sub);
        r.chapterLicenseBox = await wf().locator('input[name="chapterLicenseUrl"]').count();
        r.s1 = await snap('control-permissions', {perm: r.perm, box: r.chapterLicenseBox}, {png: true});
        fact('control', r);
    });

    await close();
});
