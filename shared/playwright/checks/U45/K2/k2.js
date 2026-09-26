// U45 claim check, chunk K2: DOIs made in the workflow, versions, issues, peer reviews, the "DOI:" line.
// Spec: docs/specs/U45-dois.md lines 175–190 (Rule 5), 213–229 (Rules 7–8), 233–262 (Rules 10–13, Rule 14's first
// line), 304–311 (Rule 20), 510–525 (Rule 43), 543–544 (Side effects), 574–578 (Setting 6), 601–606 (Setting 12),
// 610–650 (Cross-feature interactions, Canonical scenarios' preamble), register OJS1; footnotes h, q12, j, q15, i, w,
// k, q16, g, m, q25, r, sc, f-ojs1.
//
//   PROBE_FEATURE=U45 PROBE_AGENT=ccK2 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U45/K2/k2.js
//   PHASES=defaults,moments,peer,issue,line,vno,vyes,fallback,status,tabs,xref,leave,final (default: all, this order).
//   State in k2-state-<app>.json under the output folder; each phase seeds its own scratch contexts (tag prefix u45k2)
//   the first time and is guarded, so a phase re-run re-reads without re-doing; RESEED=1 starts afresh.
//   The "final" phase sets "DOI Versioning" back to "No" on every scratch journal this script made (OJS OAI, U19 A22).
// No assertions: the script records, the reader judges. Database reads (psql SELECT) are evidence only.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['defaults', 'moments', 'peer', 'issue', 'line', 'vno', 'vyes', 'fallback', 'status', 'tabs', 'xref', 'refs', 'leave', 'unpub', 'final'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const REPO = path.resolve(__dirname, '../../../../..');
const FIX = {
    ojs: path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf'),
    ops: path.join(REPO, 'apps/ops/playwright/fixtures/files/preprint.pdf'),
};

function headTags(html) {
    const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
    const out = [];
    for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
        const raw = m[0];
        const attr = (n) => { const x = raw.match(new RegExp(`\\s${n}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return x ? (x[2] ?? x[3]) : null; };
        const name = attr('name');
        if (name && /doi|identifier/i.test(name)) out.push(`${name}=${attr('content')}`);
    }
    return out;
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const log = (...a) => console.log(`[k2 ${app.name} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const sf = path.join(outDir(), `k2-state-${app.name}.json`);
    let S = (!process.env.RESEED && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k2-facts', {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 1800)); };
    const done = (k) => (S.done || []).includes(k);
    const markDone = (k) => { S.done = [...new Set([...(S.done || []), k])]; save(); };
    const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php\//, '');
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const KINDS = isOJS ? ['publication', 'representation'] : isOMP ? ['publication', 'chapter', 'representation', 'file'] : ['publication', 'representation'];
    const galley = (label = 'PDF') => (isOMP ? {publicationFormats: [{name: label, file: 'article.pdf'}]} : {galleys: [{label, file: isOPS ? 'preprint.pdf' : 'article.pdf'}]});
    const toReview = isOMP ? ['sendExternalReview'] : ['sendExternalReview'];
    function db(sql) {
        const cfg = fs.readFileSync(app.configFile, 'utf8');
        const sec = cfg.split(/^\[database\]/m)[1] || '';
        const get = (k) => ((sec.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, 'm')) || [])[1] || '').trim().replace(/^"|"$/g, '');
        try {
            return execFileSync('psql', ['-h', get('host') || '127.0.0.1', '-U', get('username'), get('name'), '-At', '-F', '|', '-c', sql],
                {env: {...process.env, PGPASSWORD: get('password')}, encoding: 'utf8', timeout: 20_000}).trim().split('\n').filter(Boolean);
        } catch (e) { return [`ERROR ${flat(e.message, 300)}`]; }
    }
    const repTable = isOMP ? 'publication_formats' : 'publication_galleys';
    const repId = isOMP ? 'publication_format_id' : 'galley_id';
    /** Every version of a submission with its DOI, and each version's galleys / formats with theirs (evidence only). */
    const dbVersions = (sid) => ({
        pubs: db(`select p.publication_id, p.version_stage, p.version_major, p.version_minor, p.status, coalesce(d.doi,'-') from publications p left join dois d on d.doi_id=p.doi_id where p.submission_id=${sid} order by p.publication_id`),
        reps: db(`select r.publication_id, r.${repId}, coalesce(d.doi,'-') from ${repTable} r left join dois d on d.doi_id=r.doi_id where r.publication_id in (select publication_id from publications where submission_id=${sid}) order by r.${repId}`),
        ...(isOMP ? {files: db(`select sf.submission_file_id, sf.file_stage, coalesce(d.doi,'-') from submission_files sf left join dois d on d.doi_id=sf.doi_id where sf.submission_id=${sid} order by 1`)} : {}),
        ...(isOJS ? {reviews: db(`select review_id, is_review_publicly_visible, considered, date_completed is not null, coalesce(d.doi,'-') from review_assignments r left join dois d on d.doi_id=r.doi_id where submission_id=${sid} order by review_id`)} : {}),
        doiStatus: db(`select d.doi, d.status from dois d where d.doi_id in (select doi_id from publications where submission_id=${sid} union select doi_id from ${repTable} where publication_id in (select publication_id from publications where submission_id=${sid}))`),
    });
    const settingsTable = isOJS ? 'journal_settings' : isOMP ? 'press_settings' : 'server_settings';
    const idCol = isOJS ? 'journal_id' : isOMP ? 'press_id' : 'server_id';
    const ctxTable = isOJS ? 'journals' : isOMP ? 'presses' : 'servers';
    const versioningOn = () => db(`select c.path from ${settingsTable} s join ${ctxTable} c on c.${idCol}=s.${idCol} where s.setting_name='doiVersioning' and s.setting_value in ('1','true') and exists (select 1 from ${settingsTable} e where e.${idCol}=s.${idCol} and e.setting_name='enableDois' and e.setting_value in ('1','true'))`);

    await app.api.bootstrapProbe(app.contextPath);

    // ------------------------------------------------------------------ contexts and submissions
    async function mkCtx(key, extra = {}, {reviewers = false} = {}) {
        if (S[key]) return S[key];
        const t = tag(`u45k2${key.toLowerCase()}`);
        const roles = [['mg', ['manager'], 'Mona', 'Manager'], ['se', ['sectionEditor'], 'Sami', 'Section'], ['au', ['author'], 'Ada', 'Author'], ['rd', ['reader'], 'Rosa', 'Reader']];
        if (reviewers && !isOPS) roles.push(['rv1', ['externalReviewer'], 'Rhea', 'Public'], ['rv2', ['externalReviewer'], 'Ravi', 'Private']);
        const {context: cx = {}, ...rest} = extra;
        const res = await app.api.createContext({tag: t, context: {name: `U45 K2 ${key} ${t}`, acronym: 'K2J', contactName: 'K2 Contact', contactEmail: `${t}c@mail.test`, country: 'CA', ...cx},
            users: roles.map(([u, r, g, f]) => ({username: `${t}${u}`, roles: r, givenName: g, familyName: f})), ...rest});
        S[key] = {path: res.path || t, id: res.contextId, issues: res.issues || null, u: Object.fromEntries(roles.map(([u]) => [u, `${t}${u}`])), subs: {}};
        save();
        fact(`seed-${key}`, {path: S[key].path, id: S[key].id, issues: S[key].issues, extra: rest});
        return S[key];
    }
    async function mkSub(C, key, spec) {
        if (C.subs[key]) return C.subs[key];
        const title = spec.title || `K2 ${key} ${C.path}`;
        try {
            const {submitter, ...r} = spec;
            const res = await app.api.createSubmission({tag: `${C.path}${key}`, context: C.path, submitter: submitter || C.u.au, title, ...r});
            C.subs[key] = {id: res.submissionId, pub: res.publicationId, title, stageId: res.stageId, galleys: res.galleys || null, formats: res.publicationFormats || null};
        } catch (e) {
            C.subs[key] = {error: flat(e.message, 500), title};
            log(`[seed ${key}]`, flat(e.message, 400));
        }
        save();
        return C.subs[key];
    }

    // ------------------------------------------------------------------ browsers
    const {page, close} = await launch(app);
    const V = await launch(app);
    const vpage = V.page;
    const bad = [], pageErrors = [], dialogs = [];
    for (const [w, pg] of [['m', page], ['v', vpage]]) {
        pg.on('response', (r) => { if (r.status() >= 400) bad.push({at: Date.now(), w, status: r.status(), m: r.request().method(), url: strip(r.url()).slice(0, 180)}); });
        pg.on('pageerror', (e) => pageErrors.push({at: Date.now(), w, text: flat(e.message, 200), url: strip(pg.url())}));
        pg.on('dialog', async (d) => { dialogs.push({at: Date.now(), w, type: d.type(), message: d.message().slice(0, 200)}); await d.accept().catch(() => {}); });
    }
    const since = (arr, t0) => arr.filter((e) => e.at >= t0).map(({at, ...x}) => x);
    let snapN = S.snapN || 0;
    async function snap(name, extra, {pg = page, png = true} = {}) {
        let s;
        try { s = await screen(pg); } catch (e) { s = {url: pg.url(), text: {}, screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `k2-${String(++snapN).padStart(3, '0')}-${name}`;
        S.snapN = snapN; save();
        record(n, s);
        if (png) await shot(pg, n).catch(() => {});
        s.name = `${n}-${app.name}`;
        return s;
    }
    async function sect(name, fn) {
        if (!on(name)) return;
        const t0 = Date.now();
        log(`== ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 1500));
            await snap(`zz-failed-${name}`).catch(() => {});
        }
        const b = since(bad, t0).filter((r) => r.status >= 500), pe = since(pageErrors, t0);
        if (b.length || pe.length) fact(`${name}.crashes`, {server: b, script: pe});
        const b4 = since(bad, t0).filter((r) => r.status < 500);
        if (b4.length) fact(`${name}.4xx`, b4.slice(0, 40));
        const d = since(dialogs, t0);
        if (d.length) fact(`${name}.dialogs`, d);
        save();
    }
    const go = async (url, pg = page) => { const r = await pg.goto(url).catch((e) => ({err: flat(e.message, 200)})); await idle(pg).catch(() => {}); return r; };
    let who = null;
    const as = async (user, ctx) => { if (who === `${user}@${ctx}`) return; await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); who = `${user}@${ctx}`; };
    const vis = '[role="dialog"]:visible';
    const wf = () => page.locator(vis).first();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    const wfUrl = (ctx, sid, key) => cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    async function openWf(ctx, sid, pub) {
        await go(wfUrl(ctx, sid, pub ? `publication_${pub}_titleAbstract` : null));
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await sleep(1200);
    }
    const wfButtons = async () => (await wf().getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean);

    // ------------------------------------------------------------------ workflow actions
    /** Press a decision button on the workflow and walk the decision page to "Record Decision". */
    async function decide(ctx, sid, button, name, {skipReviewers = false} = {}) {
        await openWf(ctx, sid);
        const out = {buttons: await wfButtons()};
        const b = page.getByRole('button', {name: button, exact: true}).last();
        if (!(await b.isVisible().catch(() => false))) { out.missing = button; await snap(`${name}-nobutton`); return out; }
        await b.click();
        await page.waitForURL(/decision/, {timeout: T}).catch(() => {});
        await idle(page);
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        const cont = page.getByRole('button', {name: 'Continue', exact: true});
        const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
        out.steps = [];
        const skipIfReviewers = async () => {
            const h = flat(await page.getByRole('heading', {level: 1}).first().innerText().catch(() => ''), 80);
            const hs = flat((await page.locator('main h2, main h1').allInnerTexts().catch(() => [])).join(' | '), 200);
            out.steps.push(hs || h);
            if (skipReviewers && /: Notify Reviewers$/i.test(h) && !out.skipped) {
                const sk = page.getByRole('button', {name: /Skip this email/i}).filter({visible: true}).first();
                if (await sk.count()) { await snap(`${name}-reviewers-step`); await sk.click().catch(() => {}); out.skipped = true; await sleep(800); await snap(`${name}-skip-reviewers`); return true; }
            }
        };
        for (let i = 0; i < 6 && !(await rec.isVisible().catch(() => false)); i++) {
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(1500);
            if (await skipIfReviewers()) continue;
            await cont.click().catch(() => {}); await idle(page);
        }
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await sleep(800);
        await skipIfReviewers();
        const wr = page.waitForResponse((x) => /decisions/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await rec.click();
        const rr = await wr;
        await sleep(2500); await idle(page);
        out.status = rr ? rr.status() : null;
        if (rr && rr.status() >= 400) out.body = flat(await rr.text().catch(() => ''), 400);
        const s = await snap(name);
        out.after = flat(s.text.dialog || s.text.main, 300);
        return out;
    }
    async function fillVersion(scope, {minor = false} = {}) {
        const stage = scope.locator('select[name="versionStage"]');
        if (await stage.isVisible().catch(() => false)) { if (!(await stage.inputValue().catch(() => ''))) await stage.selectOption('VoR').catch(() => {}); }
        const m = scope.locator('select[name="versionIsMinor"]');
        if (await m.isVisible().catch(() => false)) { if (!(await m.inputValue().catch(() => ''))) await m.selectOption(minor ? 'true' : 'false').catch(() => {}); }
    }
    /** Publish (OJS "Publish" with no issue, OMP "Publish", OPS "Post") the version open on the workflow. */
    async function publish(ctx, sid, pub, name, {issue, dryRun = false} = {}) {
        await openWf(ctx, sid, pub);
        const out = {};
        const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish|Post)$/}).first();
        await button.waitFor({state: 'visible', timeout: T}).catch(() => {});
        if (!(await button.isVisible().catch(() => false))) { out.noButton = await controls().getByRole('button').allInnerTexts().catch(() => []); await snap(`${name}-nobutton`); return out; }
        out.button = flat(await button.innerText(), 40);
        await sleep(800);
        await button.click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|make this catalog entry public|will not prevent publishing|following requirements/}).last();
        const which = () => Promise.race([
            panel.locator('select[name="versionStage"], input[name="assignment"], button').first().waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
            confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
        ]).catch(() => null);
        let opened = await which();
        if (!opened) { out.secondPress = true; await button.click({timeout: 5_000}).catch(() => {}); opened = await which(); }
        out.opened = opened;
        await idle(page); await sleep(800);
        if (opened === 'panel') {
            await fillVersion(panel);
            if (issue) {
                // the radios' preselection lands with the panel's issue-status fetch (PublishSchedulePages, app-changes row 7): let it settle first
                await sleep(4000); await idle(page);
                const fut = panel.getByRole('radio', {name: /Assign To Future Issue and Schedule Only/i});
                const back = panel.getByRole('radio', {name: /Assign To Current\/Back Issue/i});
                // the first pick misfires on a journal with only future issues (U49 OJS2): pick another choice, then "Schedule Only"
                const imm = panel.getByRole('radio', {name: /Assign To Future Issue and Publish Immediately/i});
                if (await fut.isVisible().catch(() => false)) { await imm.check().catch(() => {}); await sleep(800); await fut.check().catch(() => {}); await sleep(800); } else if (await back.isVisible().catch(() => false)) await back.check().catch(() => {});
                await sleep(600);
                const sel = panel.locator('select[name="issueId"]');
                await sel.waitFor({state: 'visible', timeout: 10000}).catch(() => {});
                const val = await sel.evaluate((s, re) => { const o = [...s.options].find((x) => x.text.includes(re)); return o ? o.value : null; }, issue).catch(() => null);
                out.issueOptions = await sel.evaluate((s) => [...s.options].map((o) => o.text.trim())).catch(() => null);
                if (val) await sel.selectOption(val);
            } else {
                const none = panel.getByRole('radio', {name: /Don't Assign|Do not assign/i});
                if (await none.isVisible().catch(() => false)) await none.check().catch(() => {});
            }
            out.panel = flat(await panel.innerText().catch(() => ''), 900);
            await snap(`${name}-panel`);
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            await confirm.waitFor({state: 'visible', timeout: T}).catch(() => {});
        }
        await idle(page); await sleep(800);
        await fillVersion(confirm);
        out.confirm = flat(await confirm.innerText().catch(() => ''), 900);
        await snap(`${name}-confirm`);
        if (dryRun) { await confirm.getByRole('button', {name: 'Close'}).last().click().catch(() => {}); await sleep(800); return out; }
        const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).last().click().catch((e) => { out.clickErr = flat(e.message, 150); });
        const r = await w;
        out.status = r ? r.status() : null;
        if (r && r.status() >= 400) out.body = flat(await r.text().catch(() => ''), 500);
        await controls().getByRole('button', {name: /^(Unpublish|Unpost|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        out.controls = await controls().getByRole('button').allInnerTexts().catch(() => []);
        await snap(name, {publish: out});
        return out;
    }
    async function unpublish(ctx, sid, pub, name) {
        await openWf(ctx, sid, pub);
        const out = {};
        const b = controls().getByRole('button', {name: /^(Unpublish|Unpost)$/}).first();
        if (!(await b.isVisible().catch(() => false))) { out.noButton = await controls().getByRole('button').allInnerTexts().catch(() => []); return out; }
        await b.click();
        const d = page.getByRole('dialog').filter({hasText: /don't want this to be|unpublish|unpost/i}).last();
        await d.waitFor({timeout: T}).catch(() => {});
        out.dialog = flat(await d.innerText().catch(() => ''), 300);
        const w = page.waitForResponse((r) => /\/unpublish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: /^(Unpublish|Unpost|OK|Yes)$/}).last().click().catch((e) => { out.clickErr = flat(e.message, 150); });
        const r = await w;
        out.status = r ? r.status() : null;
        await sleep(1500); await idle(page);
        out.controls = await controls().getByRole('button').allInnerTexts().catch(() => []);
        await snap(name, {unpublish: out});
        return out;
    }
    /** "Create New Version" on the open workflow; minor: true picks the minor-revision option. */
    async function newVersion(ctx, sid, pub, minor, name) {
        await openWf(ctx, sid, pub);
        const link = wf().getByRole('link', {name: 'Create New Version', exact: true}).or(wf().getByRole('button', {name: 'Create New Version', exact: true})).first();
        await link.waitFor({state: 'visible', timeout: T}).catch(() => {});
        if (!(await link.isVisible().catch(() => false))) return {offered: false};
        await sleep(1200);
        await link.click();
        const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
        await idle(page); await sleep(1000);
        const opts = await w.locator('select').evaluateAll((ss) => ss.map((s) => ({name: s.name, value: s.value, options: [...s.options].map((o) => `${o.value}=${o.text.trim()}`)})));
        const m = w.locator('select[name="versionIsMinor"]');
        if (await m.isVisible().catch(() => false)) {
            const want = await m.evaluate((s, mi) => { const o = [...s.options].find((x) => (mi ? /minor/i : /major/i).test(x.text)); return o ? o.value : null; }, minor);
            if (want !== null) await m.selectOption(want); else await m.selectOption(minor ? 'true' : 'false').catch(() => {});
        }
        const stage = w.locator('select[name="versionStage"]');
        if (!(await stage.inputValue().catch(() => ''))) await stage.selectOption('VoR').catch(() => {});
        await snap(`${name}-window`, {opts});
        const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await r;
        let newPub = null; let v = null;
        if (resp) { try { const j = await resp.json(); newPub = j.id; v = {stage: j.versionStage, major: j.versionMajor, minor: j.versionMinor, doiId: j.doiId}; } catch { /* none */ } }
        await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
        await snap(name);
        return {offered: true, status: resp && resp.status(), newPub, v, opts};
    }

    // ------------------------------------------------------------------ the DOIs page
    async function openDois(ctx, tab) {
        const r = await go(cu(ctx, '/dois'));
        await sleep(800);
        if (tab) { await page.getByRole('tab', {name: tab, exact: true}).click().catch(() => {}); await idle(page); await sleep(800); }
        return r && r.status ? r.status() : null;
    }
    const itemRow = (id, kind = 'submission') => page.locator(`[id="list-item-${kind}-${id}"]`).or(page.locator(`.listPanel__item--doi[id$="-${id}"]:visible`)).first();
    async function expandItem(id, kind) {
        const row = itemRow(id, kind);
        const exp = row.getByRole('button', {name: new RegExp(`details about ${id}$`)}).first();
        const nm = (await exp.getAttribute('aria-label').catch(() => null)) || (await exp.innerText().catch(() => '')) || '';
        if (/Show more/i.test(nm)) { await exp.click().catch(() => {}); await sleep(500); }
        return row;
    }
    async function readItem(id, kind = 'submission') {
        const row = itemRow(id, kind);
        if (!(await row.count())) return {listed: false};
        await expandItem(id, kind);
        return row.evaluate((el) => {
            const t = (x) => (x || '').replace(/\s+/g, ' ').trim();
            const rows = [...el.querySelectorAll('.listPanel__itemExpanded tbody tr')].map((tr) => ({type: t((tr.querySelector('td, th') || {}).innerText), doi: (tr.querySelector('input') || {}).value ?? null, text: t(tr.innerText)}));
            const badges = [...el.querySelectorAll('.pkpBadge, [class*="Badge"], [class*="badge"]')].map((b) => t(b.innerText)).filter(Boolean);
            const buttons = [...el.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => t(b.innerText) + (b.disabled ? ' [disabled]' : ''));
            return {listed: true, text: t(el.innerText).slice(0, 1200), rows, badges: [...new Set(badges)], buttons};
        });
    }
    const toastWatch = async () => page.evaluate(() => {
        window.__k2toasts = [];
        const box = document.body;
        if (window.__k2obs) window.__k2obs.disconnect();
        window.__k2obs = new MutationObserver(() => { for (const n of document.querySelectorAll('.app__notifications *')) { const x = (n.innerText || '').trim(); if (x && !window.__k2toasts.includes(x)) window.__k2toasts.push(x); } });
        window.__k2obs.observe(box, {childList: true, subtree: true, characterData: true});
    }).catch(() => {});
    const toasts = async () => page.evaluate(() => (window.__k2toasts || []).filter((x) => !x.includes('\n'))).catch(() => []);
    /** "Edit" in a scope (an item row or a version block), type into the box of the row labelled `type`, "Save". */
    async function editDoi(scope, type, value, name) {
        await toastWatch();
        const out = {};
        const edit = scope.getByRole('button', {name: 'Edit', exact: true}).first();
        out.editDisabled = await edit.isDisabled().catch(() => null);
        if (out.editDisabled) return out;
        await edit.click(); await sleep(400);
        const box = scope.getByRole('textbox', {name: type, exact: true}).first();
        out.before = await box.inputValue().catch(() => null);
        await box.fill(value);
        const reqs = [];
        const onR = (r) => { if (/\/api\/v1\/(_)?dois/.test(r.url()) && r.request().method() !== 'GET') reqs.push({m: r.request().method(), url: strip(r.url()), status: r.status()}); };
        page.on('response', onR);
        await scope.getByRole('button', {name: 'Save', exact: true}).first().click();
        await sleep(2500); await idle(page);
        page.off('response', onR);
        out.reqs = reqs;
        out.toasts = await toasts();
        out.after = await box.inputValue().catch(() => null);
        if (name) await snap(name, {edit: out});
        return out;
    }
    async function bulk(ids, action, name, kind = 'submission') {
        await toastWatch();
        for (const id of ids) await itemRow(id, kind).getByRole('checkbox').first().check().catch(() => {});
        if (!(await page.locator('.pkpDropdown__action:visible').count())) await page.getByRole('button', {name: /Bulk Actions/}).first().click();
        await sleep(400);
        const b = page.getByRole('button', {name: action, exact: true}).filter({visible: true});
        if (!(await b.count())) { const m = await page.locator('.pkpDropdown__action:visible').allInnerTexts().catch(() => []); return {offered: false, menu: m}; }
        await b.first().click();
        const dlg = page.getByRole('dialog').filter({hasText: action}).last();
        await dlg.waitFor({timeout: T}).catch(() => {});
        const text = flat(await dlg.innerText().catch(() => ''), 400);
        const w = page.waitForResponse((r) => /\/api\/v1\/(_)?dois/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await dlg.getByRole('button', {name: action, exact: true}).click().catch(() => {});
        const r = await w;
        await sleep(2000); await idle(page);
        const out = {offered: true, dialog: text, status: r ? r.status() : null, body: r ? flat(await r.text().catch(() => ''), 300) : null, toasts: await toasts()};
        if (name) await snap(name, {bulk: out});
        return out;
    }
    // Settings › Distribution › "DOIs"
    async function openDoiTab(ctx, sideTab = 'Setup') {
        await go(cu(ctx, '/management/settings/distribution'));
        await page.getByRole('tab', {name: 'DOIs', exact: true}).click({timeout: 15000});
        await idle(page);
        const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
        await dois.getByRole('tab', {name: sideTab, exact: true}).click();
        await idle(page); await sleep(600);
        const panel = dois.getByRole('tabpanel', {name: sideTab, exact: true});
        await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T}).catch(() => {});
        return panel;
    }
    const readPanel = async (panel) => panel.evaluate((root) => {
        const t = (x) => (x || '').replace(/\s+/g, ' ').trim();
        const inputs = [...root.querySelectorAll('input, select')].filter((e) => e.type !== 'hidden').map((e) => {
            const l = e.labels && e.labels[0] ? t(e.labels[0].innerText) : null;
            return {name: e.name, type: e.type, label: l, v: (e.type === 'checkbox' || e.type === 'radio') ? e.checked : e.value, visible: !!e.getClientRects().length};
        });
        return {inputs: inputs.filter((i) => i.visible), text: t(root.innerText).slice(0, 2500)};
    }).catch((e) => ({err: flat(e.message, 200)}));
    async function savePanel(panel) {
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        await sleep(1200);
        return {status: r ? r.status() : null, body: r && r.status() >= 400 ? flat(await r.text().catch(() => ''), 400) : null,
            saved: await page.locator('[role="status"]').filter({hasText: 'Saved'}).count(), errors: await panel.locator('.pkpFieldError').allInnerTexts().catch(() => [])};
    }
    async function setVersioning(ctx, yes, name) {
        const panel = await openDoiTab(ctx, 'Setup');
        const radio = panel.getByRole('radio', {name: yes ? /^Yes, assign a unique DOI/ : /^No, all versions/});
        await radio.check();
        const r = await savePanel(panel);
        await snap(name, {save: r});
        return r;
    }
    // Reader side (a visitor in the second browser)
    const readerPath = (sid, pub) => `${isOJS ? `/article/view/${sid}` : isOMP ? `/catalog/book/${sid}` : `/preprint/view/${sid}`}${pub ? `/version/${pub}` : ''}`;
    async function readDoiLine(ctx, url, name) {
        const resp = await go(cu(ctx, url), vpage);
        const html = resp && resp.text ? await resp.text().catch(() => '') : '';
        const s = await snap(name, null, {pg: vpage});
        const body = s.text.main || s.text.body || (await vpage.locator('body').innerText().catch(() => ''));
        const lines = String(body).split('\n').map((l) => l.trim()).filter((l) => /DOI|doi\.org/.test(l)).slice(0, 8);
        const links = await vpage.locator('a[href*="doi.org"]').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')}))).catch(() => []);
        const labelled = await vpage.locator('.item.doi, section.doi, .doi, [class*="doi"]').evaluateAll((es) => es.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 5)).catch(() => []);
        return {status: resp && resp.status ? resp.status() : null, lines, links, labelled, head: headTags(html), snap: s.name};
    }
    async function oai(ctx, verbQs, name) {
        const resp = await go(cu(ctx, `/oai?${verbQs}`), vpage);
        const text = resp && resp.text ? await resp.text().catch(() => '') : '';
        const out = {status: resp && resp.status ? resp.status() : null, landed: strip(vpage.url()), dois: [...new Set((text.match(/10\.\d{4,9}\/[^<\s"]+/g) || []))].slice(0, 10), error: (text.match(/<error[^>]*>[^<]*<\/error>/) || [null])[0], len: text.length};
        if (name) record(`k2-oai-${name}`, {...out, head: text.slice(0, 1500)});
        return out;
    }
    const sideMenuDois = async () => page.evaluate(() => [...document.querySelectorAll('nav a, [role="navigation"] a')].filter((a) => a.innerText.trim() === 'DOIs').map((a) => ({href: a.getAttribute('href'), visible: !!a.getClientRects().length}))).catch(() => null);

    // ==================================================================== defaults: Setting 6 (arrival), Setting 12
    await sect('defaults', async () => {
        if (done('defaults')) return;
        const D = await mkCtx('D', {});
        await as(D.u.mg, D.path);
        const panel = await openDoiTab(D.path, 'Setup');
        const f = await readPanel(panel);
        fact('defaults-setup-versioning', {radios: f.inputs.filter((i) => i.type === 'radio' && /version/i.test(`${i.name} ${i.label}`)), all: f.inputs.map((i) => `${i.label}=${i.v}`)});
        await snap('defaults-setup-arrival');
        await loc(page, 'DOIs › Setup: "DOI Versioning" Yes radio', panel.getByRole('radio', {name: /^Yes, assign a unique DOI/}));
        await loc(page, 'DOIs › Setup: "DOI Versioning" No radio', panel.getByRole('radio', {name: /^No, all versions/}));
        if (!isOPS) {
            // Setting 12: Settings › Workflow › Review, the public-visibility default on a new context
            await go(cu(D.path, '/management/settings/workflow'));
            await page.getByRole('tab', {name: 'Review', exact: true}).first().click().catch(() => {});
            await idle(page); await sleep(1000);
            const rp = page.locator('[role="tabpanel"]:visible').first();
            const txt = flat(await rp.innerText().catch(() => ''), 3000);
            const box = page.getByRole('checkbox', {name: /publicly visible|Publicly Show/i});
            fact('defaults-review-public', {present: await box.count(), checked: (await box.count()) ? await box.first().isChecked() : null,
                heading: /Publicly Show Reviewer Comments/.test(txt), label: flat(await box.first().evaluate((e) => (e.labels && e.labels[0] ? e.labels[0].innerText : e.closest('label')?.innerText || '')).catch(() => null), 200)});
            await snap('defaults-review-settings');
        }
        markDone('defaults');
    });

    // ==================================================================== moments: Rule 5 (q12), Cross-feature 627
    await sect('moments', async () => {
        const out = S.moments = S.moments || {};
        const M = await mkCtx('M', {doiPrefix: '10.1234', enabledDoiTypes: KINDS}, {reviewers: true});
        const M0 = await mkCtx('M0', {}); // the arrival state: DOIs on, the first kind, no prefix (the seed refuses kinds without a prefix)
        const U = await mkCtx('U', {doiPrefix: '10.1234', enabledDoiTypes: KINDS, doiCreationTime: 'publication'});
        const N = await mkCtx('N', {doiPrefix: '10.1234', enabledDoiTypes: KINDS, doiCreationTime: 'never'});
        const MK = await mkCtx('MK', {doiPrefix: '10.1234', enabledDoiTypes: ['publication']});
        if (!isOPS) {
            await mkSub(M, 'a', {decisions: toReview, ...galley()});
            await mkSub(M, 'c', {decisions: ['skipExternalReview']});
            await mkSub(M, 'p', {decisions: ['skipExternalReview', 'sendToProduction'], ...galley()});
            await mkSub(M0, 'a', {decisions: toReview});
            await mkSub(U, 'a', {decisions: toReview, ...galley()});
            await mkSub(N, 'a', {decisions: toReview, ...galley()});
            await mkSub(MK, 'a', {decisions: ['skipExternalReview', 'sendToProduction'], ...galley()});
        } else {
            await mkSub(M, 's', {...galley()});
            await mkSub(M, 'd', {submitted: false});
            await mkSub(M0, 's', {...galley()});
            await mkSub(U, 's', {...galley()});
            await mkSub(N, 's', {...galley()});
            await mkSub(MK, 's', {...galley()});
        }
        out.seedDb = Object.fromEntries(Object.entries({M, M0, U, N, MK}).flatMap(([k, C]) => Object.entries(C.subs).filter(([, s]) => s.id).map(([sk, s]) => [`${k}.${sk}`, dbVersions(s.id)])));
        fact('moments-seed-db', out.seedDb);
        save();

        if (!isOPS) {
            // M: Accept a submission in Review on screen ("Upon reaching the copyediting stage")
            await as(M.u.mg, M.path);
            await openDois(M.path);
            out.M_a_before = await readItem(M.subs.a.id);
            await snap('m-dois-before-accept');
            if (!out.M_a_accept) { out.M_a_accept = await decide(M.path, M.subs.a.id, 'Accept Submission', 'm-a-accept'); save(); }
            await openDois(M.path);
            out.M_a_after = await readItem(M.subs.a.id);
            out.M_a_db = dbVersions(M.subs.a.id);
            await snap('m-dois-after-accept');
            fact('moments-M-accept', {before: out.M_a_before, accept: out.M_a_accept, after: out.M_a_after, db: out.M_a_db});
            // M: clear the DOI of a work at Copyediting, then "Send To Production" on screen
            out.M_c_seed = dbVersions(M.subs.c.id);
            if (!out.M_c_cleared) {
                await openDois(M.path);
                const row = await expandItem(M.subs.c.id);
                out.M_c_cleared = await editDoi(row, isOMP ? 'Monograph' : 'Article', '', 'm-c-cleared');
                out.M_c_afterClear = await readItem(M.subs.c.id);
                save();
            }
            if (!out.M_c_prod) { out.M_c_prod = await decide(M.path, M.subs.c.id, 'Send To Production', 'm-c-production'); save(); }
            await openDois(M.path);
            out.M_c_after = await readItem(M.subs.c.id);
            out.M_c_db = dbVersions(M.subs.c.id);
            await snap('m-dois-after-production');
            fact('moments-M-production', {seed: out.M_c_seed, cleared: out.M_c_cleared, afterClear: out.M_c_afterClear, prod: out.M_c_prod, after: out.M_c_after, db: out.M_c_db});
            // M: a work sent to Production before its galley existed; a hand-typed DOI; then publish on screen
            await openDois(M.path);
            out.M_p_before = await readItem(M.subs.p.id);
            if (!out.M_p_typed) {
                const row = await expandItem(M.subs.p.id);
                out.M_p_typed = await editDoi(row, isOMP ? 'Monograph' : 'Article', `10.1234/typed${M.path.slice(-6)}`, 'm-p-typed');
                save();
            }
            if (!out.M_p_pub) { out.M_p_pub = await publish(M.path, M.subs.p.id, M.subs.p.pub, 'm-p-publish'); save(); }
            await openDois(M.path);
            out.M_p_after = await readItem(M.subs.p.id);
            out.M_p_db = dbVersions(M.subs.p.id);
            await snap('m-dois-after-publish');
            fact('moments-M-publish', {before: out.M_p_before, typed: out.M_p_typed, pub: out.M_p_pub, after: out.M_p_after, db: out.M_p_db});
            // M0: no prefix; Accept on screen
            await as(M0.u.mg, M0.path);
            if (!out.M0_accept) { out.M0_accept = await decide(M0.path, M0.subs.a.id, 'Accept Submission', 'm0-a-accept'); save(); }
            await openDois(M0.path);
            out.M0_after = await readItem(M0.subs.a.id);
            await snap('m0-dois-after-accept');
            fact('moments-M0-noprefix', {accept: out.M0_accept, after: out.M0_after, db: dbVersions(M0.subs.a.id)});
            // U: "Upon publication": Accept, then publish
            await as(U.u.mg, U.path);
            if (!out.U_accept) { out.U_accept = await decide(U.path, U.subs.a.id, 'Accept Submission', 'u-a-accept'); save(); }
            await openDois(U.path);
            out.U_afterAccept = await readItem(U.subs.a.id);
            await snap('u-dois-after-accept');
            if (!out.U_pub) { out.U_pub = await publish(U.path, U.subs.a.id, U.subs.a.pub, 'u-a-publish'); save(); }
            await openDois(U.path);
            out.U_afterPub = await readItem(U.subs.a.id);
            await snap('u-dois-after-publish');
            fact('moments-U', {accept: out.U_accept, afterAccept: out.U_afterAccept, pub: out.U_pub, afterPub: out.U_afterPub, db: dbVersions(U.subs.a.id)});
            // N: "Never": Accept, then publish
            await as(N.u.mg, N.path);
            if (!out.N_accept) { out.N_accept = await decide(N.path, N.subs.a.id, 'Accept Submission', 'n-a-accept'); save(); }
            if (!out.N_pub) { out.N_pub = await publish(N.path, N.subs.a.id, N.subs.a.pub, 'n-a-publish'); save(); }
            await openDois(N.path);
            out.N_after = await readItem(N.subs.a.id);
            await snap('n-dois-after-publish');
            fact('moments-N', {accept: out.N_accept, pub: out.N_pub, after: out.N_after, db: dbVersions(N.subs.a.id)});
            // MK: only the work's kind ticked; publish
            await as(MK.u.mg, MK.path);
            if (!out.MK_pub) { out.MK_pub = await publish(MK.path, MK.subs.a.id, MK.subs.a.pub, 'mk-a-publish'); save(); }
            await openDois(MK.path);
            out.MK_after = await readItem(MK.subs.a.id);
            await snap('mk-dois-after-publish');
            fact('moments-MK', {pub: out.MK_pub, after: out.MK_after, db: dbVersions(MK.subs.a.id)});
        } else {
            // OPS: the seeded submit; an Author's on-screen "Submit"; "Post" under each moment
            await as(M.u.mg, M.path);
            await openDois(M.path);
            out.M_s = await readItem(M.subs.s.id);
            out.M_d_before = await readItem(M.subs.d.id);
            await snap('m-dois-seeded');
            if (!out.M_d_wizard) {
                await as(M.u.au, M.path);
                out.M_d_wizard = await submitWizard(M.path, M.subs.d.id, 'm-d-wizard');
                save();
            }
            await as(M.u.mg, M.path);
            await openDois(M.path);
            out.M_d_after = await readItem(M.subs.d.id);
            await snap('m-dois-after-wizard');
            fact('moments-M-ops', {seeded: out.M_s, draftBefore: out.M_d_before, wizard: out.M_d_wizard, draftAfter: out.M_d_after, dbS: dbVersions(M.subs.s.id), dbD: dbVersions(M.subs.d.id)});
            if (!out.M_pub) { out.M_pub = await publish(M.path, M.subs.s.id, M.subs.s.pub, 'm-s-post'); save(); }
            await openDois(M.path);
            fact('moments-M-ops-post', {pub: out.M_pub, after: await readItem(M.subs.s.id), db: dbVersions(M.subs.s.id)});
            for (const [k, C] of [['M0', M0], ['U', U], ['N', N], ['MK', MK]]) {
                await as(C.u.mg, C.path);
                await openDois(C.path);
                const before = await readItem(C.subs.s.id);
                if (!out[`${k}_pub`]) { out[`${k}_pub`] = await publish(C.path, C.subs.s.id, C.subs.s.pub, `${k.toLowerCase()}-s-post`); save(); }
                await openDois(C.path);
                const after = await readItem(C.subs.s.id);
                await snap(`${k.toLowerCase()}-dois-after-post`);
                fact(`moments-${k}-ops`, {before, pub: out[`${k}_pub`], after, db: dbVersions(C.subs.s.id)});
            }
        }
        save();
    });

    async function submitWizard(ctx, sid, name) {
        const out = {};
        const cur = () => page.locator('.pkpSteps__step__label--current');
        const cont = async (label) => {
            const b = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
            for (let i = 0; i < 3; i++) { await b.click(); try { await cur().filter({hasText: label}).waitFor({timeout: 6000}); return; } catch (e) { if (i === 2) throw e; } }
        };
        await go(cu(ctx, `/submission?id=${sid}`));
        await cur().filter({hasText: 'Upload Files'}).waitFor({timeout: T});
        const labelDialog = page.getByRole('dialog').filter({has: page.locator('#preprintGalleyForm')});
        for (let i = 0; ; i++) { await page.getByRole('link', {name: 'Add File', exact: true}).click(); try { await labelDialog.first().waitFor({timeout: 5000}); break; } catch (e) { if (i >= 2) throw e; } }
        await labelDialog.locator('input[name="label"]').fill('PDF');
        await labelDialog.getByRole('button', {name: 'Save', exact: true}).click();
        const upload = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
        const genre = upload.locator('select[name="genreId"]').first();
        await genre.waitFor({timeout: T});
        await genre.selectOption({label: 'Preprint Text'});
        await upload.locator('input[type="file"]').setInputFiles(FIX.ops);
        await page.waitForFunction(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => x.innerText.trim() === 'Continue'); return b && !b.disabled; }, null, {timeout: T});
        await upload.getByRole('button', {name: 'Continue', exact: true}).click();
        await upload.getByRole('tab', {name: '2. Review Details'}).waitFor({timeout: T});
        await upload.getByRole('button', {name: 'Continue', exact: true}).click();
        await upload.getByRole('tab', {name: '3. Confirm'}).waitFor({timeout: T});
        await upload.getByRole('button', {name: 'Complete', exact: true}).click();
        await upload.waitFor({state: 'hidden', timeout: T});
        await idle(page);
        await cont('Details');
        await cont('Contributors');
        await cont('For Readers');
        await page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'}).check().catch(() => {});
        const validated = page.waitForResponse((r) => r.url().includes('/submit') && r.request().method() === 'POST' && r.status() < 500, {timeout: 45000}).catch(() => null);
        await cont('Review');
        await validated;
        await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
        await snap(`${name}-review`);
        await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
        const d = page.getByRole('dialog').filter({hasText: /will be submitted to|Are you sure you want to (complete|submit)/});
        await d.waitFor({timeout: T});
        out.dialog = flat(await d.innerText(), 300);
        const w = page.waitForResponse((r) => /\/submissions\/\d+\/submit/.test(r.url()) && r.request().method() !== 'GET', {timeout: 45000}).catch(() => null);
        await d.getByRole('button', {name: 'Submit', exact: true}).click();
        const r = await w;
        out.status = r ? r.status() : null;
        await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45000}).catch(() => {});
        const s = await snap(name);
        out.after = flat(s.text.main, 200);
        return out;
    }

    // ==================================================================== peer: Rule 7 (q15), Setting 12, Cross-feature 638–640 (OJS)
    await sect('peer', async () => {
        if (!isOJS) {
            // controls: the "Items with DOIs" boxes of a press and a server (no "Peer Review", no "Issues"), read only
            await as('manager.maya', app.contextPath);
            const panel = await openDoiTab(app.contextPath, 'Setup');
            const f = await readPanel(panel);
            fact('peer-control-kinds', f.inputs.filter((i) => i.type === 'checkbox').map((i) => i.label));
            await snap('peer-control-setup-pk');
            if (isOMP) {
                await go(cu(app.contextPath, '/management/settings/workflow'));
                await page.getByRole('tab', {name: 'Review', exact: true}).first().click().catch(() => {});
                await idle(page); await sleep(800);
                const txt = flat(await page.locator('[role="tabpanel"]:visible').first().innerText().catch(() => ''), 3000);
                fact('peer-control-omp-review-tab', {publicly: /Publicly Show Reviewer Comments/.test(txt), box: await page.getByRole('checkbox', {name: /publicly visible/i}).count()});
                await snap('peer-control-omp-review-tab');
            }
            return;
        }
        const out = S.peer = S.peer || {};
        const P = await mkCtx('P', {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'peerReview'], review: {defaultReviewPublicVisibility: true}}, {reviewers: true});
        const r = await mkSub(P, 'r', {decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: P.u.rv1, status: 'completed'}, {username: P.u.rv2, status: 'completed'}]}],
            participants: [{username: P.u.se, role: 'sectionEditor'}]});
        out.seedDb = dbVersions(r.id);
        fact('peer-seed', out.seedDb);
        await as(P.u.mg, P.path);
        const revRow = (n) => wf().getByRole('row').filter({hasText: n}).first();
        // untick rv2's "Publicly Show Reviewer Comments" in the assignment's "Edit" window
        if (!out.untick) {
            await openWf(P.path, r.id);
            await snap('p-review-stage');
            await revRow('Ravi Private').getByRole('button', {name: 'More Actions'}).click();
            await sleep(400);
            const items = await page.getByRole('menuitem').allInnerTexts().catch(() => []);
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            const edit = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')});
            const box = edit.locator('input[name="isReviewPubliclyVisible"]');
            await box.waitFor({timeout: T}); await idle(page); await sleep(500);
            const label = flat(await edit.locator('form#editReviewForm').evaluate((f) => { const b = f.querySelector('input[name="isReviewPubliclyVisible"]'); const fs = b.closest('fieldset'); return (fs ? fs.innerText : b.closest('label').innerText); }).catch(() => null), 300);
            const was = await box.isChecked();
            await snap('p-edit-assignment-rv2');
            await loc(page, 'Reviewer "Edit" window: "Publicly Show Reviewer Comments" box', box);
            await box.uncheck();
            const w = page.waitForResponse((x) => x.request().method() === 'POST' && /review|\$\$\$call\$\$\$/.test(x.url()), {timeout: T}).catch(() => null);
            await edit.getByRole('button', {name: /^(Save|OK)$/}).first().click();
            await sleep(1200);
            const confirm = page.getByRole('dialog').filter({hasText: /Save changes|Are you sure/}).last();
            let confirmText = null;
            if (await confirm.isVisible().catch(() => false)) { confirmText = flat(await confirm.innerText(), 300); await confirm.getByRole('button', {name: /^(Save|OK|Yes|Confirm)/}).first().click().catch(() => {}); }
            const resp = await w;
            await sleep(1500); await idle(page);
            out.untick = {menu: items, label, was, confirmText, status: resp ? resp.status() : null};
            await snap('p-edit-assignment-saved', {untick: out.untick});
            out.untickDb = dbVersions(r.id).reviews;
            save();
            fact('peer-untick', {untick: out.untick, db: out.untickDb});
        }
        // the section editor's view of the same window (sub-editor level)
        if (!out.seView) {
            await as(P.u.se, P.path);
            await openWf(P.path, r.id);
            const menu = revRow('Rhea Public').getByRole('button', {name: 'More Actions'});
            if (await menu.count()) {
                await menu.click(); await sleep(400);
                const items = await page.getByRole('menuitem').allInnerTexts().catch(() => []);
                const e = page.getByRole('menuitem', {name: 'Edit', exact: true});
                let box = null;
                if (await e.count()) {
                    await e.click();
                    const edit = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')});
                    await edit.locator('input[name="isReviewPubliclyVisible"]').waitFor({timeout: T}).catch(() => {});
                    box = {count: await edit.locator('input[name="isReviewPubliclyVisible"]').count(), checked: await edit.locator('input[name="isReviewPubliclyVisible"]').isChecked().catch(() => null)};
                    await snap('p-edit-assignment-se');
                    await edit.getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
                }
                out.seView = {items, box};
            } else out.seView = {noMenu: true, buttons: await wfButtons()};
            await snap('p-review-stage-se');
            save();
            fact('peer-se-view', out.seView);
            await as(P.u.mg, P.path);
        }
        // accept to Copyediting before "Mark as Complete"
        if (!out.accept) { out.accept = await decide(P.path, r.id, 'Accept Submission', 'p-accept'); save(); }
        await openDois(P.path);
        out.afterAccept = await readItem(r.id);
        out.afterAcceptDb = dbVersions(r.id);
        await snap('p-dois-after-accept');
        fact('peer-after-accept', {accept: out.accept, item: out.afterAccept, db: out.afterAcceptDb});
        // "Mark as Complete" on both reviews (after the stage move)
        for (const [who, key] of [['Rhea Public', 'c1'], ['Ravi Private', 'c2']]) {
            if (out[key]) continue;
            await openWf(P.path, r.id);
            await wf().getByRole('link', {name: /Review Round 1/}).or(wf().getByRole('button', {name: /Review Round 1/})).first().click().catch(() => {});
            await idle(page); await sleep(1200);
            const row = revRow(who);
            const read = row.getByRole('button', {name: 'Read Review'});
            if (!(await read.count())) { out[key] = {noRead: true, row: flat(await row.innerText().catch(() => ''), 300)}; await snap(`p-${key}-noread`); continue; }
            await read.click(); await idle(page); await sleep(1200);
            await snap(`p-${key}-read-review`);
            await page.getByRole('button', {name: 'Mark as Complete'}).last().click();
            await sleep(900);
            const conf = page.getByRole('dialog').filter({hasText: 'Mark this review as complete?'});
            const confText = flat(await conf.innerText().catch(() => null), 400);
            const w = page.waitForResponse((x) => x.request().method() !== 'GET' && /consider|review/.test(x.url()), {timeout: 15000}).catch(() => null);
            if (await conf.count()) await conf.getByRole('button', {name: 'Mark as Complete'}).click();
            const resp = await w;
            await idle(page); await sleep(1200);
            out[key] = {confirm: confText, status: resp ? resp.status() : null};
            await snap(`p-${key}-completed`, out[key]);
            save();
        }
        await openDois(P.path);
        out.afterComplete = await readItem(r.id);
        out.afterCompleteDb = dbVersions(r.id);
        await snap('p-dois-after-complete');
        fact('peer-after-complete', {c1: out.c1, c2: out.c2, item: out.afterComplete, db: out.afterCompleteDb});
        if (!out.assign) {
            out.assign = await bulk([r.id], 'Assign DOIs', 'p-assign');
            save();
        }
        await page.reload(); await idle(page); await sleep(800);
        out.afterAssign = await readItem(r.id);
        await snap('p-dois-after-assign');
        fact('peer-after-assign', {assign: out.assign, item: out.afterAssign, db: dbVersions(r.id)});
        // publish; the reader's page
        if (!out.pub) { out.pub = await publish(P.path, r.id, r.pub, 'p-publish'); save(); }
        const reader = await readDoiLine(P.path, readerPath(r.id), 'p-reader-article');
        const html = flat(await vpage.content().catch(() => ''), 200000);
        const reviewDois = (dbVersions(r.id).reviews || []).map((x) => x.split('|').pop()).filter((d) => d && d !== '-' && d !== '10.1234/');
        fact('peer-reader', {pub: out.pub, reader, reviewDoisOnPage: reviewDois.filter((d) => html.includes(d)), reviewDois, reviewWords: /Peer Review|Reviewer Comments|Review Round/i.test(html)});
        // r2: Accept with "Notify Reviewers" skipped, then "Mark as Complete" by hand
        const r2 = await mkSub(P, process.env.PEER_KEY || 'r3', {decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: P.u.rv1, status: 'completed'}]}]});
        if (!out[`${process.env.PEER_KEY || 'r3'}accept`]) { out.r2first = {accept: out.r2accept, afterAccept: out.r2afterAccept}; delete out.r2c; delete out.r2assign; out[`${process.env.PEER_KEY || 'r3'}accept`] = true; out.r2accept = await decide(P.path, r2.id, 'Accept Submission', 'p2-accept', {skipReviewers: true}); save(); }
        await openDois(P.path);
        out.r2afterAccept = {item: await readItem(r2.id), db: dbVersions(r2.id)};
        await snap('p2-dois-after-accept');
        if (!out.r2c) {
            await openWf(P.path, r2.id);
            await wf().getByRole('link', {name: /Review Round 1/}).or(wf().getByRole('button', {name: /Review Round 1/})).first().click().catch(() => {});
            await idle(page); await sleep(1200);
            const row = revRow('Rhea Public');
            out.r2row = flat(await row.innerText().catch(() => ''), 300);
            const read = row.getByRole('button', {name: 'Read Review'});
            if (await read.count()) {
                await read.click(); await idle(page); await sleep(1200);
                await snap('p2-read-review');
                await page.getByRole('button', {name: 'Mark as Complete'}).last().click();
                await sleep(900);
                const conf = page.getByRole('dialog').filter({hasText: 'Mark this review as complete?'});
                const confText = flat(await conf.innerText().catch(() => null), 400);
                if (await conf.count()) await conf.getByRole('button', {name: 'Mark as Complete'}).click();
                await idle(page); await sleep(1500);
                out.r2c = {confirm: confText};
                await snap('p2-completed');
            } else out.r2c = {noRead: true};
            save();
        }
        await openDois(P.path);
        out.r2afterComplete = {item: await readItem(r2.id), db: dbVersions(r2.id)};
        await snap('p2-dois-after-complete');
        if (!out.r2assign) { out.r2assign = await bulk([r2.id], 'Assign DOIs', 'p2-assign'); save(); }
        await page.reload(); await idle(page); await sleep(800);
        out.r2afterAssign = {item: await readItem(r2.id), db: dbVersions(r2.id)};
        fact(`peer-${process.env.PEER_KEY || 'r3'}`, {accept: out.r2accept, afterAccept: out.r2afterAccept, row: out.r2row, complete: out.r2c, afterComplete: out.r2afterComplete, assign: out.r2assign, afterAssign: out.r2afterAssign});
        // the second review round's "Peer Review {number}" label vs the assignment id
        fact('peer-label', {rows: (out.afterAssign.rows || []).map((x) => x.type), reviewIds: (dbVersions(r.id).reviews || []).map((x) => x.split('|')[0])});
        save();
    });

    // ==================================================================== issue: Rule 8, OJS1, issue page's DOI line, issue statuses (OJS)
    async function issueRowAction(ctx, name, link, tab = 'Future Issues') {
        await go(cu(ctx, '/manageIssues'));
        if (tab === 'Back Issues') { await page.getByRole('tab', {name: 'Back Issues'}).click().catch(() => {}); await idle(page); await sleep(800); }
        const row = page.locator('tr.gridRow').filter({hasText: name}).filter({visible: true}).first();
        await row.waitFor({timeout: T});
        const id = await row.getAttribute('id');
        await row.locator('a.show_extras').click();
        const l = page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: link, exact: true});
        await l.waitFor({state: 'visible', timeout: T});
        const actions = (await page.locator(`[id="${id}-control-row"] a:visible`).allInnerTexts()).map((x) => x.trim());
        await l.click();
        return actions;
    }
    async function publishIssue(ctx, name, snapName) {
        const actions = await issueRowAction(ctx, name, 'Publish Issue');
        const dlg = page.getByRole('dialog', {name: 'Publish Issue', exact: true});
        await dlg.locator('input[name="sendIssueNotification"]').waitFor({timeout: T});
        await idle(page); await sleep(500);
        await dlg.locator('input[name="sendIssueNotification"]').uncheck().catch(() => {});
        const text = flat(await dlg.innerText(), 500);
        await snap(`${snapName}-window`);
        const w = page.waitForResponse((r) => /publish-issue|publishIssue/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await w;
        await sleep(1500); await idle(page);
        await snap(snapName);
        return {actions, text, status: r ? r.status() : null};
    }
    async function unpublishIssue(ctx, name, snapName) {
        const actions = await issueRowAction(ctx, name, 'Unpublish Issue', 'Back Issues');
        const d = page.getByRole('dialog').filter({hasText: /unpublish/i}).last();
        await d.waitFor({timeout: T}).catch(() => {});
        const text = flat(await d.innerText().catch(() => ''), 300);
        const w = page.waitForResponse((r) => /unpublish/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        const r = await w;
        await sleep(1500); await idle(page);
        await snap(snapName);
        return {actions, text, status: r ? r.status() : null};
    }
    const dbIssue = (ctx) => db(`select i.issue_id, i.volume, i.number, i.published, coalesce(d.doi,'-'), coalesce(d.status::text,'-') from issues i left join dois d on d.doi_id=i.doi_id where i.journal_id=${ctx.id} order by i.issue_id`);
    await sect('issue', async () => {
        if (!isOJS) return;
        const out = S.issue = S.issue || {};
        for (const [k, when] of [['IN', 'never'], ['IP', 'publication']]) {
            const C = await mkCtx(k, {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'issue'], doiCreationTime: when,
                issues: [{volume: 1, number: 1, year: 2025}, {volume: 1, number: 2, year: 2026}]});
            const iss = C.issues || [];
            const s = await mkSub(C, 'sch', {published: true, issue: {volume: 1, number: 1, year: 2025}});
            const o = out[k] = out[k] || {};
            await as(C.u.mg, C.path);
            o.before = {issues: dbIssue(C), art: dbVersions(s.id)};
            await openDois(C.path, 'Issues');
            o.issuesTabBefore = flat((await snap(`${k}-issues-tab-before`)).text.main, 800);
            // Vol. 1 No. 2: DOI typed by hand on the Issues tab before its publish (IN only)
            if (k === 'IN' && iss[1] && !o.typed) {
                const row = await expandItem(iss[1].id, 'issue');
                o.typed = await editDoi(row, 'Issue', `10.1234/issuetyped${C.path.slice(-5)}`, `${k}-issue2-typed`);
                save();
            }
            if (!o.pub1) { o.pub1 = await publishIssue(C.path, 'Vol. 1 No. 1 (2025)', `${k}-publish-issue1`); save(); }
            if (k === 'IN' && !o.pub2) { o.pub2 = await publishIssue(C.path, 'Vol. 1 No. 2 (2026)', `${k}-publish-issue2`); save(); }
            o.after = {issues: dbIssue(C), art: dbVersions(s.id)};
            await openDois(C.path, 'Issues');
            o.issue1 = iss[0] ? await readItem(iss[0].id, 'issue') : null;
            o.issue2 = iss[1] ? await readItem(iss[1].id, 'issue') : null;
            await snap(`${k}-issues-tab-after`);
            await openDois(C.path);
            o.article = await readItem(s.id);
            await snap(`${k}-articles-tab-after`);
            fact(`issue-${k}`, o);
            // the issue page's "DOI:" line
            if (iss[0]) fact(`issue-${k}-page`, await readDoiLine(C.path, `/issue/view/${iss[0].id}`, `${k}-issue-page`));
            save();
        }
        // IP: an article scheduled on screen into the future issue Vol. 1 No. 2, then that issue published
        if (!out.isSched) {
            out.irSchedFirst = out.irSched;
            const C2 = await mkCtx('IS', {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'issue'], doiCreationTime: 'publication', issues: [{volume: 2, number: 1, year: 2026}]});
            const w = await mkSub(C2, 'scr', {decisions: ['skipExternalReview']});
            await as(C2.u.mg, C2.path);
            const before = dbVersions(w.id);
            const sched = await publish(C2.path, w.id, w.pub, 'IS-schedule-on-screen', {issue: 'Vol. 2 No. 1'});
            const afterSched = dbVersions(w.id);
            await openDois(C2.path);
            const item = await readItem(w.id);
            await snap('IS-dois-after-schedule');
            const pub2 = await publishIssue(C2.path, 'Vol. 2 No. 1 (2026)', 'IS-publish-issue');
            await openDois(C2.path);
            const item2 = await readItem(w.id);
            out.isSched = {before, sched, afterSched, item, pub2, afterIssue: dbVersions(w.id), item2, issues: dbIssue(C2)};
            save();
        }
        fact('issue-IS-schedule', out.isSched);
        // IN: "Assign DOIs" on the Issues tab for an unpublished issue without one
        const C = S.IN;
        if (!out.assignIssue) {
            // a third issue, created on screen? the seed made two; clear issue 1's DOI then assign
            await as(C.u.mg, C.path);
            await openDois(C.path, 'Issues');
            const row = await expandItem(C.issues[0].id, 'issue');
            out.clearIssue = await editDoi(row, 'Issue', '', 'IN-issue1-cleared');
            out.assignIssue = await bulk([C.issues[0].id], 'Assign DOIs', 'IN-issue1-assign', 'issue');
            await page.reload(); await idle(page); await sleep(800);
            await page.getByRole('tab', {name: 'Issues', exact: true}).click().catch(() => {}); await idle(page); await sleep(600);
            out.assignIssueAfter = await readItem(C.issues[0].id, 'issue');
            save();
            fact('issue-assign', {clear: out.clearIssue, assign: out.assignIssue, after: out.assignIssueAfter, db: dbIssue(C)});
        }
        // statuses: issue 1 marked Registered, then unpublished and published again; issue 2 left Unregistered
        if (!out.statuses) {
            await as(C.u.mg, C.path);
            await openDois(C.path, 'Issues');
            const mark = await bulk([C.issues[0].id], 'Mark DOIs Registered', 'IN-issue1-mark-registered', 'issue');
            const s0 = dbIssue(C);
            const un1 = await unpublishIssue(C.path, 'Vol. 1 No. 1 (2025)', 'IN-unpublish-issue1');
            const un2 = await unpublishIssue(C.path, 'Vol. 1 No. 2 (2026)', 'IN-unpublish-issue2');
            const s1 = dbIssue(C);
            await openDois(C.path, 'Issues');
            const i1a = await readItem(C.issues[0].id, 'issue');
            const i2a = await readItem(C.issues[1].id, 'issue');
            await snap('IN-issues-after-unpublish');
            const re1 = await publishIssue(C.path, 'Vol. 1 No. 1 (2025)', 'IN-republish-issue1');
            const s2 = dbIssue(C);
            await openDois(C.path, 'Issues');
            const i1b = await readItem(C.issues[0].id, 'issue');
            await snap('IN-issues-after-republish');
            out.statuses = {mark, s0, un1, un2, s1, i1a, i2a, re1, s2, i1b, art: dbVersions(S.IN.subs.sch.id)};
            save();
            fact('issue-statuses', out.statuses);
        }
    });

    // ==================================================================== line: Rule 43 (q25), Rule 10, Cross-feature 612–613, 617–619, 631–634
    await sect('line', async () => {
        const out = S.line = S.line || {};
        const L = await mkCtx('L', {doiPrefix: '10.1234', enabledDoiTypes: KINDS});
        const s = await mkSub(L, 'a', {published: true, ...galley()});
        const doiOf = () => { const p = dbVersions(s.id).pubs[0] || ''; return p.split('|')[5]; };
        out.db0 = dbVersions(s.id);
        const readAll = async (n) => {
            const page1 = await readDoiLine(L.path, readerPath(s.id), `l-${n}-reader`);
            const lr = await oai(L.path, 'verb=ListRecords&metadataPrefix=oai_dc', `l-${n}-${app.name}`);
            return {page: page1, oai: lr, db: doiOf()};
        };
        out.visitor0 = await readAll('0');
        // the same page as a signed-in reader
        await as(L.u.rd, L.path);
        await go(cu(L.path, readerPath(s.id)));
        const rdSnap = await snap('l-0-reader-signed-in');
        out.reader0 = flat((rdSnap.text.main || rdSnap.text.body || '').split('\n').filter((x) => /DOI|doi\.org/.test(x)).join(' | '), 400);
        fact('line-0', {visitor: out.visitor0, reader: out.reader0, db: out.db0, versioningOn: versioningOn()});
        // change the DOI on the DOIs page
        await as(L.u.mg, L.path);
        const typeLabel = isOJS ? 'Article' : isOMP ? 'Monograph' : 'Preprint';
        if (!out.changed) {
            await openDois(L.path);
            const row = await expandItem(s.id);
            out.changed = await editDoi(row, typeLabel, `10.1234/changed${L.path.slice(-6)}`, 'l-changed');
            save();
        }
        out.visitor1 = await readAll('1');
        fact('line-1-changed', {edit: out.changed, visitor: out.visitor1});
        if (!out.cleared) {
            await openDois(L.path);
            const row = await expandItem(s.id);
            out.cleared = await editDoi(row, typeLabel, '', 'l-cleared');
            save();
        }
        out.visitor2 = await readAll('2');
        fact('line-2-cleared', {edit: out.cleared, visitor: out.visitor2});
        if (!out.retyped) {
            await openDois(L.path);
            const row = await expandItem(s.id);
            out.retyped = await editDoi(row, typeLabel, `10.1234/retyped${L.path.slice(-6)}`, 'l-retyped');
            save();
        }
        out.visitor3 = await readAll('3');
        fact('line-3-retyped', {edit: out.retyped, visitor: out.visitor3});
        // untick "DOIs", save; then the side menu and the reader
        if (!out.off) {
            const panel = await openDoiTab(L.path, 'Setup');
            await panel.getByRole('checkbox', {name: /^Allow Digital Object Identifiers/}).uncheck();
            out.off = await savePanel(panel);
            await snap('l-dois-off-saved', {save: out.off});
            await page.reload(); await idle(page); await sleep(800);
            out.offMenu = await sideMenuDois();
            await snap('l-dois-off-reload');
            save();
        }
        out.visitor4 = await readAll('4');
        fact('line-4-dois-off', {save: out.off, menu: out.offMenu, visitor: out.visitor4});
        // tick "DOIs" again with the work's kind unticked
        if (!out.kindOff) {
            const panel = await openDoiTab(L.path, 'Setup');
            await panel.getByRole('checkbox', {name: /^Allow Digital Object Identifiers/}).check();
            await sleep(500);
            const first = isOJS ? 'Articles' : isOMP ? 'Monographs' : 'Preprints';
            await panel.getByRole('checkbox', {name: first, exact: true}).uncheck().catch(() => {});
            out.kindOff = await savePanel(panel);
            out.kindOffForm = await readPanel(panel);
            await snap('l-kind-off-saved', {save: out.kindOff});
            out.kindOffMenu = await sideMenuDois();
            save();
        }
        out.visitor5 = await readAll('5');
        fact('line-5-kind-off', {save: out.kindOff, menu: out.kindOffMenu, visitor: out.visitor5, form: (out.kindOffForm || {}).inputs});
        save();
    });

    // ==================================================================== vno: Rule 11 and Rule 13 (No → Yes) on "DOI Versioning" "No"
    await sect('vno', async () => {
        const out = S.vno = S.vno || {};
        const C = await mkCtx('VN', {doiPrefix: '10.1234', enabledDoiTypes: KINDS, doiVersioning: false});
        const s = await mkSub(C, 'a', {published: true, ...galley()});
        await as(C.u.mg, C.path);
        out.db0 = dbVersions(s.id);
        if (!out.v2) { out.v2 = await newVersion(C.path, s.id, s.pub, false, 'vn-new-version'); save(); }
        await openDois(C.path);
        out.item1 = await readItem(s.id);
        out.db1 = dbVersions(s.id);
        await snap('vn-dois-after-new-version');
        fact('vno-new-version', {v2: out.v2, item: out.item1, db0: out.db0, db1: out.db1});
        // change the DOI on the DOIs page
        const typeLabel = isOJS ? 'Article' : isOMP ? 'Monograph' : 'Preprint';
        if (!out.changed) {
            const row = await expandItem(s.id);
            out.changed = await editDoi(row, typeLabel, `10.1234/vnchanged${C.path.slice(-5)}`, 'vn-changed');
            save();
        }
        out.db2 = dbVersions(s.id);
        fact('vno-changed', {edit: out.changed, db: out.db2});
        // publish the new version; the older version's page (Rule 43 "No")
        if (!out.pub2) { out.pub2 = await publish(C.path, s.id, out.v2.newPub, 'vn-publish-v2'); save(); }
        fact('vno-line', {v1: await readDoiLine(C.path, readerPath(s.id, s.pub), 'vn-reader-v1'), v2: await readDoiLine(C.path, readerPath(s.id), 'vn-reader-current'), db: dbVersions(s.id)});
        // Rule 13: switch to "Yes", make a major version
        if (!out.switch) { out.switch = await setVersioning(C.path, true, 'vn-switch-yes'); save(); }
        if (!out.v3) { out.v3 = await newVersion(C.path, s.id, out.v2.newPub, false, 'vn-new-version-after-switch'); save(); }
        await openDois(C.path);
        out.item3 = await readItem(s.id);
        out.db3 = dbVersions(s.id);
        await snap('vn-dois-after-switch');
        fact('vno-switch', {save: out.switch, v3: out.v3, item: out.item3, db: out.db3});
        if (!out.back) { out.back = await setVersioning(C.path, false, 'vn-back-no'); save(); }
        fact('vno-back', out.back);
    });

    // ==================================================================== vyes: Rules 12, 20, 13 (Yes → No), Setting 6 "View all", the OAI failure
    await sect('vyes', async () => {
        const out = S.vyes = S.vyes || {};
        const C = await mkCtx('VY', {doiPrefix: '10.1234', enabledDoiTypes: KINDS, doiVersioning: true});
        const s = await mkSub(C, 'a', {published: true, ...galley()});
        const typeLabel = isOJS ? 'Article' : isOMP ? 'Monograph' : 'Preprint';
        await as(C.u.mg, C.path);
        out.db0 = dbVersions(s.id);
        // the OAI while this context says "Yes" (all apps; the claim names journals)
        out.oaiPkYes = await oai(app.contextPath, 'verb=Identify', `vy-pk-identify-yes-${app.name}`);
        out.oaiCtxYes = await oai(C.path, 'verb=ListRecords&metadataPrefix=oai_dc', `vy-ctx-list-yes-${app.name}`);
        out.versioningOnAtYes = versioningOn();
        fact('vyes-oai-while-yes', {pk: out.oaiPkYes, ctx: out.oaiCtxYes, contextsYes: out.versioningOnAtYes});
        await openDois(C.path);
        out.item0 = await readItem(s.id);
        if (!out.v2) { out.v2 = await newVersion(C.path, s.id, s.pub, false, 'vy-major'); save(); }
        await openDois(C.path);
        out.item1 = await readItem(s.id);
        out.db1 = dbVersions(s.id);
        await snap('vy-dois-after-major');
        fact('vyes-major', {item0: out.item0, v2: out.v2, item: out.item1, db0: out.db0, db1: out.db1});
        // the "View all" window with an unpublished version
        const viewAll = async (n) => {
            const row = await expandItem(s.id);
            const b = row.getByRole('button', {name: 'View all', exact: true});
            const o = {line: flat(await row.innerText().catch(() => ''), 900), offered: await b.count()};
            if (!o.offered) return o;
            await b.click(); await sleep(1200); await idle(page);
            const w = page.getByRole('dialog').filter({hasText: 'DOIs for all versions'}).last();
            o.window = flat(await w.innerText().catch(() => ''), 1500);
            o.blocks = await w.evaluate((d) => {
                const t = (x) => (x || '').replace(/\s+/g, ' ').trim();
                return {links: [...d.querySelectorAll('a')].map((a) => ({text: t(a.innerText), href: a.getAttribute('href'), target: a.getAttribute('target')})),
                    inputs: [...d.querySelectorAll('input')].map((i) => ({label: i.getAttribute('aria-label') || (i.labels && i.labels[0] ? t(i.labels[0].innerText) : null), v: i.value, ro: i.readOnly, dis: i.disabled})),
                    buttons: [...d.querySelectorAll('button')].map((x) => t(x.innerText) + (x.disabled ? ' [disabled]' : '')), headings: [...d.querySelectorAll('h1,h2,h3,h4,h5')].map((h) => t(h.innerText))};
            }).catch((e) => ({err: flat(e.message, 200)}));
            await snap(`vy-view-all-${n}`);
            await loc(page, 'DOIs page: "View all" window', w);
            return o;
        };
        const closeWin = async () => { const w = page.getByRole('dialog').filter({hasText: 'DOIs for all versions'}).last(); await w.getByRole('button', {name: 'Close'}).first().click().catch(() => {}); await sleep(900); };
        out.va1 = await viewAll('1-unpublished-major');
        await closeWin();
        fact('vyes-view-all-1', out.va1);
        // publish the major version
        if (!out.pub2) { out.pub2 = await publish(C.path, s.id, out.v2.newPub, 'vy-publish-v2'); save(); }
        out.db2 = dbVersions(s.id);
        // a minor version of it
        if (!out.v3) { out.v3 = await newVersion(C.path, s.id, out.v2.newPub, true, 'vy-minor'); save(); }
        out.db3 = dbVersions(s.id);
        await openDois(C.path);
        out.item3 = await readItem(s.id);
        out.va3 = await viewAll('3-after-minor');
        fact('vyes-minor', {pub2: out.pub2, db2: out.db2, v3: out.v3, db3: out.db3, item: out.item3, viewAll: out.va3});
        // change the newest version's DOI in the window
        if (!out.winEdit) {
            const w = page.getByRole('dialog').filter({hasText: 'DOIs for all versions'}).last();
            if (await w.count()) {
                const edits = w.getByRole('button', {name: 'Edit', exact: true});
                const n = await edits.count();
                // the block of the newest version: the one whose box holds the v2 DOI (after the minor, shared)
                const v2doi = (out.db2.pubs.find((p) => p.startsWith(`${out.v2.newPub}|`)) || '').split('|')[5];
                let idx = -1;
                const vals = await w.locator('input').evaluateAll((is) => is.map((i) => i.value));
                const blocks = await w.locator('input').evaluateAll((is) => is.map((i) => { let e = i; while (e && !(e.querySelector && e.querySelectorAll('button').length)) e = e.parentElement; return e ? [...e.parentElement.children].indexOf(e) : -1; }));
                idx = vals.findIndex((v) => v === v2doi);
                out.winEdit = {edits: n, vals, blocks, v2doi, idx};
                if (n) {
                    // the window has one "Edit"/"Save" for every block: edit the box that holds the newest version's DOI
                    await toastWatch();
                    await edits.first().click(); await sleep(500);
                    const box = w.locator('input').nth(Math.max(idx, 0));
                    await box.fill(`10.1234/vywin${C.path.slice(-5)}`);
                    const reqs = [];
                    const onR = (x) => { if (/\/api\/v1\/(_)?dois/.test(x.url()) && x.request().method() !== 'GET') reqs.push({m: x.request().method(), url: strip(x.url()), status: x.status()}); };
                    page.on('response', onR);
                    out.winEdit.saveButtons = await w.getByRole('button', {name: 'Save', exact: true}).count();
                    await w.getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
                    await sleep(2500); await idle(page);
                    page.off('response', onR);
                    out.winEdit.res = {reqs, toasts: await toasts(), vals: await w.locator('input').evaluateAll((is) => is.map((i) => i.value)).catch(() => null)};
                    await snap('vy-window-edit', {winEdit: out.winEdit});
                }
                out.winAfter = flat(await w.innerText().catch(() => ''), 1500);
                save();
            }
        }
        await closeWin();
        out.db4 = dbVersions(s.id);
        await page.reload(); await idle(page);
        out.va4 = await viewAll('4-after-window-edit');
        await closeWin();
        fact('vyes-window-edit', {winEdit: out.winEdit, after: out.winAfter, db: out.db4, reload: out.va4});
        // the "DOI:" line of each version (Rule 43 with "Yes")
        const pubs = dbVersions(s.id).pubs.map((p) => p.split('|')[0]);
        const lines = {};
        for (const p of pubs) lines[p] = await readDoiLine(C.path, readerPath(s.id, p), `vy-reader-${p}`);
        lines.current = await readDoiLine(C.path, readerPath(s.id), 'vy-reader-current');
        fact('vyes-lines', lines);
        // Rule 13: switch to "No", make a new version
        if (!out.switch) { out.switch = await setVersioning(C.path, false, 'vy-switch-no'); save(); }
        out.oaiPkNo = await oai(app.contextPath, 'verb=Identify', `vy-pk-identify-no-${app.name}`);
        out.versioningOnAtNo = versioningOn();
        if (!out.v4) {
            const cur = dbVersions(s.id).pubs.map((p) => p.split('|')).filter((p) => p[4] === '3').map((p) => p[0]).pop();
            out.v4 = await newVersion(C.path, s.id, cur || out.v3.newPub, false, 'vy-new-version-after-switch'); save();
        }
        await openDois(C.path);
        out.item5 = await readItem(s.id);
        out.db5 = dbVersions(s.id);
        await snap('vy-dois-after-switch');
        fact('vyes-switch', {save: out.switch, oaiPkNo: out.oaiPkNo, contextsYes: out.versioningOnAtNo, v4: out.v4, item: out.item5, db: out.db5});
        save();
    });

    // ==================================================================== fallback: Rule 43's other-version DOI (Never contexts, No and Yes)
    await sect('fallback', async () => {
        const out = S.fallback = S.fallback || {};
        for (const [k, yes] of [['FN', false], ['FY', true]]) {
            const C = await mkCtx(k, {doiPrefix: '10.1234', enabledDoiTypes: KINDS, doiCreationTime: 'never', doiVersioning: yes});
            const s = await mkSub(C, 'a', {published: true});
            const o = out[k] = out[k] || {};
            await as(C.u.mg, C.path);
            // v2: FN a new version (major), FY a minor revision; publish it
            if (!o.v2) { o.v2 = await newVersion(C.path, s.id, s.pub, yes, `${k}-v2`); save(); }
            if (!o.pub2) { o.pub2 = await publish(C.path, s.id, o.v2.newPub, `${k}-publish-v2`); save(); }
            o.noDoi = {v1: await readDoiLine(C.path, readerPath(s.id, s.pub), `${k}-reader-v1-nodoi`), cur: await readDoiLine(C.path, readerPath(s.id), `${k}-reader-cur-nodoi`), db: dbVersions(s.id)};
            // "Assign DOIs" gives the current version its DOI
            if (!o.assign) { await openDois(C.path); o.assign = await bulk([s.id], 'Assign DOIs', `${k}-assign`); save(); }
            o.withDoi = {v1: await readDoiLine(C.path, readerPath(s.id, s.pub), `${k}-reader-v1`), cur: await readDoiLine(C.path, readerPath(s.id), `${k}-reader-cur`), db: dbVersions(s.id)};
            // FY: a major version published under "Never": no DOI of its own, no minor sibling with one
            if (yes) {
                if (!o.v3) { o.v3 = await newVersion(C.path, s.id, o.v2.newPub, false, `${k}-v3-major`); save(); }
                if (!o.pub3) { o.pub3 = await publish(C.path, s.id, o.v3.newPub, `${k}-publish-v3`); save(); }
                o.major = {v3: await readDoiLine(C.path, readerPath(s.id, o.v3.newPub), `${k}-reader-v3`), v1: await readDoiLine(C.path, readerPath(s.id, s.pub), `${k}-reader-v1-after-v3`), db: dbVersions(s.id)};
                await openDois(C.path);
                o.item = await readItem(s.id);
                if (!o.back) { o.back = await setVersioning(C.path, false, `${k}-back-no`); save(); }
            }
            fact(`fallback-${k}`, o);
            save();
        }
    });

    // ==================================================================== status: Side effects 543–544 (publishing and unpublishing versions)
    await sect('status', async () => {
        const out = S.status = S.status || {};
        const C = await mkCtx('ST', {doiPrefix: '10.1234', enabledDoiTypes: ['publication']});
        const a = await mkSub(C, 'a', {published: true, title: `K2 ST registered ${C.path}`});
        const b = await mkSub(C, 'b', {published: true, title: `K2 ST unregistered ${C.path}`});
        await as(C.u.mg, C.path);
        if (!out.mark) { await openDois(C.path); out.mark = await bulk([a.id], 'Mark DOIs Registered', 'st-mark-registered'); save(); }
        out.s0 = {a: dbVersions(a.id).doiStatus, b: dbVersions(b.id).doiStatus};
        if (!out.unA) { out.unA = await unpublish(C.path, a.id, a.pub, 'st-unpublish-a'); out.unB = await unpublish(C.path, b.id, b.pub, 'st-unpublish-b'); save(); }
        out.s1 = {a: dbVersions(a.id).doiStatus, b: dbVersions(b.id).doiStatus};
        await openDois(C.path);
        out.i1 = {a: await readItem(a.id), b: await readItem(b.id)};
        await snap('st-dois-after-unpublish');
        if (!out.reA) { out.reA = await publish(C.path, a.id, a.pub, 'st-republish-a'); out.reB = await publish(C.path, b.id, b.pub, 'st-republish-b'); save(); }
        out.s2 = {a: dbVersions(a.id).doiStatus, b: dbVersions(b.id).doiStatus};
        await openDois(C.path);
        out.i2 = {a: await readItem(a.id), b: await readItem(b.id)};
        await snap('st-dois-after-republish');
        fact('status', out);
        save();
    });

    // ==================================================================== tabs: Rule 14's first line (OJS; which kinds give "Articles")
    await sect('tabs', async () => {
        if (!isOJS) return;
        const out = {};
        for (const [k, kinds] of [['T1', ['issue']], ['T2', ['representation']], ['T3', ['peerReview']]]) {
            const C = await mkCtx(k, {doiPrefix: '10.1234', enabledDoiTypes: kinds});
            await as(C.u.mg, C.path);
            await openDois(C.path);
            const tabs = await page.getByRole('tab').allInnerTexts().catch(() => []);
            const s = await snap(`tabs-${k}`);
            out[k] = {kinds, tabs: tabs.map((x) => flat(x, 40)), h1: flat(await page.locator('main h1').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 200), text: flat(s.text.main, 300)};
        }
        fact('tabs', out);
    });

    // ==================================================================== xref: Setting 6's "Update Policy DOI", Cross-feature 614–616, 623–626, 641–643, 628–630
    await sect('xref', async () => {
        const out = S.xref = S.xref || {};
        if (!isOMP) {
            const reg = {registrationAgency: 'crossrefplugin', plugins: {crossrefplugin: {enabled: true, settings: {depositorName: 'K2 Depositor', depositorEmail: 'k2dep@mail.test'}}}};
            const CR0 = await mkCtx('CR0', {doiPrefix: '10.1234', enabledDoiTypes: ['publication'], ...reg});
            const CR1 = await mkCtx('CR1', {doiPrefix: '10.1234', enabledDoiTypes: ['publication'], ...(isOJS ? {publisherInstitution: 'K2 Publisher', onlineIssn: '0378-5955'} : {}),
                registrationAgency: 'crossrefplugin', plugins: {crossrefplugin: {enabled: true, settings: {depositorName: 'K2 Depositor', depositorEmail: 'k2dep@mail.test', ...(isOJS ? {crossmark: true, updatePolicyDoi: '10.1234/policy'} : {})}}}});
            const pubA = await mkSub(CR1, 'pub', {published: true});
            const pend0 = await mkSub(CR0, 'pend', {decisions: isOPS ? [] : ['skipExternalReview']});
            for (const [k, C] of [['CR0', CR0], ['CR1', CR1]]) {
                await as(C.u.mg, C.path);
                const p = await openDoiTab(C.path, 'Registration');
                const f = await readPanel(p);
                out[`${k}-reg`] = {notice: /requirements not met|must be provided|not met/i.test(f.text), text: f.text.slice(0, 900), updatePolicy: f.inputs.filter((i) => /policy/i.test(`${i.name} ${i.label}`)), boxes: f.inputs.map((i) => `${i.label || i.name}=${i.v}`)};
                await snap(`xref-${k}-registration`);
            }
            fact('xref-registration', {CR0: out['CR0-reg'], CR1: out['CR1-reg']});
            // CR0 (Crossmark off): "DOI Versioning" "Yes" and the Registration block
            if (!out.cr0Yes) {
                await as(CR0.u.mg, CR0.path);
                const beforeV = await readPanel(await openDoiTab(CR0.path, 'Setup'));
                out.cr0Yes = {versioningBefore: beforeV.inputs.filter((i) => i.type === 'radio').map((i) => `${i.label}=${i.v}`)};
                if (isOJS || !beforeV.inputs.some((i) => i.type === 'radio' && /^Yes/.test(i.label || '') && i.v)) out.cr0Yes.setYes = await setVersioning(CR0.path, true, 'xref-cr0-yes');
                const p = await openDoiTab(CR0.path, 'Registration');
                const f = await readPanel(p);
                out.cr0Yes.updatePolicy = f.inputs.filter((i) => /policy/i.test(`${i.name} ${i.label}`));
                out.cr0Yes.text = f.text.slice(0, 900);
                await snap('xref-cr0-registration-yes');
                out.cr0Yes.setNo = await setVersioning(CR0.path, false, 'xref-cr0-no');
                const f2 = await readPanel(await openDoiTab(CR0.path, 'Registration'));
                out.cr0Yes.updatePolicyNo = f2.inputs.filter((i) => /policy/i.test(`${i.name} ${i.label}`));
                await snap('xref-cr0-registration-no');
                save();
            }
            fact('xref-update-policy', out.cr0Yes);
            // the publish window's warnings on CR0 (no publisher/ISSN, no DOI: "Upon reaching the copyediting stage" made one?)
            if (!out.pubWin2 && isOJS) {
                await as(CR0.u.mg, CR0.path);
                const w0 = await publish(CR0.path, pend0.id, pend0.pub, 'xref-cr0-publish-window', {dryRun: true});
                const pend1 = await mkSub(CR1, 'pend', {decisions: ['skipExternalReview']});
                await as(CR1.u.mg, CR1.path);
                const w1 = await publish(CR1.path, pend1.id, pend1.pub, 'xref-cr1-publish-window', {dryRun: true});
                out.pubWin2 = {cr0: w0.confirm, cr0db: dbVersions(pend0.id).pubs, cr1: w1.confirm, cr1db: dbVersions(pend1.id).pubs};
                save();
            }
            fact('xref-publish-window', out.pubWin2 || null);
            // Crossmark button (CR1, OJS) on the article page
            const rd = await readDoiLine(CR1.path, readerPath(pubA.id), 'xref-cr1-article');
            const cm = await vpage.locator('img[alt="Crossmark"], [data-target="crossmark"], a[href*="crossmark"]').count().catch(() => null);
            fact('xref-crossmark', {line: rd, crossmark: cm});
            // Plugins list rows and Tools › Import/Export
            await as(CR1.u.mg, CR1.path);
            await go(cu(CR1.path, '/management/settings/website'));
            await page.locator('#plugins-button').click().catch(() => page.getByRole('tab', {name: 'Plugins', exact: true}).first().click());
            await idle(page); await sleep(1000);
            const rows = await page.locator('tr.gridRow').filter({hasText: /Crossref|DataCite/}).evaluateAll((trs) => trs.map((tr) => ({text: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 160), on: tr.querySelector('input[type=checkbox]') ? tr.querySelector('input[type=checkbox]').checked : null})));
            await snap('xref-plugins');
            await go(cu(CR1.path, '/management/tools'));
            await page.getByRole('tab', {name: /Import\/Export/}).first().click().catch(() => {});
            await idle(page); await sleep(1000);
            const tools = flat(await page.locator('[role="tabpanel"]:visible, main').first().innerText().catch(() => ''), 1200);
            await snap('xref-tools-importexport');
            fact('xref-plugins-tools', {rows, tools});
        } else {
            // a press: Registration tab and Tools › Import/Export (no agency)
            const C = await mkCtx('CR0', {doiPrefix: '10.1234'});
            await as(C.u.mg, C.path);
            const f = await readPanel(await openDoiTab(C.path, 'Registration'));
            await snap('xref-omp-registration');
            await go(cu(C.path, '/management/tools'));
            await page.getByRole('tab', {name: /Import\/Export/}).first().click().catch(() => {});
            await idle(page); await sleep(1000);
            const tools = flat(await page.locator('[role="tabpanel"]:visible, main').first().innerText().catch(() => ''), 1200);
            await snap('xref-omp-tools');
            fact('xref-omp', {registration: f.text.slice(0, 600), tools});
        }
        // Settings › Distribution tab list; the Masthead's Publisher / ISSN boxes (OJS)
        const C = S.CR0;
        await as(C.u.mg, C.path);
        await go(cu(C.path, '/management/settings/distribution'));
        const tabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        await go(cu(C.path, '/management/settings/context'));
        const mast = await page.locator('form').first().evaluate((f) => [...f.querySelectorAll('input, select')].filter((e) => e.type !== 'hidden' && e.getClientRects().length).map((e) => (e.labels && e.labels[0] ? e.labels[0].innerText.replace(/\s+/g, ' ').trim() : e.name))).catch(() => []);
        await snap('xref-masthead');
        fact('xref-distribution-masthead', {tabs, masthead: mast.filter((x) => /Publisher|ISSN/i.test(x))});
        // "%x": the Publisher ID pattern symbol (Cross-feature 628–630)
        if (!out.xid2) {
            out.xidFirst = out.xid;
            const X = await mkCtx('XJ', {doiPrefix: '10.1234', doiCreationTime: 'never', doiSuffixType: 'customPattern', doiPublicationSuffixPattern: 'k2.%x', enablePublisherId: ['publication']});
            const xa = await mkSub(X, 'a', {...(isOPS ? {} : {decisions: ['skipExternalReview']})});
            const xb = await mkSub(X, 'b', {...(isOPS ? {} : {decisions: ['skipExternalReview']})});
            await as(X.u.mg, X.path);
            await go(wfUrl(X.path, xa.id, `publication_${xa.pub}_metadata`));
            await sleep(2500); await idle(page);
            const box = page.getByRole('textbox', {name: /Publisher ID/}).first();
            await box.waitFor({state: 'visible', timeout: 15000}).catch(() => {});
            let saved = null;
            if (await box.count()) {
                await box.fill(`pid${X.path.slice(-4)}`);
                const w = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await page.locator('form').filter({has: box}).getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
                const r = await w;
                saved = r ? r.status() : null;
            }
            const md = await snap('xref-xid-metadata');
            await openDois(X.path);
            const assign = await bulk([xa.id, xb.id], 'Assign DOIs', 'xref-xid-assign');
            await page.reload(); await idle(page);
            out.xid2 = {box: await box.count().catch(() => 0), saved, assign, withId: await readItem(xa.id), withoutId: await readItem(xb.id), dbA: dbVersions(xa.id).pubs, dbB: dbVersions(xb.id).pubs, mdText: flat(md.text.dialog, 300)};
            save();
        }
        fact('xref-xid', out.xid2);

    });

    // ==================================================================== leave: the "View all" window and a row left with an unsaved change
    await sect('leave', async () => {
        const out = {};
        const C = S.VY || S.L;
        if (!C) return;
        await as(C.u.mg, C.path);
        const s = C.subs.a;
        const typeLabel = isOJS ? 'Article' : isOMP ? 'Monograph' : 'Preprint';
        await openDois(C.path);
        const row = await expandItem(s.id);
        await row.getByRole('button', {name: 'Edit', exact: true}).first().click().catch(() => {});
        const box = row.getByRole('textbox', {name: typeLabel, exact: true}).first();
        out.rowBefore = await box.inputValue().catch(() => null);
        await box.fill('10.1234/unsavedleave');
        await snap('leave-row-typed');
        const t0 = dialogs.length;
        await go(cu(C.path, '/dashboard/editorial'));
        out.dialogsOnLeave = dialogs.slice(t0).map(({at, ...x}) => x);
        out.landed = strip(page.url());
        await openDois(C.path);
        out.rowAfter = (await readItem(s.id)).rows;
        // the "View all" window (shown only with "Yes"): type, close with "Close", reopen; "No" again afterwards
        out.yes = await setVersioning(C.path, true, 'leave-set-yes');
        await openDois(C.path);
        const r2 = await expandItem(s.id);
        const va = r2.getByRole('button', {name: 'View all', exact: true});
        if (await va.count()) {
            await va.click(); await sleep(1200);
            const w = page.getByRole('dialog').filter({hasText: 'DOIs for all versions'}).last();
            await w.getByRole('button', {name: 'Edit', exact: true}).first().click().catch(() => {});
            const b = w.locator('input').first();
            out.winBefore = await b.inputValue().catch(() => null);
            await b.fill('10.1234/unsavedwindow');
            await snap('leave-window-typed');
            const t1 = dialogs.length;
            await w.getByRole('button', {name: 'Close'}).first().click().catch(() => {});
            await sleep(1200);
            out.windowCloseDialogs = dialogs.slice(t1).map(({at, ...x}) => x);
            out.windowStillOpen = await w.isVisible().catch(() => null);
            await snap('leave-window-closed');
            await va.click().catch(() => {}); await sleep(1200);
            out.winReopen = await page.getByRole('dialog').filter({hasText: 'DOIs for all versions'}).last().locator('input').evaluateAll((is) => is.map((i) => i.value)).catch(() => null);
            await snap('leave-window-reopened');
            const unpubHref = await page.getByRole('dialog').filter({hasText: 'DOIs for all versions'}).last().locator('a').filter({hasText: 'Unpublished'}).first().getAttribute('href').catch(() => null);
            await page.getByRole('dialog').filter({hasText: 'DOIs for all versions'}).last().getByRole('button', {name: 'Close'}).first().click().catch(() => {});
            if (unpubHref) {
                const r = await go(unpubHref);
                const sn = await snap('leave-unpublished-version-link-manager');
                out.unpubLink = {href: strip(unpubHref), status: r && r.status ? r.status() : null, h1: flat(await page.locator('h1').first().innerText().catch(() => ''), 120), text: flat(sn.text.main || sn.text.body, 200)};
            }
        }
        out.no = await setVersioning(C.path, false, 'leave-set-no');
        out.db = dbVersions(s.id);
        fact('leave', out);
    });

    // ==================================================================== refs: what an export (the deposit's file) carries of the references (Cross-feature 635–636)
    await sect('refs', async () => {
        if (isOMP || !S.CR1) return;
        const C = S.CR1;
        const a = await mkSub(C, 'refs', {published: true, citationsRaw: ['Doe, J. (2020). A cited work. Journal of Things, 1(2), 3-4.', 'Roe, R. (2021). Another cited work. Book Press.']});
        await as(C.u.mg, C.path);
        await openDois(C.path);
        await itemRow(a.id).getByRole('checkbox').first().check().catch(() => {});
        if (!(await page.locator('.pkpDropdown__action:visible').count())) await page.getByRole('button', {name: /Bulk Actions/}).first().click();
        await sleep(400);
        const b = page.getByRole('button', {name: 'Export DOIs', exact: true}).filter({visible: true});
        const out = {offered: await b.count()};
        if (out.offered) {
            await b.first().click();
            const dlg = page.getByRole('dialog').filter({hasText: 'Export DOIs'}).last();
            await dlg.waitFor({timeout: T}).catch(() => {});
            out.dialog = flat(await dlg.innerText().catch(() => ''), 300);
            const dl = page.waitForEvent('download', {timeout: 30000}).catch(() => null);
            const er = page.waitForResponse((r) => /dois\/submissions\/export/.test(r.url()), {timeout: 30000}).catch(() => null);
            await toastWatch();
            await dlg.getByRole('button', {name: 'Export DOIs', exact: true}).click().catch(() => {});
            const resp = await er;
            out.exportStatus = resp ? resp.status() : null;
            out.exportBody = resp ? flat(await resp.text().catch(() => ''), 600) : null;
            await sleep(1500);
            out.toasts = await toasts();
            out.windowAfter = flat(await page.getByRole('dialog').last().innerText().catch(() => null), 500);
            await snap('refs-export-after');
            const d = resp && resp.ok() ? await dl : null;
            if (d) {
                const f = path.join(outDir(), `k2-refs-export-${app.name}${path.extname(d.suggestedFilename()) || '.xml'}`);
                await d.saveAs(f);
                let txt = fs.readFileSync(f, 'utf8'); if (/\.zip$|\.tar/.test(f)) txt = '(archive)';
                out.file = path.basename(f); out.suggested = d.suggestedFilename();
                out.citationList = (txt.match(/<citation_list>[\s\S]*?<\/citation_list>/) || [null])[0];
                out.hasRefs = /A cited work/.test(txt);
            } else out.noDownload = true;
            await snap('refs-export', {refs: out});
        }
        fact('refs', out);
    });

    // ==================================================================== unpub: the "View all" window's link to an unpublished version, opened as the manager
    await sect('unpub', async () => {
        const C = S.VY; if (!C || !S.vyes || !S.vyes.v3) return;
        await as(C.u.mg, C.path);
        const url = cu(C.path, readerPath(C.subs.a.id, S.vyes.v3.newPub));
        const r = await go(url);
        const sn = await snap('unpub-version-link-manager');
        fact('unpub', {url: strip(url), status: r && r.status ? r.status() : null, h1: flat(await page.locator('h1').first().innerText().catch(() => ''), 150), text: flat(sn.text.main || sn.text.body, 300)});
    });

    // ==================================================================== final: every scratch context of this script back to "DOI Versioning" "No"
    await sect('final', async () => {
        const keys = Object.keys(S).filter((k) => S[k] && S[k].path && S[k].id);
        const ids = keys.map((k) => S[k].id);
        const yes = db(`select ${idCol} from ${settingsTable} where setting_name='doiVersioning' and setting_value in ('1','true') and ${idCol} in (${ids.join(',') || 0})`);
        const fixed = [];
        for (const k of keys) {
            if (!yes.includes(String(S[k].id))) continue;
            if (isOPS) { fixed.push({k, skipped: 'preprint server'}); continue; }
            await as(S[k].u.mg, S[k].path);
            fixed.push({k, r: await setVersioning(S[k].path, false, `final-${k}-no`)});
        }
        fact('final', {yesBefore: yes, fixed, installYes: versioningOn(), oaiPk: await oai(app.contextPath, 'verb=Identify', `final-pk-${app.name}`)});
    });

    await V.close();
    await close();
});
