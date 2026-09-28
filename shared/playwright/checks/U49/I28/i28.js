// U49 claim check, housekeeping chunk I28 (2026-09-28): incidentals rows L95, L105, L107,
// L109, L112, L141 of docs/tracking/incidentals.md (.reports/hk28/chunks/U49.md).
// Spec: docs/specs/U49-publish-schedule-and-versions.md — Fields (Issue Assignment rows),
// Rules 3, 5, 11, 16, Side effects ("Publication Published", "Passed along"), register OJS2;
// footnotes h, i, m, v, x, ac, f-ojs2.
//
// Seeds its own scratch contexts per run, signs in as their throwaway managers (and an
// assigned section editor), records every screen with screen(). Phases (OJS unless noted):
//   l95    Publication Settings › "Assign To Future Issue and Schedule Only" + the future
//          issue › "Save": the save's body `status`; the page at once and after a reload;
//          then the publish button: panel or window, the panel's preselection, the window's
//          text, the outcome. Journal A (a published back issue + a future one) and
//          journal B (a future issue only).
//   l112   Publication Settings as it arrives on a Production article that never saved an
//          issue choice: change only "Pages", "Save" (refused?), then "Don't Assign To An
//          Issue", "Save"; journal A as the manager and as an assigned section editor,
//          journal B (future issue only) and journal E (no issue at all) as the manager.
//          The page is also left once with an unsaved change.
//   l112x  journal B: a "Pages"-only save on a fresh article, read at once, after a reload and in the panel.
//   l105   A published article (A, back issue): "Create New Version" › untouched Confirm, then
//          at once the publish button (panel or window?); a second one with Publication
//          Settings saved first (Update Type "Correction"). The new version's status.
//   l107   {OJS OMP} "Send to Text Editor" on a .docx in "Production Ready Files": the version
//          picker's options on a published item with a VoR 1.1 draft (and a stage-less one if
//          the dialog allows it), and on an unpublished item with two stage-less versions.
//   l109   Journal C (principal contact distinct from the manager): a scheduled article's issue
//          published by "Publish Issue" › OK; the author's "Publication Published" From:.
//          Control: a second article published from its workflow.
//   l141p  {OJS OMP} the same under the ORCID "Public API", published without an issue.
//   l141   {OJS OMP OPS} a verified ORCID contributor (member API) published from the workflow:
//          the jobs queue before and after (a DepositOrcidSubmission job?); the author's
//          "Publication Published" From: on a direct publish (all three apps).
// Run twice, each under its own facts name (fresh scratch contexts per RUN):
//   RUN=r1 PROBE_FEATURE=U49 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U49/I28/i28.js
//   RUN=r2 …   (PHASES=l95,l112,… narrows; a full run outlasts the Bash cap: nohup it)
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, drainJobs, tag, outDir} =
    require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL = ['l95', 'l112', 'l112x', 'l105', 'l107', 'l109', 'l141', 'l141p'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 600) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const log = (...a) => console.log(`[i28 ${RUN}]`, ...a);
const N = (name) => `${RUN}-${name}`;
const DOCX = path.resolve(__dirname, '../../U48/K3/k3-figure.docx');
const vis = '[role="dialog"]:visible';
const PUBLISH_RE = /^(Schedule For Publication|Publish|Post)$/;
const WINDOW_RE = /Are you sure you want to|requirements must be met|requirements have been met/;

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const sf = path.join(outDir(), `i28-state-${RUN}-${app.name}.json`);
    const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i28-facts-${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 1800)); };
    const sql = (q) => {
        try { return execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `SQL ERROR ${flat(e.stderr, 300)}`; }
    };

    // ------------------------------------------------------------------ seed
    if (!S.seeded) {
        const t = tag('u49i28');
        S.t = t;
        const people = (p) => [
            {username: `${p}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
            ...(isOPS ? [] : [{username: `${p}se`, roles: ['sectionEditor'], givenName: 'Sol', familyName: 'Sectioned'}]),
            {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: `${p}av`, roles: ['author'], givenName: 'Ben', familyName: 'Writer'},
        ];
        const ctx = async (k, spec = {}) => {
            const p = `${t}${k}`;
            const c = await app.api.createContext({tag: p, users: people(p), ...spec,
                context: {acronym: 'JPK', contactName: 'Pat Principal', contactEmail: `${p}pc@mail.test`, ...(spec.context || {})}});
            S[k] = {path: c.path, id: c.contextId || c.id || null, mg: `${p}mg`, se: `${p}se`, au: `${p}au`, av: `${p}av`, pc: `${p}pc@mail.test`, issues: c.issues || null, subs: {}};
            return S[k];
        };
        const PROD = isOPS ? {} : {decisions: ['skipExternalReview', 'sendToProduction']};
        const sub = async (k, s, extra = {}) => {
            const r = await app.api.createSubmission({tag: `${S.t}${k}${s}`, context: S[k].path, submitter: S[k].au, title: `I28 ${k}${s} ${S.t}`, ...extra});
            S[k].subs[s] = {id: r.submissionId, pub: r.publicationId, stageId: r.stageId, status: r.status};
        };
        if (isOJS) {
            await ctx('A', {issues: [{volume: 1, number: 1, year: 2025, published: true}, {volume: 1, number: 2, year: 2027}]});
            const backA = {volume: 1, number: 1, year: 2025};
            await sub('A', '95', PROD);
            await sub('A', '112m', PROD);
            await sub('A', '112s', {...PROD, participants: [{username: S.A.se, role: 'sectionEditor'}]});
            await sub('A', '105a', {...PROD, published: true, issue: backA});
            await sub('A', '105b', {...PROD, published: true, issue: backA});
            await sub('A', '107', {...PROD, published: true, issue: backA});
            await sub('A', '107u', PROD);
            await ctx('B', {issues: [{volume: 1, number: 1, year: 2027}]});
            await sub('B', '95', PROD);
            await sub('B', '112', PROD);
            await ctx('C', {context: {contactName: 'Pat Principal', contactEmail: `${t}Cpc@mail.test`}, issues: [{volume: 1, number: 1, year: 2027}]});
            await sub('C', '1', {...PROD, published: true, issue: {volume: 1, number: 1, year: 2027}});
            const r2 = await app.api.createSubmission({tag: `${S.t}C2`, context: S.C.path, submitter: S.C.av, title: `I28 C2 ${S.t}`, ...PROD});
            S.C.subs['2'] = {id: r2.submissionId, pub: r2.publicationId, stageId: r2.stageId, status: r2.status};
            await ctx('E', {orcid: {enabled: true, apiType: 'memberSandbox'}});
            await sub('E', '112', PROD);
            const rp = await app.api.createSubmission({tag: `${S.t}Eplain`, context: S.E.path, submitter: S.E.av, title: `I28 Eplain ${S.t}`, ...PROD});
            S.E.subs.plain = {id: rp.submissionId, pub: rp.publicationId, stageId: rp.stageId, status: rp.status};
            // l141's other end: the same verified contributor on a journal with a published back issue
            await ctx('G', {orcid: {enabled: true, apiType: 'memberSandbox'}, issues: [{volume: 1, number: 1, year: 2025, published: true}]});
            await sub('G', 'orc', {...PROD, author: {orcid: 'https://orcid.org/0000-0001-5109-3700', orcidIsVerified: true}});
        }
        if (isOMP) {
            await ctx('M', {context: {acronym: 'PKP'}, orcid: {enabled: true, apiType: 'memberSandbox'}});
            await sub('M', '107', {...PROD, published: true});
            await sub('M', '107u', PROD);
        }
        if (isOPS) await ctx('X', {context: {acronym: 'PKPX'}, orcid: {enabled: true, apiType: 'memberSandbox'}});
        // l141: the verified ORCID contributor, at Production (OJS, OMP) / submitted (OPS)
        const O = isOJS ? 'E' : isOMP ? 'M' : 'X';
        await sub(O, 'orc', {...PROD, author: {orcid: 'https://orcid.org/0000-0001-5109-3700', orcidIsVerified: true}});
        S.O = O;
        S.seeded = true;
        save();
        fact('seed', S);
        note(`ccI28 [${app.name}] ${RUN}: scratch contexts ${Object.keys(S).filter((k) => S[k] && S[k].path).map((k) => `${k}=${S[k].path}`).join(', ')}`);
    }

    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const wfUrl = (ctx, id, key) => cUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    const {page, close} = await launch(app);
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300)});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    // the screens' own API traffic: every write with its body, the publication GETs' answers
    const net = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u)) return;
        const req = r.request();
        const m = req.method();
        const pubGet = /\/publications\/\d+(\?|$)|issueAssignmentStatus/.test(u);
        if (m === 'GET' && !pubGet) return;
        let body = null;
        try { body = await r.json(); } catch { /* */ }
        let post = null;
        try { post = req.postDataJSON(); } catch { post = flat(req.postData(), 400); }
        const keep = (b) => {
            if (!b || typeof b !== 'object') return b;
            const o = {};
            for (const k of ['id', 'status', 'versionStage', 'versionMajor', 'versionMinor', 'issueId', 'version', 'assignmentType', 'errors', 'error', 'errorMessage', 'pages', 'updateType', 'datePublished']) if (k in b) o[k] = b[k];
            if (b.errors === undefined && Object.keys(o).length === 0) return flat(JSON.stringify(b), 300);
            return o;
        };
        net.push({at: Date.now(), m, override: req.headers()['x-http-method-override'] || null, status: r.status(), url: u.replace(/^.*\/api\/v1/, '').slice(0, 160), post: m === 'GET' ? undefined : post, body: keep(body)});
    });
    const netSince = (t0, gets = false) => net.filter((x) => x.at >= t0 && (gets || x.m !== 'GET')).map(({at, ...x}) => x);
    const dialogsSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);

    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        record(N(name), s);
        await shot(page, N(name)).catch(() => {});
        return s;
    }
    const step = async (name, fn) => {
        const out = {};
        try { await fn(out); } catch (e) { out.error = flat(e.message, 500); log('step error', name, out.error); await snap(`${name}-error`).catch(() => {}); }
        fact(name, out);
        return out;
    };
    let who = null;
    const as = async (user, ctxPath) => {
        if (who === user) return;
        await signIn(page, user, {contextPath: ctxPath});
        await idle(page);
        who = user;
    };
    const wf = () => page.locator(vis).first();
    async function openWf(ctxPath, id, key, name) {
        await page.goto(wfUrl(ctxPath, id, key));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(600);
        if (name) return snap(name);
        return null;
    }
    const readout = async () => ({
        left: flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200),
        right: (await page.locator('[data-cy="workflow-controls-right"]').getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)),
        menu: (await page.getByRole('treeitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)).filter((x) => /Version|version|Author Original|Manuscript/.test(x)),
    });
    const COLS = `publication_id, status, version_stage, version_major, version_minor, ${isOJS ? 'issue_id' : 'null'}, date_published`;
    const dbPub = (pub) => sql(`select ${COLS} from publications where publication_id=${pub}`);
    const dbPubs = (sid) => sql(`select ${COLS} from publications where submission_id=${sid} order by publication_id`);

    // ---- the Issue Assignment group (Publication Settings page or panel)
    async function readAssign(scope) {
        return scope.evaluate((el) => {
            const radios = [...el.querySelectorAll('input[name="assignment"]')].filter((r) => r.getClientRects().length || r.closest('label')?.getClientRects().length).map((r) => ({value: r.value, checked: r.checked, label: (r.closest('label')?.innerText || r.parentElement?.innerText || '').replace(/\s+/g, ' ').trim()}));
            const sel = el.querySelector('select[name="issueId"]');
            const issue = sel ? {visible: !!sel.getClientRects().length, value: sel.value, chosen: sel.selectedOptions[0]?.innerText.trim() || null, options: [...sel.options].map((o) => `${o.value}:${o.innerText.trim()}`)} : null;
            const group = [...el.querySelectorAll('fieldset, [role="group"]')].find((f) => /Issue Assignment/.test(f.innerText));
            return {radios, issue, groupText: group ? group.innerText.replace(/\s+/g, ' ').trim().slice(0, 500) : null};
        }).catch((e) => ({error: String(e.message).slice(0, 200)}));
    }
    async function pickIssue(scope, re) {
        const sel = scope.locator('select[name="issueId"]').first();
        await sel.waitFor({state: 'visible', timeout: T});
        const opt = sel.locator('option').filter({hasText: re});
        await opt.first().waitFor({state: 'attached', timeout: T});
        await sel.selectOption((await opt.first().getAttribute('value')) || '');
    }
    async function formErrors() {
        return {
            fieldErrors: (await page.locator('.pkpFieldError:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)),
            goTo: (await page.getByRole('button', {name: /^Go to /}).allInnerTexts().catch(() => [])).map((x) => flat(x, 120)),
            summary: (await page.locator('.pkpFormErrors:visible, .pkpFormPage__errors:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)),
            status: (await page.locator('.pkpFormPage__status:visible, [role="status"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)).filter(Boolean),
            notices: (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)),
        };
    }
    /** "Save" on the shown Publication page form; returns the write(s), errors and the status line. */
    async function saveForm() {
        const t0 = Date.now();
        const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 12000}).catch(() => null);
        const btn = wf().getByRole('button', {name: 'Save', exact: true}).last();
        const enabled = await btn.isEnabled().catch(() => null);
        await btn.click({timeout: 10000}).catch((e) => log('save click', flat(e.message, 120)));
        const r = await w;
        await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 6000}).catch(() => {});
        await sleep(400);
        const errs = await formErrors();
        await idle(page);
        return {saveEnabled: enabled, response: r ? r.status() : null, writes: netSince(t0), ...errs, jsDialogs: dialogsSince(t0)};
    }

    // ---- publishing
    const panelLoc = () => page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
    const windowLoc = () => page.getByRole('dialog').filter({hasText: WINDOW_RE}).last();
    /** Press the publish button; returns what opened ('panel' | 'window' | 'none') and its label. */
    async function pressPublish() {
        const button = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: PUBLISH_RE});
        await button.first().waitFor({timeout: T});
        const label = flat(await button.first().innerText(), 60);
        const t0 = Date.now();
        await button.first().click();
        const stage = panelLoc().locator('select[name="versionStage"]');
        const any = stage.or(windowLoc()).first();
        let ok = await any.waitFor({state: 'visible', timeout: 6000}).then(() => true).catch(() => false);
        let retried = false;
        if (!ok) { retried = true; await button.first().click().catch(() => {}); ok = await any.waitFor({state: 'visible', timeout: T}).then(() => true).catch(() => false); }
        await idle(page);
        await sleep(1200);
        const opened = (await stage.isVisible().catch(() => false)) ? 'panel' : (await windowLoc().isVisible().catch(() => false)) ? 'window' : 'none';
        return {label, opened, retried, traffic: netSince(t0, true)};
    }
    async function readPanel() {
        const p = panelLoc();
        const sel = async (n) => p.locator(`select[name="${n}"]`).evaluate((s) => ({value: s.value, chosen: s.selectedOptions[0]?.innerText.trim() || null, options: [...s.options].map((o) => `${o.value}:${o.innerText.trim()}${o.disabled ? ' (disabled)' : ''}`)})).catch(() => null);
        return {versionStage: await sel('versionStage'), versionIsMinor: await sel('versionIsMinor'), updateType: await sel('updateType'), assign: await readAssign(p), text: flat(await p.innerText().catch(() => null), 1200)};
    }
    async function readWindow() {
        const w = windowLoc();
        return w.evaluate((el) => ({
            text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 1500),
            buttons: [...el.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
            selects: [...el.querySelectorAll('select')].map((s) => ({name: s.name, value: s.value})),
        })).catch((e) => ({error: String(e.message).slice(0, 200)}));
    }
    /** Confirm the panel as it stands (filling only an empty stage/significance); returns the window read. */
    async function confirmPanel(name) {
        const p = panelLoc();
        const st = p.locator('select[name="versionStage"]');
        const filled = {};
        if (!(await st.inputValue().catch(() => ''))) { await st.selectOption('VoR'); filled.versionStage = 'VoR'; }
        const mi = p.locator('select[name="versionIsMinor"]');
        if ((await mi.count()) && !(await mi.inputValue().catch(() => ''))) { await mi.selectOption('false'); filled.versionIsMinor = 'false'; }
        const t0 = Date.now();
        await p.getByRole('button', {name: 'Confirm', exact: true}).click();
        const ok = await windowLoc().waitFor({timeout: 20000}).then(() => true).catch(() => false);
        await idle(page); await sleep(900);
        const out = {filled, windowShown: ok, writes: netSince(t0), panelStillOpen: await p.isVisible().catch(() => false), errors: ok ? null : await formErrors()};
        if (ok) out.window = await readWindow();
        await snap(name, out);
        return out;
    }
    /** In an open publish window: fill an empty stage (OMP), press the confirm button; the result. */
    async function confirmWindow(name) {
        const w = windowLoc();
        const st = w.locator('select[name="versionStage"]');
        if ((await st.count()) && !(await st.inputValue().catch(() => ''))) await st.selectOption('VoR').catch(() => {});
        const mi = w.locator('select[name="versionIsMinor"]');
        if ((await mi.count()) && !(await mi.inputValue().catch(() => ''))) await mi.selectOption('false').catch(() => {});
        const read = await readWindow();
        const btn = (read.buttons || []).find((b) => PUBLISH_RE.test(b));
        if (!btn) { await w.getByRole('button', {name: /^(Cancel|Close)$/}).last().click().catch(() => {}); return {read, confirmed: false}; }
        const t0 = Date.now();
        const resp = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: btn, exact: true}).click();
        const r = await resp;
        await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Unpublish|Unschedule|Unpost)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
        const out = {read, pressed: btn, publish: r ? r.status() : null, writes: netSince(t0), after: await readout()};
        await snap(name, out);
        return out;
    }
    async function closeWindow() {
        const w = windowLoc();
        await w.getByRole('button', {name: /^(Cancel|Close)$/}).last().click().catch(() => {});
        await w.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
        await sleep(700);
    }

    // ---- versions
    async function versionDialog(name) {
        await page.getByRole('link', {name: 'Create New Version', exact: true}).click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Which version should metadata be copied from?'}).last();
        await dlg.locator('select[name="versionStage"]').waitFor({timeout: T});
        await idle(page); await sleep(1200);
        const sel = async (n) => dlg.locator(`select[name="${n}"]`).evaluate((s) => ({value: s.value, chosen: s.selectedOptions[0]?.innerText.trim() || null, disabled: s.disabled, options: [...s.options].map((o) => `${o.value}:${o.innerText.trim()}${o.disabled ? ' (disabled)' : ''}`)})).catch(() => null);
        const read = {versionSource: await sel('versionSource'), versionStage: await sel('versionStage'), versionIsMinor: await sel('versionIsMinor'), text: flat(await dlg.innerText(), 600)};
        await snap(name, read);
        return {dlg, read};
    }
    async function confirmVersion(dlg, name) {
        const t0 = Date.now();
        const w = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
        const r = await w;
        let id = null, body = null;
        try { body = await r.json(); id = body.id; } catch { /* */ }
        await dlg.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
        await idle(page); await sleep(1500);
        const out = {post: r ? r.status() : null, id, created: body ? {status: body.status, versionStage: body.versionStage, versionMajor: body.versionMajor, versionMinor: body.versionMinor, issueId: body.issueId} : null, stillOpen: await dlg.isVisible().catch(() => false), errors: await formErrors(), readout: await readout(), url: page.url().replace(/^.*\?/, ''), writes: netSince(t0)};
        await snap(name, out);
        return out;
    }

    // ---- Production Ready Files {OJS OMP}
    async function openProduction(ctxPath, id, name) {
        await openWf(ctxPath, id, 'workflow_5');
        await page.getByRole('table', {name: 'Production Ready Files'}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(500);
        return snap(name);
    }
    async function uploadProd(file) {
        const table = page.getByRole('table', {name: 'Production Ready Files'}).first();
        const panel = page.locator('div').filter({has: table}).filter({has: page.getByRole('button', {name: 'Upload', exact: true})}).last();
        await panel.getByRole('button', {name: 'Upload', exact: true}).first().click();
        const wiz = page.getByRole('dialog', {name: 'Upload a Production Ready File'});
        await wiz.waitFor({timeout: T});
        const genre = wiz.locator('select[id^="genreId"]');
        await genre.waitFor({state: 'visible', timeout: T});
        await idle(page);
        await genre.selectOption({label: isOMP ? 'Book Manuscript' : 'Article Text'});
        await wiz.locator('input[type="file"]').last().setInputFiles(file);
        await wiz.getByRole('button', {name: /Change File/}).waitFor({timeout: T});
        await wiz.getByRole('button', {name: 'Continue', exact: true}).click();
        await wiz.getByRole('tab', {name: '2. Review Details'}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T});
        await wiz.getByRole('button', {name: 'Continue', exact: true}).click();
        await wiz.getByRole('tab', {name: '3. Confirm'}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T});
        await wiz.getByRole('button', {name: 'Complete', exact: true}).click();
        await wiz.waitFor({state: 'hidden', timeout: T});
        await idle(page);
        await table.getByRole('row').filter({hasText: path.basename(file)}).first().waitFor({timeout: T});
    }
    async function sendToEditorPicker(fileName, name) {
        const table = page.getByRole('table', {name: 'Production Ready Files'}).first();
        const row = table.locator('tbody tr').filter({hasText: fileName}).first();
        await row.waitFor({timeout: T});
        await row.getByRole('button', {name: /More Actions/}).first().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000});
        const items = (await page.getByRole('menuitem').allInnerTexts()).map((x) => flat(x, 60));
        const out = {items};
        if (!items.includes('Send to Text Editor')) { await row.getByRole('button', {name: /More Actions/}).first().click().catch(() => {}); return out; }
        await page.getByRole('menuitem', {name: 'Send to Text Editor', exact: true}).click();
        const dlg = page.getByRole('dialog', {name: 'Send File to Text Editor'});
        await dlg.locator('select[name="sendToVersion"]').waitFor({timeout: T});
        await idle(page); await sleep(800);
        out.picker = await dlg.locator('select[name="sendToVersion"]').evaluate((s) => ({value: s.value, options: [...s.options].map((o) => ({value: o.value, text: o.innerText.trim()}))}));
        out.text = flat(await dlg.innerText(), 600);
        await snap(name, out);
        await loc(page, '"Send File to Text Editor": the version picker', dlg.locator('select[name="sendToVersion"]'));
        await dlg.getByRole('button', {name: 'Cancel', exact: true}).click();
        await dlg.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
        await sleep(700);
        return out;
    }

    const mailsTo = async (addr) => {
        try {
            const r = await app.mail._get('/api/v1/search', {query: `to:"${addr}"`, limit: '50'});
            return (r.messages || []).map((m) => ({subject: m.Subject, from: m.From ? `${m.From.Name} <${m.From.Address}>` : null, id: m.ID, created: m.Created}));
        } catch (e) { return `error ${flat(e.message, 120)}`; }
    };
    const email = (u) => `${u}@mail.test`;

    try {
        // ================================================================ L95 {OJS}
        if (on('l95') && isOJS) {
            for (const [k, futureRe] of [['A', /Vol\. 1 No\. 2 \(2027\)/], ['B', /Vol\. 1 No\. 1 \(2027\)/]]) {
                await step(`l95-${k}`, async (o) => {
                    const C = S[k], s = C.subs['95'];
                    await as(C.mg, C.path);
                    await openWf(C.path, s.id, `publication_${s.pub}_issue`, `l95-${k}-01-settings-arrive`);
                    const d = wf();
                    await d.locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: T});
                    await idle(page); await sleep(1500);
                    o.arrive = await readAssign(d);
                    o.arriveTraffic = net.filter((x) => /issueAssignmentStatus/.test(x.url)).slice(-2).map(({at, ...x}) => x);
                    o.readoutArrive = await readout();
                    if (k === 'A') await loc(page, 'Publication Settings: "Assign To Future Issue and Schedule Only" radio', d.getByRole('radio', {name: 'Assign To Future Issue and Schedule Only'}));
                    await d.getByRole('radio', {name: 'Assign To Future Issue and Schedule Only'}).check();
                    await pickIssue(d, futureRe);
                    await sleep(300);
                    o.picked = await readAssign(d);
                    o.save = await saveForm();
                    o.samePage = await readAssign(d);
                    await snap(`l95-${k}-02-saved`, o.save);
                    o.dbAfterSave = dbPub(s.pub);
                    await openWf(C.path, s.id, `publication_${s.pub}_issue`);
                    await d.locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: T});
                    await idle(page); await sleep(1500);
                    o.reload = await readAssign(d);
                    await snap(`l95-${k}-03-reloaded`, o.reload);
                    // the publish button
                    o.press = await pressPublish();
                    if (o.press.opened === 'panel') {
                        await page.waitForFunction(() => true); await sleep(800);
                        o.panel = await readPanel();
                        await snap(`l95-${k}-04-panel`, o.panel);
                        o.confirm = await confirmPanel(`l95-${k}-05-window`);
                    } else if (o.press.opened === 'window') {
                        o.window = await readWindow();
                        await snap(`l95-${k}-05-window`, o.window);
                    }
                    if (await windowLoc().isVisible().catch(() => false)) o.result = await confirmWindow(`l95-${k}-06-after`);
                    o.dbEnd = dbPub(s.pub);
                    o.readoutEnd = await readout();
                });
            }
        }

        // ================================================================ L112 {OJS}
        if (on('l112') && isOJS) {
            const runs = [['A', '112m', 'mg'], ['A', '112s', 'se'], ['B', '112', 'mg'], ['E', '112', 'mg']];
            for (const [k, sk, role] of runs) {
                await step(`l112-${k}-${role}`, async (o) => {
                    const C = S[k], s = C.subs[sk];
                    await as(C[role], C.path);
                    const nm = `l112-${k}-${role}`;
                    await openWf(C.path, s.id, `publication_${s.pub}_issue`, `${nm}-01-arrive`);
                    const d = wf();
                    const hasGroup = await d.locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: 12000}).then(() => true).catch(() => false);
                    await idle(page); await sleep(1500);
                    o.readout = await readout();
                    o.menu = (await page.getByRole('link').allInnerTexts().catch(() => [])).map((x) => flat(x, 50)).filter((x) => /Publication Settings|Title & Abstract|Galleys|Issue|Contributors/.test(x));
                    o.heading = (await d.locator('h1, h2').allInnerTexts().catch(() => [])).map((x) => flat(x, 80));
                    o.hasGroup = hasGroup;
                    o.arrive = await readAssign(d);
                    o.fields = await d.evaluate((el) => [...el.querySelectorAll('input, select, textarea')].filter((x) => x.getClientRects().length && x.type !== 'hidden').map((x) => `${x.tagName.toLowerCase()}[name=${x.name}]${x.type === 'radio' || x.type === 'checkbox' ? (x.checked ? '(on)' : '(off)') : `=${String(x.value).slice(0, 30)}`}${x.disabled ? ' disabled' : ''}`)).catch(() => []);
                    const pages = d.locator('input[name="pages"]');
                    o.pagesPresent = await pages.count();
                    if (!o.pagesPresent) { o.note = 'no Pages field'; return; }
                    await pages.fill('11-22');
                    o.save1 = await saveForm();
                    await snap(`${nm}-02-pages-save`, o.save1);
                    o.db1 = dbPub(s.pub);
                    if (hasGroup) {
                        await d.getByRole('radio', {name: "Don't Assign To An Issue"}).check();
                        await sleep(400);
                        o.afterNoIssuePick = await readAssign(d);
                        o.save2 = await saveForm();
                        await snap(`${nm}-03-noissue-save`, o.save2);
                        o.db2 = dbPub(s.pub);
                    }
                    await openWf(C.path, s.id, `publication_${s.pub}_issue`);
                    await d.locator('input[name="pages"]').waitFor({state: 'visible', timeout: T}).catch(() => {});
                    await idle(page); await sleep(1500);
                    o.reload = {assign: await readAssign(d), pages: await d.locator('input[name="pages"]').inputValue().catch(() => null)};
                    await snap(`${nm}-04-reloaded`, o.reload);
                    // left once with an unsaved change (manager on A only)
                    if (k === 'A' && role === 'mg') {
                        await d.locator('input[name="pages"]').fill('99-100');
                        await d.locator('input[name="pages"]').blur();
                        const t0 = Date.now();
                        await page.getByRole('link', {name: 'Title & Abstract', exact: true}).last().click();
                        await sleep(1500); await idle(page);
                        o.leave = {jsDialogs: dialogsSince(t0), dialogs: (await page.locator(vis).allInnerTexts().catch(() => [])).map((x) => flat(x, 200)), url: page.url().replace(/^.*\?/, '')};
                        await snap(`${nm}-05-left-unsaved`, o.leave);
                        await page.getByRole('link', {name: 'Publication Settings', exact: true}).last().click().catch(() => {});
                        await sleep(1500); await idle(page);
                        o.leave.back = await d.locator('input[name="pages"]').inputValue().catch(() => null);
                        await snap(`${nm}-06-back`, {pages: o.leave.back});
                    }
                });
            }
        }

        // ================================================================ L112x {OJS}: journal B's silent save, read back
        // A save of another field on a future-issues-only journal posts the hidden default choice; what the page,
        // a reload and the publish panel then show.
        if (on('l112x') && isOJS) {
            await step('l112x-B', async (o) => {
                const C = S.B;
                if (!C.subs['112x']) {
                    const r = await app.api.createSubmission({tag: `${S.t}B112x`, context: C.path, submitter: C.au, title: `I28 B112x ${S.t}`, decisions: ['skipExternalReview', 'sendToProduction']});
                    C.subs['112x'] = {id: r.submissionId, pub: r.publicationId};
                    save();
                }
                const s = C.subs['112x'];
                await as(C.mg, C.path);
                await openWf(C.path, s.id, `publication_${s.pub}_issue`, 'l112x-B-01-arrive');
                const d = wf();
                await d.locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(1500);
                o.arrive = await readAssign(d);
                await d.locator('input[name="pages"]').fill('5-9');
                o.save = await saveForm();
                o.samePage = await readAssign(d);
                await snap('l112x-B-02-saved', o.save);
                o.db = dbPub(s.pub);
                await openWf(C.path, s.id, `publication_${s.pub}_issue`);
                await d.locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(1500);
                o.reload = await readAssign(d);
                await snap('l112x-B-03-reloaded', o.reload);
                o.press = await pressPublish();
                if (o.press.opened === 'panel') {
                    o.panel = await readPanel();
                    await snap('l112x-B-04-panel', o.panel);
                    await panelLoc().getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
                } else if (o.press.opened === 'window') {
                    o.window = await readWindow();
                    await snap('l112x-B-04-window', o.window);
                    await closeWindow();
                }
            });
        }

        // ================================================================ L105 {OJS}
        if ((on('l105') || on('l105c')) && isOJS) {
            // 105c: scenario 5's shape — an article published WITHOUT an issue on a journal that has issues
            if (!S.A.subs['105c']) {
                const r = await app.api.createSubmission({tag: `${S.t}A105c`, context: S.A.path, submitter: S.A.au, title: `I28 A105c ${S.t}`, decisions: ['skipExternalReview', 'sendToProduction'], published: true});
                S.A.subs['105c'] = {id: r.submissionId, pub: r.publicationId};
                save();
            }
            for (const sk of on('l105') ? ['105a', '105b', '105c'] : ['105c']) {
                await step(`l105-${sk}`, async (o) => {
                    const C = S.A, s = C.subs[sk];
                    await as(C.mg, C.path);
                    await openWf(C.path, s.id, `publication_${s.pub}_titleAbstract`, `l105-${sk}-01-published`);
                    o.before = await readout();
                    o.dbBefore = dbPubs(s.id);
                    const {dlg, read} = await versionDialog(`l105-${sk}-02-version-dialog`);
                    o.dialog = read;
                    o.created = await confirmVersion(dlg, `l105-${sk}-03-new-version`);
                    const nid = o.created.id;
                    if ((sk === '105b' || sk === '105c') && nid) {
                        await openWf(C.path, s.id, `publication_${nid}_issue`, `l105-${sk}-04-settings`);
                        const d = wf();
                        await d.locator('select[name="updateType"]').waitFor({state: 'visible', timeout: T});
                        await idle(page); await sleep(1200);
                        o.settingsArrive = await readAssign(d);
                        o.updateTypeOptions = await d.locator('select[name="updateType"] option').allInnerTexts();
                        await d.locator('select[name="updateType"]').selectOption({label: 'Correction'});
                        o.save = await saveForm();
                        await snap(`l105-${sk}-05-settings-saved`, o.save);
                        o.dbAfterSave = dbPub(nid);
                    }
                    if (nid) {
                        const t0 = Date.now();
                        await openWf(C.path, s.id, `publication_${nid}_titleAbstract`, `l105-${sk}-06-new-version-page`);
                        o.newReadout = await readout();
                        o.newVersionGets = netSince(t0, true).filter((x) => x.m === 'GET' && new RegExp(`/publications/${nid}(\\?|$)`).test(x.url)).slice(-2);
                        o.dbNew = dbPub(nid);
                        o.press = await pressPublish();
                        if (o.press.opened === 'panel') {
                            o.panel = await readPanel();
                            await snap(`l105-${sk}-07-panel`, o.panel);
                            o.confirm = await confirmPanel(`l105-${sk}-08-window`);
                        } else if (o.press.opened === 'window') {
                            o.window = await readWindow();
                            await snap(`l105-${sk}-08-window`, o.window);
                        }
                        if (await windowLoc().isVisible().catch(() => false)) o.result = await confirmWindow(`l105-${sk}-09-after`);
                        o.dbEnd = dbPubs(s.id);
                    }
                });
            }
        }

        // ================================================================ L107 {OJS OMP}
        if (on('l107') && (isOJS || isOMP)) {
            const K = isOJS ? 'A' : 'M';
            await step('l107-published', async (o) => {
                const C = S[K], s = C.subs['107'];
                await as(C.mg, C.path);
                await openProduction(C.path, s.id, 'l107-01-production');
                await uploadProd(DOCX);
                await snap('l107-02-uploaded');
                await openWf(C.path, s.id, `publication_${s.pub}_titleAbstract`);
                o.before = await readout();
                const v1 = await versionDialog('l107-03-dialog-staged');
                o.dialog1 = v1.read;
                o.v11 = await confirmVersion(v1.dlg, 'l107-04-vor11');
                // a second version with the stage emptied, if the dialog allows it
                await openWf(C.path, s.id, `publication_${o.v11.id || s.pub}_titleAbstract`);
                const v2 = await versionDialog('l107-05-dialog-nostage');
                o.dialog2 = v2.read;
                const st = v2.dlg.locator('select[name="versionStage"]');
                const empty = await st.evaluate((x) => [...x.options].some((op) => op.value === ''));
                o.emptyStageOption = empty;
                if (empty) {
                    await st.selectOption('');
                    await sleep(500);
                    o.dialog2b = {stage: await st.inputValue(), minor: await v2.dlg.locator('select[name="versionIsMinor"]').evaluate((x) => ({value: x.value, disabled: x.disabled, options: [...x.options].map((op) => `${op.value}:${op.innerText.trim()}${op.disabled ? ' (disabled)' : ''}`)})).catch(() => null)};
                    o.v2 = await confirmVersion(v2.dlg, 'l107-06-nostage');
                } else {
                    await v2.dlg.getByRole('button', {name: 'Cancel', exact: true}).click();
                }
                o.dbVersions = dbPubs(s.id);
                await openProduction(C.path, s.id, 'l107-07-production-again');
                o.picker = await sendToEditorPicker('k3-figure.docx', 'l107-08-picker');
            });
            await step('l107-unpublished', async (o) => {
                const C = S[K], s = C.subs['107u'];
                await as(C.mg, C.path);
                await openProduction(C.path, s.id, 'l107u-01-production');
                await uploadProd(DOCX);
                await openWf(C.path, s.id, `publication_${s.pub}_titleAbstract`, 'l107u-02-v1');
                o.before = await readout();
                const ids = [];
                for (const n of [1, 2]) {
                    const v = await versionDialog(`l107u-03-dialog-${n}`);
                    o[`dialog${n}`] = v.read;
                    const c = await confirmVersion(v.dlg, `l107u-04-created-${n}`);
                    o[`created${n}`] = c;
                    ids.push(c.id);
                }
                o.dbVersions = dbPubs(s.id);
                await openProduction(C.path, s.id, 'l107u-05-production-again');
                o.picker = await sendToEditorPicker('k3-figure.docx', 'l107u-06-picker');
            });
        }

        // ================================================================ L109 {OJS}
        if (on('l109') && isOJS) {
            await step('l109', async (o) => {
                const C = S.C;
                await as(C.mg, C.path);
                o.contact = sql(`select setting_name, setting_value from journal_settings where journal_id=(select journal_id from journals where path='${C.path}') and setting_name in ('contactName','contactEmail','supportName','supportEmail') order by 1`);
                o.dbC1Before = dbPub(C.subs['1'].pub);
                await page.goto(cUrl(C.path, '/manageIssues')); await idle(page);
                await page.getByRole('tab', {name: 'Future Issues', exact: true}).click(); await idle(page);
                const panel = page.getByRole('tabpanel', {name: 'Future Issues'});
                await panel.locator('table').first().waitFor({timeout: T});
                await idle(page); await sleep(400);
                await snap('l109-01-future-issues');
                const row = panel.locator('tr.gridRow').filter({hasText: 'Vol. 1 No. 1 (2027)'}).first();
                await row.locator('a.show_extras').first().click();
                const ctl = row.locator('xpath=following-sibling::tr[1]');
                await ctl.getByRole('link', {name: 'Publish Issue', exact: true}).click();
                const d = page.locator(vis).last();
                await d.locator('#sendIssueNotification').waitFor({timeout: T});
                await idle(page);
                o.window = {text: flat(await d.innerText(), 600), boxArrives: await d.locator('#sendIssueNotification').isChecked()};
                await snap('l109-02-publish-issue-window', o.window);
                const t0 = Date.now();
                const w = page.waitForResponse((r) => r.request().method() === 'POST' && /publish-issue|publishIssue/i.test(r.url()), {timeout: T}).catch(() => null);
                await d.getByRole('button', {name: 'OK', exact: true}).click();
                const r = await w;
                o.publishIssue = r ? r.status() : null;
                await idle(page); await sleep(1200);
                await snap('l109-03-after-publish-issue');
                o.dbC1After = dbPub(C.subs['1'].pub);
                o.jobs = flat(JSON.stringify(await drainJobs(app)), 300);
                await sleep(2000);
                o.mailAuthor = await mailsTo(email(C.au));
                const pp = (Array.isArray(o.mailAuthor) ? o.mailAuthor : []).find((m) => m.subject === 'Publication Published');
                if (pp) {
                    const full = await app.mail.fullMessage(pp.id);
                    o.ppIssue = {from: full.From, to: full.To, replyTo: full.ReplyTo, subject: full.Subject, text: flat(full.Text, 600)};
                }
                o.mailPC = await mailsTo(C.pc);
                o.mailMg = await mailsTo(email(C.mg));
                o.ms = Date.now() - t0;
                // control: C2 published from its workflow, "Don't Assign To An Issue"
                const s2 = C.subs['2'];
                await openWf(C.path, s2.id, `publication_${s2.pub}_titleAbstract`, 'l109-04-c2-workflow');
                o.c2press = await pressPublish();
                if (o.c2press.opened === 'panel') {
                    const p = panelLoc();
                    o.c2panel = await readPanel();
                    const noIssue = p.getByRole('radio', {name: "Don't Assign To An Issue"});
                    if (await noIssue.count()) { await noIssue.check(); await sleep(400); }
                    o.c2confirm = await confirmPanel('l109-05-c2-window');
                }
                if (await windowLoc().isVisible().catch(() => false)) o.c2result = await confirmWindow('l109-06-c2-published');
                o.jobs2 = flat(JSON.stringify(await drainJobs(app)), 300);
                await sleep(2000);
                o.mailAuthor2 = await mailsTo(email(C.av));
                const pp2 = (Array.isArray(o.mailAuthor2) ? o.mailAuthor2 : []).find((m) => m.subject === 'Publication Published');
                if (pp2) {
                    const full = await app.mail.fullMessage(pp2.id);
                    o.ppDirect = {from: full.From, to: full.To, replyTo: full.ReplyTo, subject: full.Subject, text: flat(full.Text, 400)};
                }
            });
        }

        // ================================================================ L141 {OJS OMP OPS}
        // l141p: the public-API end ({OJS OMP}): a verified contributor under "Public API", published without an issue
        if (on('l141p') && (isOJS || isOMP) && !S.P) {
            const p = `${S.t}P`;
            const c = await app.api.createContext({tag: p, orcid: {enabled: true, apiType: 'publicSandbox'},
                users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}],
                context: {acronym: isOMP ? 'PKP' : 'JPK', contactName: 'Pat Principal', contactEmail: `${p}pc@mail.test`}});
            S.P = {path: c.path, mg: `${p}mg`, au: `${p}au`, pc: `${p}pc@mail.test`, subs: {}};
            const r = await app.api.createSubmission({tag: `${p}orc`, context: c.path, submitter: `${p}au`, title: `I28 Porc ${S.t}`, decisions: ['skipExternalReview', 'sendToProduction'], author: {orcid: 'https://orcid.org/0000-0001-5109-3700', orcidIsVerified: true}});
            S.P.subs.orc = {id: r.submissionId, pub: r.publicationId};
            save();
        }
        if (on('l141') || on('l141p')) {
            const tbl = isOJS ? 'journal' : isOMP ? 'press' : 'server';
            let cases = isOJS ? [['E', 'orc', 'au', null], ['E', 'plain', 'av', null], ['G', 'orc', 'au', /Vol\. 1 No\. 1 \(2025\)/]] : [[S.O, 'orc', 'au', null]];
            if (!on('l141')) cases = [];
            if (on('l141p') && S.P) cases.push(['P', 'orc', 'au', null]);
            for (const [k, sk, who2, backRe] of cases) {
                await step(`l141-${k}-${sk}`, async (o) => {
                    const C = S[k], s = C.subs[sk];
                    const nm = `l141-${k}-${sk}`;
                    await as(C.mg, C.path);
                    o.author = sql(`select a.author_id, (select setting_value from author_settings x where x.author_id=a.author_id and x.setting_name='orcid' limit 1), (select setting_value from author_settings x where x.author_id=a.author_id and x.setting_name='orcidIsVerified' limit 1), (select count(*) from author_settings x where x.author_id=a.author_id and x.setting_name='orcidAccessToken') from authors a where a.publication_id=${s.pub}`);
                    o.orcidSettings = sql(`select setting_name, setting_value from ${tbl}_settings where ${tbl}_id=(select ${tbl}_id from ${tbl === 'press' ? 'presses' : tbl + 's'} where path='${C.path}') and setting_name like 'orcid%' and setting_name not like '%Secret%' order by 1`);
                    const max0 = sql('select coalesce(max(id),0) from jobs');
                    const fmax0 = sql('select coalesce(max(id),0) from failed_jobs');
                    const jobList = (t, m) => sql(`select id, queue, substring(payload from '"displayName":"([^"]+)"') from ${t} where id > ${m} order by id`);
                    await openWf(C.path, s.id, `publication_${s.pub}_titleAbstract`, `${nm}-01-workflow`);
                    o.press = await pressPublish();
                    if (o.press.opened === 'panel') {
                        o.panel = await readPanel();
                        const p = panelLoc();
                        if (backRe) {
                            const back = p.getByRole('radio', {name: 'Assign To Current/Back Issue'});
                            if (await back.count()) { await back.check(); await pickIssue(p, backRe); await sleep(400); }
                        } else {
                            const noIssue = p.getByRole('radio', {name: "Don't Assign To An Issue"});
                            if (await noIssue.count()) { await noIssue.check(); await sleep(400); }
                        }
                        o.confirm = await confirmPanel(`${nm}-02-window`);
                    } else if (o.press.opened === 'window') {
                        o.window = await readWindow();
                        await snap(`${nm}-02-window`, o.window);
                    }
                    if (await windowLoc().isVisible().catch(() => false)) o.result = await confirmWindow(`${nm}-03-published`);
                    await sleep(1500);
                    o.windowStillOpen = await windowLoc().isVisible().catch(() => false);
                    o.newJobs = jobList('jobs', max0);
                    o.newFailed = jobList('failed_jobs', fmax0);
                    o.dbPub = dbPub(s.pub);
                    o.dbSubmission = sql(`select status, stage_id, current_publication_id from submissions where submission_id=${s.id}`);
                    // the same page after a reload
                    await openWf(C.path, s.id, `publication_${s.pub}_titleAbstract`, `${nm}-04-reloaded`);
                    o.reload = await readout();
                    o.drain = flat(JSON.stringify(await drainJobs(app)), 300);
                    await sleep(2000);
                    o.failedAfterDrain = sql(`select id, queue, substring(payload from '"displayName":"([^"]+)"'), left(exception, 200) from failed_jobs where id > ${fmax0} order by id`);
                    o.mailAuthor = await mailsTo(email(C[who2]));
                    const pp = (Array.isArray(o.mailAuthor) ? o.mailAuthor : []).find((m) => m.subject === 'Publication Published');
                    if (pp) {
                        const full = await app.mail.fullMessage(pp.id);
                        o.ppDirect = {from: full.From, to: full.To, replyTo: full.ReplyTo, subject: full.Subject};
                    }
                    o.principalContact = C.pc;
                    o.manager = email(C.mg);
                });
            }
        }
    } finally {
        await close();
    }
});
