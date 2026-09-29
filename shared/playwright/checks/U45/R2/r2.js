// U45 claim check, revision chunk R2: when chapter and format DOIs are made, versions, formats readers cannot
// get, what readers see, the Activity Log, Settings bullets 2 and 14, Cross-feature interactions.
// Spec: docs/specs/U45-dois.md lines 199–200 (Rule 5 rider), 632–633 (Rule 43 rider), 682–695 (Rule 48),
// 704–712 (Rule 50), 728–751 (Rules 53–54), 773–780 (Side effects), 794–796 and 847–854 (Settings 2, 14),
// 890–899 (Cross-feature interactions); footnotes q25 q28 q30 q32 q35 q36 q37 z4 z5 z7 z10 z11 z12 z13 c w.
//
//   PROBE_FEATURE=U45 PROBE_AGENT=ccR2 RUN=1 node bin/probe.js omp shared/playwright/checks/U45/R2/r2.js
//   PROBE_FEATURE=U45 PROBE_AGENT=ccR2 RUN=1 node bin/probe.js ojs,ops ... (the controls: PHASES=ctl)
//   PHASES=copyedit,publish,never,formats,versions,readers,kinds,ctl (default: all that the app has).
//   RUN names the facts file (`r2-facts-run<RUN>-<app>.json`) and the snapshots (`r<RUN>-…`); every run seeds
//   its own scratch presses (tag prefix u45r2), so a second run is a fresh drive, never a re-read.
// No assertions: the script records, the reader judges. Database reads (SELECT) are evidence only.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || '1';
const OMP_PHASES = ['kinds', 'copyedit', 'publish', 'never', 'formats', 'versions', 'readers'];
const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PREFIX = '10.1234';

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const ALL = isOMP ? OMP_PHASES : ['ctl'];
    const PHASES = (process.env.PHASES || ALL.join(',')).split(',').filter((p) => ALL.includes(p));
    const on = (p) => PHASES.includes(p);
    const log = (...a) => console.log(`[r2 ${app.name} r${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const fact = (k, v) => { record(`r2-facts-run${RUN}`, {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 1500)); };
    const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php\//, '');
    const cu = (ctx, p = '') => `/index.php/${ctx}${p}`;
    const {WorkflowPage} = require(path.join(__dirname, '../../../pages/WorkflowPage.js'));
    const {ActivityLogWindow} = require(path.join(__dirname, '../../../pages/ActivityLogPages.js'));
    const {DoisPage, DoiSettings} = require(path.join(__dirname, '../../../pages/DoisPages.js'));
    const omp = (f) => require(path.join(app.suiteDir, 'pages', f));

    function db(sql) {
        const cfg = fs.readFileSync(app.configFile, 'utf8');
        const sec = cfg.split(/^\[database\]/m)[1] || '';
        const get = (k) => ((sec.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, 'm')) || [])[1] || '').trim().replace(/^"|"$/g, '');
        try {
            return execFileSync('psql', ['-h', get('host') || '127.0.0.1', '-U', get('username'), get('name'), '-At', '-F', '|', '-c', sql],
                {env: {...process.env, PGPASSWORD: get('password')}, encoding: 'utf8', timeout: 20_000}).trim().split('\n').filter(Boolean);
        } catch (e) { return [`ERROR ${flat(e.message, 300)}`]; }
    }
    /** Every version of a book with its DOI; each version's chapters and formats with theirs (evidence only). */
    const dbBook = (sid) => ({
        pubs: db(`select p.publication_id, p.version_stage||' '||p.version_major||'.'||p.version_minor, p.status, coalesce(d.doi,'-') from publications p left join dois d on d.doi_id=p.doi_id where p.submission_id=${sid} order by p.publication_id`),
        chapters: db(`select c.publication_id, c.chapter_id, coalesce(c.source_chapter_id::text,'-'), (select setting_value from submission_chapter_settings s where s.chapter_id=c.chapter_id and s.setting_name='title' limit 1), coalesce((select setting_value from submission_chapter_settings s where s.chapter_id=c.chapter_id and s.setting_name='isPageEnabled' limit 1),'-'), coalesce(c.doi_id::text,'-'), coalesce(d.doi,'-'), coalesce(d.status::text,'-') from submission_chapters c left join dois d on d.doi_id=c.doi_id where c.publication_id in (select publication_id from publications where submission_id=${sid}) order by c.publication_id, c.seq, c.chapter_id`),
        formats: db(`select f.publication_id, f.publication_format_id, (select setting_value from publication_format_settings n where n.publication_format_id=f.publication_format_id and n.setting_name='name' limit 1), 'approved='||f.is_approved, 'available='||f.is_available, coalesce(f.doi_id::text,'-'), coalesce(d.doi,'-'), coalesce(d.status::text,'-') from publication_formats f left join dois d on d.doi_id=f.doi_id where f.publication_id in (select publication_id from publications where submission_id=${sid}) order by f.publication_id, f.publication_format_id`),
    });
    const dbLog = (sid) => db(`select e.log_id, e.event_type, e.message, coalesce((select username from users u where u.user_id=e.user_id),'-') from event_log e where e.assoc_type=1048585 and e.assoc_id=${sid} order by e.log_id`);

    await app.api.bootstrapProbe(app.contextPath);

    // ------------------------------------------------------------------ seeds
    const people = [['mg', ['manager'], 'Mona', 'Manager'], ['se', ['sectionEditor'], 'Sami', 'Series'], ['au', ['author'], 'Ada', 'Author'], ...(isOPS ? [] : [['ed', ['editor'], 'Eddie', 'Editor']])];
    async function mkCtx(key, keys = {}, {reviewers = false} = {}) {
        const t = tag(`u45r2${RUN}${key.toLowerCase()}`);
        const roles = [...people];
        if (reviewers) roles.push(['rv', ['externalReviewer'], 'Rhea', 'Reviewer']);
        const {context: cx = {}, ...rest} = keys;
        const res = await app.api.createContext({tag: t, context: {name: `U45 R2 ${key} ${t}`, acronym: 'RTWO', contactName: 'R2 Contact', contactEmail: `${t}c@mail.test`, country: 'CA', ...cx},
            users: roles.map(([u, r, g, f]) => ({username: `${t}${u}`, roles: r, givenName: g, familyName: f})), ...rest});
        const C = {key, path: res.path || t, id: res.contextId, issues: res.issues || null, u: Object.fromEntries(roles.map(([u]) => [u, `${t}${u}`]))};
        fact(`seed-${key}`, {path: C.path, id: C.id, issues: C.issues, keys: rest});
        return C;
    }
    async function mkBook(C, key, spec) {
        const title = spec.title || `R2 ${key} book`;
        const {submitter, ...r} = spec;
        try {
            const res = await app.api.createSubmission({tag: `${C.path}${key}`, context: C.path, submitter: submitter || C.u.au, title, ...r});
            const b = {key, id: res.submissionId, pub: res.publicationId, title, stageId: res.stageId, chapters: res.chapters || null, formats: res.publicationFormats || res.galleys || null};
            fact(`seed-${C.key}-${key}`, {...b, spec: r, db: isOMP ? dbBook(b.id) : null});
            return b;
        } catch (e) {
            fact(`seed-${C.key}-${key}.FAILED`, flat(e.message, 800));
            throw e;
        }
    }
    const pdf = (name = 'PDF', extra = {}) => ({name, file: 'article.pdf', genre: 'Book Manuscript', ...extra});
    const TO_PRODUCTION = ['skipExternalReview', 'sendToProduction'];

    // ------------------------------------------------------------------ browsers
    const {page, close} = await launch(app);
    const V = await launch(app);
    const vpage = V.page;
    const bad = [], pageErrors = [], dialogs = [];
    for (const [w, pg] of [['m', page], ['v', vpage]]) {
        pg.on('response', (r) => { if (r.status() >= 400) bad.push({at: Date.now(), w, status: r.status(), m: r.request().method(), url: strip(r.url()).slice(0, 200)}); });
        pg.on('pageerror', (e) => pageErrors.push({at: Date.now(), w, text: flat(e.message, 200), url: strip(pg.url())}));
        pg.on('dialog', async (d) => { dialogs.push({at: Date.now(), w, type: d.type(), message: d.message().slice(0, 200)}); await d.accept().catch(() => {}); });
    }
    const since = (arr, t0) => arr.filter((e) => e.at >= t0).map(({at, ...x}) => x);
    let snapN = 0;
    async function snap(name, extra, {pg = page, png = false} = {}) {
        let s;
        try { s = await screen(pg); } catch (e) { s = {url: pg.url(), text: {}, screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `r${RUN}-${String(++snapN).padStart(3, '0')}-${name}`;
        record(n, s);
        if (png) await shot(pg, n).catch(() => {});
        return `${n}-${app.name}`;
    }
    async function sect(name, fn) {
        if (!on(name)) return;
        const t0 = Date.now();
        log(`== ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 1500));
            await snap(`zz-failed-${name}`, null, {png: true}).catch(() => {});
        }
        const b = since(bad, t0).filter((r) => r.status >= 500), pe = since(pageErrors, t0);
        fact(`${name}.crashes`, {server: b, script: pe});
        const b4 = since(bad, t0).filter((r) => r.status < 500);
        if (b4.length) fact(`${name}.4xx`, b4.slice(0, 40));
        const d = since(dialogs, t0);
        if (d.length) fact(`${name}.dialogs`, d);
    }
    const go = async (url, pg = page) => { const r = await pg.goto(url).catch((e) => ({err: flat(e.message, 200)})); await idle(pg).catch(() => {}); return r; };
    let who = null;
    const as = async (user, ctx) => { if (who === `${user}@${ctx}`) return; await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); who = `${user}@${ctx}`; };
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    const wfUrl = (ctx, sid, key) => cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    const wf = () => page.locator('[role="dialog"]:visible').first();
    async function openWf(ctx, sid, pub, pageKey = 'titleAbstract') {
        await go(wfUrl(ctx, sid, pub ? `publication_${pub}_${pageKey}` : null));
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await sleep(800);
    }
    const wfButtons = async () => (await wf().getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean);

    // ------------------------------------------------------------------ workflow actions
    /** Press a decision button and walk the decision page to "Record Decision" (emails as they come). */
    async function decide(C, sid, button, name) {
        await openWf(C.path, sid);
        const out = {buttons: await wfButtons()};
        const b = page.getByRole('button', {name: button, exact: true}).last();
        if (!(await b.isVisible().catch(() => false))) { out.missing = button; out.snap = await snap(`${name}-nobutton`); return out; }
        await b.click();
        await page.waitForURL(/decision/, {timeout: T}).catch(() => {});
        await idle(page);
        const cont = page.getByRole('button', {name: 'Continue', exact: true});
        const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
        out.steps = [];
        for (let i = 0; i < 6 && !(await rec.isVisible().catch(() => false)); i++) {
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(1000);
            out.steps.push(flat(await page.getByRole('heading', {level: 1}).first().innerText().catch(() => ''), 100));
            await cont.click().catch(() => {}); await idle(page);
        }
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await sleep(800);
        out.wizardSnap = await snap(`${name}-wizard`);
        const wr = page.waitForResponse((x) => /decisions/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await rec.click();
        const rr = await wr;
        await page.getByText('View Submission Summary').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        out.status = rr ? rr.status() : null;
        if (rr && rr.status() >= 400) out.body = flat(await rr.text().catch(() => ''), 400);
        out.snap = await snap(name);
        return out;
    }
    /** Publish the version open on the workflow (OMP "Publish" › its "Schedule For Publication" window › "Publish"). */
    async function publish(C, sid, pub, name) {
        await openWf(C.path, sid, pub);
        const out = {};
        const button = controls().getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
        await button.waitFor({state: 'visible', timeout: T}).catch(() => {});
        if (!(await button.isVisible().catch(() => false))) { out.noButton = await controls().getByRole('button').allInnerTexts().catch(() => []); out.snap = await snap(`${name}-nobutton`); return out; }
        await sleep(800);
        await button.click();
        const modal = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
        await modal.waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(600);
        out.window = flat(await modal.innerText().catch(() => ''), 700);
        await snap(`${name}-window`);
        const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await modal.getByRole('button', {name: 'Publish', exact: true}).last().click().catch((e) => { out.clickErr = flat(e.message, 150); });
        const r = await w;
        out.status = r ? r.status() : null;
        if (r && r.status() >= 400) out.body = flat(await r.text().catch(() => ''), 500);
        await controls().getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        out.controls = await controls().getByRole('button').allInnerTexts().catch(() => []);
        out.snap = await snap(name);
        return out;
    }
    async function unpublish(C, sid, pub, name) {
        await openWf(C.path, sid, pub);
        const out = {};
        const b = controls().getByRole('button', {name: 'Unpublish', exact: true}).first();
        if (!(await b.isVisible().catch(() => false))) { out.noButton = await controls().getByRole('button').allInnerTexts().catch(() => []); return out; }
        await b.click();
        const d = page.getByRole('dialog', {name: 'Unpublish'});
        await d.waitFor({timeout: T}).catch(() => {});
        out.dialog = flat(await d.innerText().catch(() => ''), 300);
        const w = page.waitForResponse((r) => /\/unpublish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'Unpublish', exact: true}).click().catch((e) => { out.clickErr = flat(e.message, 150); });
        const r = await w;
        out.status = r ? r.status() : null;
        await controls().getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first().waitFor({timeout: T}).catch(() => {});
        out.snap = await snap(name);
        return out;
    }
    /** "Create New Version" on the open workflow; significance: 'Major Revision' | 'Minor Revision' | null (as it arrives). */
    async function newVersion(C, sid, pub, significance, name) {
        await openWf(C.path, sid, pub);
        const out = {};
        const frame = new WorkflowPage(page, C.path);
        const item = await frame.revealPublicationEntry('Create New Version').catch(() => null);
        if (!item) { out.offered = false; out.snap = await snap(`${name}-noentry`); return out; }
        await frame.expectVersionLoaded().catch(() => {});
        await item.click();
        const dialog = page.getByRole('dialog', {name: 'Create New Version'});
        await dialog.getByLabel('Publication Stage').waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
        out.selects = await dialog.locator('select').evaluateAll((ss) => ss.map((s) => ({name: s.name, value: s.value, options: [...s.options].map((o) => `${o.value}=${o.text.trim()}${o.disabled ? ' [disabled]' : ''}`)}))).catch(() => null);
        if (significance) await dialog.getByLabel('Revision Significance').selectOption({label: significance}).catch((e) => { out.selectErr = flat(e.message, 150); });
        out.windowSnap = await snap(`${name}-window`, {selects: out.selects});
        const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await r;
        out.status = resp ? resp.status() : null;
        if (resp && resp.ok()) { const j = await resp.json().catch(() => ({})); out.newPub = j.id; out.version = `${j.versionStage} ${j.versionMajor}.${j.versionMinor}`; }
        await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page);
        out.snap = await snap(name);
        return out;
    }
    // Chapters page
    async function chapterWindow(C, sid, pub, title, {tick, add = false, name, leaveUnsaved = false}) {
        const {ChaptersPage, ChapterWindow, TEXT} = omp('ChapterPages.js');
        const cp = new ChaptersPage(page, C.path);
        await cp.gotoEditorial(sid, pub);
        const out = {};
        out.pageSnap = await snap(`${name}-chapters-page`);
        let win;
        if (add) { win = await cp.list.openAdd(); await win.fill({title}); } else win = await cp.list.openEdit(title);
        const box = win.chapterPageBox();
        out.label = await box.count() ? TEXT.chapterPage : null;
        out.boxCount = await box.count();
        out.before = await box.isChecked().catch(() => null);
        out.disabled = await box.isDisabled().catch(() => null);
        out.doiNote = await win.doiNote().count();
        out.tabs = await win.tabs().allInnerTexts().catch(() => []);
        out.windowText = flat(await win.form().innerText().catch(() => ''), 1200);
        out.windowSnap = await snap(`${name}-window`);
        await loc(page, `${add ? 'Add' : 'Edit'} Chapter window: "Chapter Page" box`, box);
        if (leaveUnsaved) {
            if (tick !== undefined) { if (tick) await box.check().catch((e) => { out.checkErr = flat(e.message, 120); }); else await box.uncheck().catch((e) => { out.checkErr = flat(e.message, 120); }); }
            const t0 = Date.now();
            await win.closeArrow().click().catch((e) => { out.closeErr = flat(e.message, 120); });
            await sleep(1200);
            out.leaveDialogs = since(dialogs, t0);
            out.closed = (await win.dialog().count()) === 0;
            out.leaveSnap = await snap(`${name}-left-unsaved`);
            return out;
        }
        if (tick !== undefined) {
            if (tick) await box.check().catch((e) => { out.checkErr = flat(e.message, 120); }); else await box.uncheck().catch((e) => { out.checkErr = flat(e.message, 120); });
        }
        out.after = await box.isChecked().catch(() => null);
        await win.save().catch((e) => { out.saveErr = flat(e.message, 200); });
        out.snap = await snap(name);
        return out;
    }
    // Publication Formats page
    async function formatAdd(C, sid, pub, fname, name) {
        const {PublicationFormatsPage} = omp('PublicationFormatPages.js');
        const pf = new PublicationFormatsPage(page, C.path);
        await pf.gotoEditorial(sid, pub);
        const out = {};
        try {
            const win = await pf.openAdd();
            await win.typeName(fname);
            await win.ok();
            await idle(page);
        } catch (e) { out.err = flat(e.message, 200); }
        out.grid = flat(await pf.grid().innerText().catch(() => ''), 800);
        out.snap = await snap(name);
        return out;
    }
    async function formatStatus(C, sid, pub, fname, linkText, title, name) {
        const {PublicationFormatsPage} = omp('PublicationFormatPages.js');
        const pf = new PublicationFormatsPage(page, C.path);
        await pf.gotoEditorial(sid, pub);
        const out = {before: flat(await pf.formatRow(fname).innerText().catch(() => ''), 300)};
        try {
            const win = await pf.openStatus(pf.formatRow(fname), linkText, title);
            out.windowText = flat(await page.getByRole('dialog').last().innerText().catch(() => ''), 500);
            out.windowSnap = await snap(`${name}-window`);
            await win.ok();
            await idle(page);
        } catch (e) { out.err = flat(e.message, 200); }
        out.after = flat(await pf.formatRow(fname).innerText().catch(() => ''), 300);
        out.snap = await snap(name);
        return out;
    }
    // Activity Log
    async function activity(C, sid, name) {
        const frame = new WorkflowPage(page, C.path);
        const out = {};
        try {
            await frame.gotoEditorial(sid);
            const w = new ActivityLogWindow(page, frame);
            await w.open();
            await w.expectHistoryLoaded().catch(() => {});
            out.lines = (await w.historyLines()).map((l) => `${l.user} | ${l.event}`);
            out.snap = await snap(name);
            await w.close().catch(() => {});
        } catch (e) { out.err = flat(e.message, 200); out.snap = await snap(`${name}-err`); }
        out.metadataLines = (out.lines || []).filter((l) => /Submission metadata updated/.test(l));
        out.db = dbLog(sid).filter((l) => !/\|submission\.event\.fileRevised\|/.test(l)).slice(-12);
        return out;
    }
    // Settings › Distribution › "DOIs" › "Setup"
    async function setupKinds(C, want, name) {
        const s = new DoiSettings(page, C.path);
        const out = {};
        await s.goto('Setup');
        await idle(page);
        out.before = await s.kinds().catch(() => null);
        out.creationTimeOptions = await s.creationTimeOptions().catch(() => null);
        for (const [label, v] of Object.entries(want || {})) {
            if (v) await s.kindBox(label).check().catch((e) => { out.err = flat(e.message, 120); });
            else await s.kindBox(label).uncheck().catch((e) => { out.err = flat(e.message, 120); });
        }
        if (want) {
            const r = await s.pressSave(s.setup).catch(() => null);
            out.status = r ? r.status() : null;
            await sleep(800); await idle(page);
            await s.goto('Setup');
            out.after = await s.kinds().catch(() => null);
        }
        out.snap = await snap(name);
        return out;
    }
    // The DOIs page
    async function openDois(C, tab) {
        const d = new DoisPage(page, C.path);
        await d.goto().catch(async () => { await go(cu(C.path, '/dois')); });
        if (tab) { await page.getByRole('tab', {name: tab, exact: true}).click().catch(() => {}); await idle(page); await sleep(800); }
        return d;
    }
    async function readItem(C, sid, name, {kind = 'submission'} = {}) {
        const d = new DoisPage(page, C.path);
        const row = d.row(sid, kind);
        if (!(await row.count())) { return {listed: false, list: flat(await page.locator('main').innerText().catch(() => ''), 600), snap: name ? await snap(name) : null}; }
        await d.expand(row, sid).catch(() => {});
        await idle(page);
        const out = await row.evaluate((el) => {
            const t = (x) => (x || '').replace(/\s+/g, ' ').trim();
            const ex = el.querySelector('.listPanel__itemExpanded');
            const rows = [...el.querySelectorAll('.listPanel__itemExpanded table tbody tr')].map((tr) => {
                const label = tr.querySelector('td label');
                const input = tr.querySelector('input');
                const badge = tr.querySelector('.doiListItem__itemMetadata--badge');
                return {type: t(label && label.innerText), doi: input ? input.value : null, inputDisabled: input ? input.disabled || input.readOnly : null, labelClass: label ? label.className : null, badge: t(badge && badge.innerText)};
            });
            const badge = el.querySelector('.listPanel__itemSummary .doiListItem__itemMetadata--badge');
            const buttons = [...el.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => t(b.innerText || b.getAttribute('aria-label')) + (b.disabled ? ' [disabled]' : ''));
            return {listed: true, title: t((el.querySelector('.listPanel__itemTitle') || {}).innerText), badge: t(badge && badge.innerText), rows, expandedText: t(ex && ex.innerText).slice(0, 1200), buttons};
        }).catch((e) => ({err: flat(e.message, 200)}));
        if (name) out.snap = await snap(name);
        return out;
    }
    /** Edit a row of an expanded book: `value` '' clears it. */
    async function editDoi(C, sid, type, value, name) {
        const d = new DoisPage(page, C.path);
        const row = d.row(sid);
        await d.expand(row, sid).catch(() => {});
        const out = {};
        try {
            await d.startEditing(row);
            const box = d.doiBox(row, type);
            out.before = await box.inputValue().catch(() => null);
            out.editable = await box.isEditable().catch(() => null);
            if (!out.editable) { out.snap = await snap(`${name}-noteditable`); return out; }
            await box.fill(value);
            out.statuses = await d.saveEditing(row, {expectRequests: true});
            await idle(page);
            out.after = await d.doiBox(row, type).inputValue().catch(() => null);
        } catch (e) { out.err = flat(e.message, 200); }
        out.notices = (await screen(page).catch(() => ({}))).notices;
        out.snap = await snap(name);
        return out;
    }
    async function bulk(C, ids, action, name) {
        const d = new DoisPage(page, C.path);
        const out = {};
        try {
            await d.tick(ids);
            const dlg = await d.chooseBulkAction(action);
            out.dialog = flat(await dlg.innerText().catch(() => ''), 400);
            out.dialogSnap = await snap(`${name}-dialog`);
            const r = await d.confirmAction(dlg, action);
            out.status = r.status();
            out.body = flat(await r.text().catch(() => ''), 300);
        } catch (e) { out.err = flat(e.message, 200); }
        out.notices = (await screen(page).catch(() => ({}))).notices;
        out.snap = await snap(name);
        return out;
    }
    // The reader side (signed out)
    async function reader(C, sid, {version, chapter} = {}, name) {
        let url = cu(C.path, `/catalog/book/${sid}`);
        if (version !== undefined) url += `/version/${version}`;
        if (chapter !== undefined) url += `/chapter/${chapter}`;
        const r = await go(url, vpage);
        const out = {url: strip(url), status: r && r.status ? r.status() : r};
        out.read = await vpage.evaluate(() => {
            const t = (x) => (x || '').replace(/\s+/g, ' ').trim();
            const main = document.querySelector('.obj_monograph_full');
            if (!main) return {noBook: true, h1: t((document.querySelector('h1') || {}).innerText), body: t(document.body.innerText).slice(0, 400)};
            const own = main.querySelector('.main_entry > .item.doi, .obj_chapter .item.doi, .item.doi');
            const toc = [...main.querySelectorAll('.item.chapters > ul > li')].map((li) => ({title: t((li.querySelector('.title') || {}).innerText), doi: t((li.querySelector('.doi') || {}).innerText) || null, href: (() => { const a = li.querySelector('a:has(.title)'); return a ? a.getAttribute('href') : null; })()}));
            const formats = [...main.querySelectorAll('.item.publication_format')].map((b) => t(b.innerText));
            const downloads = [...main.querySelectorAll('.item.files a, .files a')].map((a) => t(a.innerText));
            const dois = [...main.querySelectorAll('a[href*="doi.org"]')].map((a) => `${t(a.closest('.sub_item, .item, li') ? (a.closest('.sub_item, .item, li').className) : '')}: ${a.getAttribute('href')}`);
            return {h1: t((main.querySelector('h1') || {}).innerText), isChapter: !!main.classList.contains('obj_chapter'), ownDoi: own ? t(own.innerText) : null, toc, formats, downloads, dois};
        }).catch((e) => ({err: flat(e.message, 200)}));
        out.snap = await snap(name, null, {pg: vpage});
        return out;
    }
    const chapterIds = (sid, pub) => Object.fromEntries(db(`select (select setting_value from submission_chapter_settings s where s.chapter_id=c.chapter_id and s.setting_name='title' limit 1), c.chapter_id from submission_chapters c where c.publication_id=${pub}`).map((l) => l.split('|')));

    try {
        // ============================================================ kinds: Settings bullet 2 (the OMP boxes and the rows they add)
        await sect('kinds', async () => {
            const C = await mkCtx('K', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication'], doiCreationTime: 'publication'});
            const b = await mkBook(C, 'k', {title: 'Kinds book', decisions: TO_PRODUCTION, published: true,
                chapters: [{title: 'Tides', page: true}, {title: 'Harbours'}], publicationFormats: [pdf('PDF')]});
            await as(C.u.mg, C.path);
            fact('kinds.setupMonographsOnly', await setupKinds(C, null, 'kinds-setup-default'));
            await openDois(C);
            fact('kinds.itemMonographsOnly', await readItem(C, b.id, 'kinds-dois-monographs-only'));
            fact('kinds.tickChapters', await setupKinds(C, {Chapters: true}, 'kinds-setup-chapters'));
            await openDois(C);
            fact('kinds.itemWithChapters', await readItem(C, b.id, 'kinds-dois-with-chapters'));
            fact('kinds.tickFormats', await setupKinds(C, {'Publication Formats': true}, 'kinds-setup-formats'));
            await openDois(C);
            fact('kinds.itemWithBoth', await readItem(C, b.id, 'kinds-dois-with-both'));
            // Leave the Setup tab with a kind changed and unsaved (the sweep).
            const s = new DoiSettings(page, C.path);
            await s.goto('Setup');
            await s.kindBox('Files').check().catch(() => {});
            const t0 = Date.now();
            await go(cu(C.path, '/dois'));
            await sleep(800);
            await s.goto('Setup');
            fact('kinds.leftUnsaved', {dialogs: since(dialogs, t0), kindsAfter: await s.kinds().catch(() => null), snap: await snap('kinds-setup-after-leave')});
            fact('kinds.db', dbBook(b.id));
        });

        // ============================================================ copyedit: Rule 5 rider, Rule 48 first bullet, Side effects 776–777, Settings 14
        await sect('copyedit', async () => {
            const C = await mkCtx('C', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'chapter', 'representation'], doiCreationTime: 'copyediting'});
            const b = await mkBook(C, 'c', {title: 'Copyedit book', participants: [{username: C.u.se, role: 'sectionEditor'}],
                chapters: [{title: 'Tides', page: true}, {title: 'Harbours'}],
                publicationFormats: [pdf('PDF'), {name: 'Proof', approved: false, available: false}]});
            await as(C.u.mg, C.path);
            await openDois(C);
            fact('copyedit.beforeDecision', {item: await readItem(C, b.id, 'c-dois-before'), db: dbBook(b.id)});
            fact('copyedit.logBefore', await activity(C, b.id, 'c-log-before'));
            fact('copyedit.accept', await decide(C, b.id, 'Accept and Skip Review', 'c-accept'));
            await openDois(C);
            fact('copyedit.afterAccept', {item: await readItem(C, b.id, 'c-dois-after-accept'), db: dbBook(b.id)});
            fact('copyedit.logAfterAccept', await activity(C, b.id, 'c-log-after-accept'));
            // A format added in Copyediting, then the move to Production.
            fact('copyedit.addPrint', await formatAdd(C, b.id, b.pub, 'Print', 'c-add-print'));
            fact('copyedit.toProduction', await decide(C, b.id, 'Send To Production', 'c-to-production'));
            await openDois(C);
            fact('copyedit.afterProduction', {item: await readItem(C, b.id, 'c-dois-after-production'), db: dbBook(b.id)});
            fact('copyedit.logAfterProduction', await activity(C, b.id, 'c-log-after-production'));
            // After the last decision: Harbours' page ticked, EPUB added; then the publish.
            fact('copyedit.tickHarbours', await chapterWindow(C, b.id, b.pub, 'Harbours', {tick: true, name: 'c-tick-harbours'}));
            fact('copyedit.addEpub', await formatAdd(C, b.id, b.pub, 'EPUB', 'c-add-epub'));
            await openDois(C);
            fact('copyedit.beforePublish', {item: await readItem(C, b.id, 'c-dois-before-publish'), db: dbBook(b.id)});
            fact('copyedit.publish', await publish(C, b.id, b.pub, 'c-publish'));
            await openDois(C);
            fact('copyedit.afterPublish', {item: await readItem(C, b.id, 'c-dois-after-publish'), db: dbBook(b.id)});
            fact('copyedit.logAfterPublish', await activity(C, b.id, 'c-log-after-publish'));
            // A chapter added to the published version with its page ticked, then "Assign DOIs".
            fact('copyedit.addCoda', await chapterWindow(C, b.id, b.pub, 'Coda', {add: true, tick: true, name: 'c-add-coda'}));
            await openDois(C);
            fact('copyedit.codaBeforeAssign', {item: await readItem(C, b.id, 'c-dois-coda'), db: dbBook(b.id)});
            fact('copyedit.assign', await bulk(C, [b.id], 'Assign DOIs', 'c-assign'));
            await openDois(C);
            fact('copyedit.afterAssign', {item: await readItem(C, b.id, 'c-dois-after-assign'), db: dbBook(b.id)});
            fact('copyedit.logAfterAssign', await activity(C, b.id, 'c-log-after-assign'));
            // Settings 14 and Cross-feature 892–893: the box of a chapter that has a DOI; a new chapter's box.
            fact('copyedit.tidesWindow', await chapterWindow(C, b.id, b.pub, 'Tides', {tick: false, name: 'c-tides-untick'}));
            fact('copyedit.tidesAfter', dbBook(b.id).chapters);
            fact('copyedit.tidesReopen', await chapterWindow(C, b.id, b.pub, 'Tides', {name: 'c-tides-reopen', leaveUnsaved: true}));
            fact('copyedit.newChapterWindow', await chapterWindow(C, b.id, b.pub, 'Scratch', {add: true, name: 'c-add-window-left', leaveUnsaved: true}));
            fact('copyedit.harboursLeaveUnsaved', await chapterWindow(C, b.id, b.pub, 'Harbours', {tick: false, name: 'c-harbours-leave', leaveUnsaved: true}));
            // The other end: "Monographs" and "Files" only; the decision recorded by the Series editor.
            const C2 = await mkCtx('C2', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'file'], doiCreationTime: 'copyediting'});
            const b2 = await mkBook(C2, 'd', {title: 'Other end book', participants: [{username: C2.u.se, role: 'sectionEditor'}],
                chapters: [{title: 'Tides', page: true}], publicationFormats: [pdf('PDF')]});
            await as(C2.u.se, C2.path);
            fact('copyedit2.acceptBySeriesEditor', await decide(C2, b2.id, 'Accept and Skip Review', 'c2-accept-se'));
            await as(C2.u.mg, C2.path);
            await openDois(C2);
            fact('copyedit2.afterAccept', {item: await readItem(C2, b2.id, 'c2-dois-after-accept'), db: dbBook(b2.id)});
            fact('copyedit2.log', await activity(C2, b2.id, 'c2-log-after-accept'));
            fact('copyedit2.tickKinds', await setupKinds(C2, {Chapters: true, 'Publication Formats': true}, 'c2-setup-tick'));
            await openDois(C2);
            fact('copyedit2.rowsAfterTick', {item: await readItem(C2, b2.id, 'c2-dois-after-tick'), db: dbBook(b2.id)});
            // "Assign DOIs" on the unpublished book (Rule 48, "published or not").
            fact('copyedit2.assign', await bulk(C2, [b2.id], 'Assign DOIs', 'c2-assign'));
            await openDois(C2);
            fact('copyedit2.afterAssign', {item: await readItem(C2, b2.id, 'c2-dois-after-assign'), db: dbBook(b2.id)});
            fact('copyedit2.logAfterAssign', await activity(C2, b2.id, 'c2-log-after-assign'));
        });

        // ============================================================ publish: Rule 48 "Upon publication", "Assign DOIs"; Side effects 773–780
        await sect('publish', async () => {
            const C = await mkCtx('P', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'chapter', 'representation'], doiCreationTime: 'publication'});
            const b = await mkBook(C, 'p', {title: 'Publish book', decisions: TO_PRODUCTION, participants: [{username: C.u.se, role: 'sectionEditor'}],
                chapters: [{title: 'Tides', page: true}, {title: 'Harbours'}], publicationFormats: [pdf('PDF')]});
            const b2 = await mkBook(C, 'q', {title: 'Series editor book', decisions: TO_PRODUCTION, participants: [{username: C.u.se, role: 'sectionEditor'}],
                chapters: [{title: 'Tides', page: true}], publicationFormats: [pdf('PDF')]});
            await as(C.u.mg, C.path);
            await openDois(C);
            fact('publish.before', {item: await readItem(C, b.id, 'p-dois-before'), db: dbBook(b.id)});
            fact('publish.logBefore', await activity(C, b.id, 'p-log-before'));
            fact('publish.publish', await publish(C, b.id, b.pub, 'p-publish'));
            await openDois(C);
            fact('publish.after', {item: await readItem(C, b.id, 'p-dois-after'), db: dbBook(b.id)});
            fact('publish.logAfter', await activity(C, b.id, 'p-log-after-publish'));
            fact('publish.tickHarbours', await chapterWindow(C, b.id, b.pub, 'Harbours', {tick: true, name: 'p-tick-harbours'}));
            await openDois(C);
            fact('publish.afterTick', {item: await readItem(C, b.id, 'p-dois-after-tick'), db: dbBook(b.id)});
            fact('publish.assign', await bulk(C, [b.id], 'Assign DOIs', 'p-assign'));
            await openDois(C);
            fact('publish.afterAssign', {item: await readItem(C, b.id, 'p-dois-after-assign'), db: dbBook(b.id)});
            fact('publish.logAfterAssign', await activity(C, b.id, 'p-log-after-assign'));
            // Clear, then type, a format's and a chapter's DOI; the log after each.
            await openDois(C);
            fact('publish.clearPdf', await editDoi(C, b.id, 'Format / PDF', '', 'p-clear-pdf'));
            fact('publish.logAfterClearPdf', await activity(C, b.id, 'p-log-after-clear-pdf'));
            await openDois(C);
            fact('publish.typePdf', await editDoi(C, b.id, 'Format / PDF', `${PREFIX}/${C.path}-pdf`, 'p-type-pdf'));
            fact('publish.logAfterTypePdf', await activity(C, b.id, 'p-log-after-type-pdf'));
            await openDois(C);
            fact('publish.clearTides', await editDoi(C, b.id, 'Tides', '', 'p-clear-tides'));
            await openDois(C);
            fact('publish.typeTides', await editDoi(C, b.id, 'Tides', `${PREFIX}/${C.path}-tides`, 'p-type-tides'));
            await openDois(C);
            fact('publish.changeTides', await editDoi(C, b.id, 'Tides', `${PREFIX}/${C.path}-tides2`, 'p-change-tides'));
            fact('publish.logAfterChapterEdits', await activity(C, b.id, 'p-log-after-chapter-edits'));
            fact('publish.dbAfterEdits', dbBook(b.id));
            // Leave the expanded view with a box changed and unsaved (the sweep).
            await openDois(C);
            {
                const d = new DoisPage(page, C.path);
                const row = d.row(b.id);
                await d.expand(row, b.id).catch(() => {});
                await d.startEditing(row).catch(() => {});
                await d.doiBox(row, 'Tides').fill(`${PREFIX}/${C.path}-unsaved`).catch(() => {});
                const t0 = Date.now();
                await go(cu(C.path, '/submissions'));
                await openDois(C);
                fact('publish.leaveUnsaved', {dialogs: since(dialogs, t0), item: await readItem(C, b.id, 'p-dois-after-leave')});
            }
            // "Whoever publishes": another manager-level role (the Press editor) publishes the second book (a Series editor is offered no "Publish", U49 A2).
            await as(C.u.ed, C.path);
            fact('publish.seriesEditorPublish', await publish(C, b2.id, b2.pub, 'p-publish-se'));
            await as(C.u.mg, C.path);
            fact('publish.logSeriesEditor', await activity(C, b2.id, 'p-log-se-publish'));
            fact('publish.b2db', dbBook(b2.id));
            // Reachability for the Coverage rows of Rule 52: "Mark DOIs Registered", then "Unpublish".
            await openDois(C);
            fact('publish.markRegistered', await bulk(C, [b.id], 'Mark DOIs Registered', 'p-mark-registered'));
            await openDois(C);
            fact('publish.afterMark', {item: await readItem(C, b.id, 'p-dois-after-mark'), db: dbBook(b.id)});
            fact('publish.unpublish', await unpublish(C, b.id, b.pub, 'p-unpublish'));
            await openDois(C);
            fact('publish.afterUnpublish', {item: await readItem(C, b.id, 'p-dois-after-unpublish'), db: dbBook(b.id)});
        });

        // ============================================================ never: "Assign DOIs" under "Never", on an unpublished book
        await sect('never', async () => {
            const C = await mkCtx('N', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'chapter', 'representation'], doiCreationTime: 'never'});
            const b = await mkBook(C, 'n', {title: 'Never book', decisions: TO_PRODUCTION,
                chapters: [{title: 'Tides', page: true}, {title: 'Harbours'}], publicationFormats: [pdf('PDF'), {name: 'Proof', approved: false, available: false}]});
            await as(C.u.mg, C.path);
            await openDois(C);
            fact('never.before', {item: await readItem(C, b.id, 'n-dois-before'), db: dbBook(b.id)});
            fact('never.assign', await bulk(C, [b.id], 'Assign DOIs', 'n-assign'));
            await openDois(C);
            fact('never.after', {item: await readItem(C, b.id, 'n-dois-after'), db: dbBook(b.id)});
            fact('never.log', await activity(C, b.id, 'n-log-after-assign'));
            fact('never.publish', await publish(C, b.id, b.pub, 'n-publish'));
            fact('never.afterPublish', dbBook(b.id));
        });

        // ============================================================ formats: Rule 53, Rule 54 third bullet, Rule 43 rider
        await sect('formats', async () => {
            const C = await mkCtx('F', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'representation'], doiCreationTime: 'publication'});
            const a = await mkBook(C, 'a', {title: 'Formats book A', decisions: TO_PRODUCTION, published: true, publicationFormats: [pdf('PDF'), pdf('EPUB')]});
            const b = await mkBook(C, 'b', {title: 'Formats book B', decisions: TO_PRODUCTION, publicationFormats: [pdf('PDF'), pdf('EPUB', {available: false})]});
            await as(C.u.mg, C.path);
            fact('formats.aReaderBefore', await reader(C, a.id, {}, 'f-a-reader-before'));
            fact('formats.aUnavailable', await formatStatus(C, a.id, a.pub, 'EPUB', 'Available', 'Format Availability', 'f-a-epub-unavailable'));
            await openDois(C);
            fact('formats.aDois', {item: await readItem(C, a.id, 'f-a-dois'), db: dbBook(a.id)});
            fact('formats.aReaderAfter', await reader(C, a.id, {}, 'f-a-reader-after'));
            fact('formats.bRevoke', await formatStatus(C, b.id, b.pub, 'PDF', 'Approved', 'Format Approval', 'f-b-pdf-revoke'));
            fact('formats.bPublish', await publish(C, b.id, b.pub, 'f-b-publish'));
            await openDois(C);
            fact('formats.bDois', {item: await readItem(C, b.id, 'f-b-dois'), db: dbBook(b.id)});
            fact('formats.bReader', await reader(C, b.id, {}, 'f-b-reader'));
            // A seeded published book whose "Proof" is neither approved nor available (the pair's far end).
            const c = await mkBook(C, 'c', {title: 'Formats book C', decisions: TO_PRODUCTION, published: true, publicationFormats: [pdf('PDF'), pdf('Proof', {approved: false, available: false})]});
            await openDois(C);
            fact('formats.cDois', {item: await readItem(C, c.id, 'f-c-dois'), db: dbBook(c.id)});
            fact('formats.cReader', await reader(C, c.id, {}, 'f-c-reader'));
        });

        // ============================================================ versions: Rule 50
        await sect('versions', async () => {
            // "DOI Versioning" "No"
            const C = await mkCtx('VN', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'chapter', 'representation'], doiCreationTime: 'publication', doiVersioning: false});
            const b = await mkBook(C, 'v', {title: 'Versions No book', decisions: TO_PRODUCTION, published: true, chapters: [{title: 'Tides', page: true}], publicationFormats: [pdf('PDF')]});
            await as(C.u.mg, C.path);
            await openDois(C);
            fact('vno.v1', {item: await readItem(C, b.id, 'vn-dois-v1'), db: dbBook(b.id)});
            const nv = await newVersion(C, b.id, b.pub, null, 'vn-new-version');
            fact('vno.newVersion', nv);
            await openDois(C);
            fact('vno.v2BeforePublish', {item: await readItem(C, b.id, 'vn-dois-v2-before'), db: dbBook(b.id)});
            if (nv.newPub) {
                fact('vno.addCoda', await chapterWindow(C, b.id, nv.newPub, 'Coda', {add: true, tick: true, name: 'vn-add-coda'}));
                fact('vno.publishV2', await publish(C, b.id, nv.newPub, 'vn-publish-v2'));
            }
            await openDois(C);
            fact('vno.v2AfterPublish', {item: await readItem(C, b.id, 'vn-dois-v2-after'), db: dbBook(b.id)});
            fact('vno.changeTides', await editDoi(C, b.id, 'Tides', `${PREFIX}/${C.path}-tides`, 'vn-change-tides'));
            fact('vno.changePdf', await editDoi(C, b.id, 'Format / PDF', `${PREFIX}/${C.path}-pdf`, 'vn-change-pdf'));
            fact('vno.dbAfterChange', dbBook(b.id));
            const ids1 = chapterIds(b.id, b.pub);
            fact('vno.readerV1', await reader(C, b.id, {version: b.pub}, 'vn-reader-v1'));
            if (nv.newPub) fact('vno.readerV2', await reader(C, b.id, {version: nv.newPub}, 'vn-reader-v2'));
            fact('vno.readerV1Tides', await reader(C, b.id, {version: b.pub, chapter: ids1.Tides}, 'vn-reader-v1-tides'));

            // "DOI Versioning" "Yes"
            const Y = await mkCtx('VY', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'chapter', 'representation'], doiCreationTime: 'publication', doiVersioning: true});
            const y = await mkBook(Y, 'y', {title: 'Versions Yes book', decisions: TO_PRODUCTION, published: true, chapters: [{title: 'Tides', page: true}], publicationFormats: [pdf('PDF')]});
            await as(Y.u.mg, Y.path);
            await openDois(Y);
            fact('vyes.v1', {item: await readItem(Y, y.id, 'vy-dois-v1'), db: dbBook(y.id)});
            const major = await newVersion(Y, y.id, y.pub, 'Major Revision', 'vy-major');
            fact('vyes.major', major);
            if (major.newPub) fact('vyes.addCoda', await chapterWindow(Y, y.id, major.newPub, 'Coda', {add: true, tick: true, name: 'vy-add-coda'}));
            await openDois(Y);
            fact('vyes.majorBeforePublish', {item: await readItem(Y, y.id, 'vy-dois-major-before'), db: dbBook(y.id)});
            if (major.newPub) fact('vyes.publishMajor', await publish(Y, y.id, major.newPub, 'vy-publish-major'));
            await openDois(Y);
            fact('vyes.majorAfterPublish', {item: await readItem(Y, y.id, 'vy-dois-major-after'), db: dbBook(y.id)});
            const minor = major.newPub ? await newVersion(Y, y.id, major.newPub, 'Minor Revision', 'vy-minor') : {};
            fact('vyes.minor', minor);
            await openDois(Y);
            fact('vyes.minorRows', {item: await readItem(Y, y.id, 'vy-dois-minor'), db: dbBook(y.id)});
            // "View all" › "Edit": the newest block's "Tides" changed, "Save".
            {
                const d = new DoisPage(page, Y.path);
                const row = d.row(y.id);
                const out = {};
                try {
                    await d.expand(row, y.id);
                    out.bar = flat(await d.versionsBar(row).innerText().catch(() => ''), 200);
                    await d.openVersionsWindow(row);
                    out.headings = (await d.versionHeadings().allInnerTexts()).map((x) => flat(x, 120));
                    out.windowSnap = await snap('vy-view-all');
                    await d.versionsEditButton().click();
                    await sleep(500);
                    const newest = d.versionsWindow().locator('.doiListItem__versionContainer').last();
                    const box = d.versionDoiBox(newest, 'Tides');
                    out.newestTidesBefore = await box.inputValue().catch(() => null);
                    await box.fill(`${PREFIX}/${Y.path}-tides21`);
                    const reqs = [];
                    const onR = (r) => { if (/\/api\/v1\/(_)?dois/.test(r.url()) && r.request().method() !== 'GET') reqs.push(`${r.request().method()} ${strip(r.url())} ${r.status()}`); };
                    page.on('response', onR);
                    await d.versionsEditButton().click();
                    await sleep(2500); await idle(page);
                    page.off('response', onR);
                    out.reqs = reqs;
                    out.blocks = await d.versionsWindow().locator('.doiListItem__versionContainer').evaluateAll((bs) => bs.map((b) => ({head: (b.querySelector('a') || {}).innerText, rows: [...b.querySelectorAll('tbody tr')].map((tr) => `${(tr.querySelector('label') || {}).innerText}=${(tr.querySelector('input') || {}).value}`)})));
                    out.snap = await snap('vy-view-all-saved');
                    await d.closeVersionsWindow().catch(() => {});
                } catch (e) { out.err = flat(e.message, 200); out.snap = await snap('vy-view-all-err'); }
                out.db = dbBook(y.id);
                fact('vyes.viewAllEdit', out);
            }
        });

        // ============================================================ readers: Rule 54, both ends of "DOI Versioning"
        await sect('readers', async () => {
            for (const [key, versioning] of [['RN', false], ['RY', true]]) {
                const C = await mkCtx(key, {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication'], doiCreationTime: 'publication', doiVersioning: versioning});
                const b = await mkBook(C, 'r', {title: `Readers ${key} book`, decisions: TO_PRODUCTION, published: true, chapters: [{title: 'Tides', page: true}], publicationFormats: [pdf('PDF')]});
                const k = key.toLowerCase();
                await as(C.u.mg, C.path);
                fact(`${k}.tickKinds`, await setupKinds(C, {Chapters: true, 'Publication Formats': true}, `${k}-setup-tick`));
                const nv = await newVersion(C, b.id, b.pub, 'Minor Revision', `${k}-minor`);
                fact(`${k}.minor`, nv);
                if (nv.newPub) fact(`${k}.publishMinor`, await publish(C, b.id, nv.newPub, `${k}-publish-minor`));
                await openDois(C);
                fact(`${k}.dois`, {item: await readItem(C, b.id, `${k}-dois`), db: dbBook(b.id)});
                fact(`${k}.typeTides`, await editDoi(C, b.id, 'Tides', `${PREFIX}/${C.path}-t11`, `${k}-type-tides`));
                const db1 = dbBook(b.id);
                fact(`${k}.db`, db1);
                const ids1 = chapterIds(b.id, b.pub);
                const ids2 = nv.newPub ? chapterIds(b.id, nv.newPub) : {};
                const readAll = async (phase) => {
                    const out = {};
                    out.v1 = await reader(C, b.id, {version: b.pub}, `${k}-${phase}-v1`);
                    if (nv.newPub) out.v2 = await reader(C, b.id, {version: nv.newPub}, `${k}-${phase}-v2`);
                    out.current = await reader(C, b.id, {}, `${k}-${phase}-current`);
                    out.v1Tides = await reader(C, b.id, {version: b.pub, chapter: ids1.Tides}, `${k}-${phase}-v1-tides`);
                    if (nv.newPub) out.v2Tides = await reader(C, b.id, {version: nv.newPub, chapter: ids1.Tides}, `${k}-${phase}-v2-tides`);
                    out.currentTides = await reader(C, b.id, {chapter: ids1.Tides}, `${k}-${phase}-current-tides`);
                    return out;
                };
                fact(`${k}.readersTicked`, await readAll('ticked'));
                fact(`${k}.untickKinds`, await setupKinds(C, {Chapters: false, 'Publication Formats': false}, `${k}-setup-untick`));
                fact(`${k}.readersUnticked`, await readAll('unticked'));
            }
        });

        // ============================================================ ctl: OJS and OPS controls (read-only on the OMP-only content)
        await sect('ctl', async () => {
            const kinds = isOJS ? ['publication', 'representation'] : ['publication', 'representation'];
            const C = await mkCtx('X', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: kinds, doiCreationTime: isOPS ? 'production' : 'copyediting'}, {reviewers: isOJS});
            await as(C.u.mg, C.path);
            fact('ctl.setup', await setupKinds(C, null, 'x-setup'));
            await openDois(C);
            fact('ctl.doisTabs', {tabs: await page.getByRole('tab').allInnerTexts().catch(() => []), snap: await snap('x-dois')});
            if (isOPS) return;
            // OJS: the journal's decision into Copyediting (Side effects 776–777, control).
            const a = await mkBook(C, 'a', {title: 'Control article', participants: [{username: C.u.se, role: 'sectionEditor'}], galleys: [{label: 'PDF', file: 'article.pdf'}]});
            fact('ctl.accept', await decide(C, a.id, 'Accept and Skip Review', 'x-accept'));
            await openDois(C);
            fact('ctl.afterAccept', await readItem(C, a.id, 'x-dois-after-accept'));
            fact('ctl.logAfterAccept', await activity(C, a.id, 'x-log-after-accept'));
            // A galley's DOI cleared and typed (control for 778: "On a press").
            await openDois(C);
            fact('ctl.clearGalley', await editDoi(C, a.id, 'PDF', '', 'x-clear-galley'));
            fact('ctl.logAfterClear', await activity(C, a.id, 'x-log-after-clear'));
            await openDois(C);
            fact('ctl.typeGalley', await editDoi(C, a.id, 'PDF', `${PREFIX}/${C.path}-g`, 'x-type-galley'));
            fact('ctl.logAfterType', await activity(C, a.id, 'x-log-after-type'));
            // The issue page's DOI line (633) and the "Issues" tab (794).
            const J = await mkCtx('XI', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'issue'], doiCreationTime: 'publication', issues: [{volume: 1, number: 1, year: 2026, published: true}]});
            await as(J.u.mg, J.path);
            await openDois(J);
            const tabs1 = await page.getByRole('tab').allInnerTexts().catch(() => []);
            await page.getByRole('tab', {name: 'Issues', exact: true}).click().catch(() => {});
            await idle(page); await sleep(1000);
            const issueRows = flat(await page.locator('main').innerText().catch(() => ''), 1000);
            fact('ctl.issuesTab', {tabs: tabs1, issueRows, snap: await snap('xi-dois-issues')});
            const iid = (J.issues && J.issues[0] && (J.issues[0].id || J.issues[0].issueId)) || db(`select issue_id from issues where journal_id=${J.id} limit 1`)[0];
            fact('ctl.issueDb', db(`select i.issue_id, coalesce(d.doi,'-') from issues i left join dois d on d.doi_id=i.doi_id where i.journal_id=${J.id}`));
            {
                const r = await go(cu(J.path, `/issue/view/${iid}`), vpage);
                const doiLine = await vpage.locator('.obj_issue_toc .pub_id.doi').innerText().catch(() => null);
                fact('ctl.issuePage', {status: r && r.status ? r.status() : null, doiLine: flat(doiLine, 200), href: await vpage.locator('.obj_issue_toc .pub_id.doi a').getAttribute('href').catch(() => null), snap: await snap('xi-issue-page', null, {pg: vpage})});
            }
            fact('ctl.untickIssues', await setupKinds(J, {Issues: false}, 'xi-setup-untick-issues'));
            await openDois(J);
            fact('ctl.tabsAfterUntick', {tabs: await page.getByRole('tab').allInnerTexts().catch(() => []), snap: await snap('xi-dois-after-untick')});
            // "Peer Review": a review sent the "Notify Reviewers" email by the decision, row present, then unticked.
            const P = await mkCtx('XP', {enableDois: true, doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'peerReview'], doiCreationTime: 'copyediting', review: {defaultReviewPublicVisibility: true}}, {reviewers: true});
            const r = await mkBook(P, 'r', {title: 'Peer control article', decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: P.u.rv, status: 'completed'}]}]});
            await as(P.u.mg, P.path);
            fact('ctl.peerAccept', await decide(P, r.id, 'Accept Submission', 'xp-accept'));
            await openDois(P);
            fact('ctl.peerRows', await readItem(P, r.id, 'xp-dois-rows'));
            fact('ctl.peerUntick', await setupKinds(P, {'Peer Review': false}, 'xp-setup-untick'));
            await openDois(P);
            fact('ctl.peerRowsAfterUntick', await readItem(P, r.id, 'xp-dois-after-untick'));
            fact('ctl.peerDb', db(`select review_id, coalesce(d.doi,'-'), considered from review_assignments ra left join dois d on d.doi_id=ra.doi_id where submission_id=${r.id}`));
        });
    } finally {
        await V.close().catch(() => {});
        await close();
    }
});
