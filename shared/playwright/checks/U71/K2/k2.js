// U71 claim check, chunk K2: the editorial view of an internal round and the stage's address.
// Spec: docs/specs/U71-internal-review-stage.md lines 92–146 and 256–261 (Rules 3–7 and 19);
// footnotes r3, r4, td-pool, r5, r6, td-files, td-entry, r19.
//
// OMP press A (tag u71k2…, install review defaults, suggestions off): mgr (Press manager), ed (Press editor),
// se (Series editor, deciding), se2 (Series editor, recommend-only), se3 (Series editor, never assigned),
// fc (Funding coordinator), au (author), ri1, ri2 (Internal Reviewers), rx (External Reviewer only).
//   M1  internal R1: file, ri1 invited; ed, se, se2(rec), fc   → Rule 4 per level, td-pool, Rule 7, Rule 19
//   M0  internal R1: no reviewers                               → status "Waiting for reviewers to be assigned."
//   M2  ri1 completed · M2b ri1 completed + ri2 invited · M2c ri1 accepted · M2d ri1 declined   → status axis
//   M3  ri1 completed, requestRevisionsInternal; editor uploads a revision on screen  → revision sentences
//   M4  sendExternalReview from internal · M5 acceptFromInternal · M6 two internal rounds then External → left the stage
//   M7  declineInternal · M8 ri1 completed; ed, se2(rec): se2 records a recommendation on screen → Recommendation box
//   M9  ri1 invited: typed decision 21 (resubmit) address · E0/E1/E2 External R1 none/invited/completed (controls)
//   F1  internal R1 file: editor revision, Send to External Review (td-files 1) · F2 two internal rounds (td-files 2)
//   Q   Submission stage only (Rule 19 on a stage not reached)
// OMP press B (suggestions on): B1 internal R1, B2 External R1, both with two suggestions (Rule 5 per level).
// OJS (controls): scratch journal J0 (external R1, none), J1 (external R1, rx invited). OPS: scratch server, one preprint.
//
//   PROBE_FEATURE=U71 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U71/K2/k2.js
//   PHASES=seed,layout,status,rec,pmsg,pool,sugg,files1,files2,entry,addr,resub,ojs,ops (default all; state in k2-state-<app>.json)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const PDF = fs.readFileSync(path.join(REPO, 'apps/omp/playwright/fixtures/files/article.pdf'));
const ALL = ['seed', 'layout', 'status', 'rec', 'pmsg', 'pool', 'extra', 'sugg', 'files1', 'files2', 'entry', 'addr', 'resub', 'sweep', 'addr2', 'more', 'ojsau', 'ojs', 'ops'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const stateFile = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const pdfNamed = (name) => ({name, mimeType: 'application/pdf', buffer: PDF});

async function sect(name, fn) {
    try { await fn(); } catch (e) { log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); record(`${name.replace(/[^a-z0-9]+/gi, '-')}-FAILED`, {error: String(e.stack || e).slice(0, 1200)}); }
}
async function snap(page, name, extra) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
    if (extra) Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}
const dialogTexts = (page) => page.locator('[role="dialog"]:visible').evaluateAll((els) =>
    els.map((d) => ({
        name: d.getAttribute('aria-label') || (d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.innerText) || null,
        text: d.innerText.slice(0, 6000),
        buttons: [...d.querySelectorAll('button, a[role=button], a.pkp_button, input[type=submit], a')].filter((b) => b.getClientRects().length).map((b) => ({t: (b.getAttribute('aria-label') || b.innerText || b.value || '').trim().replace(/\s+/g, ' ').slice(0, 80), tag: b.tagName.toLowerCase()})).filter((b) => b.t).slice(0, 60),
        inputs: [...d.querySelectorAll('input, textarea, select')].map((i) => ({type: i.type, name: i.name || i.id || null, value: String(i.value).slice(0, 200), checked: i.type === 'checkbox' || i.type === 'radio' ? i.checked : undefined, label: (i.id && document.querySelector(`label[for="${i.id}"]`)?.innerText || i.closest('label')?.innerText || i.getAttribute('aria-label') || '').trim().slice(0, 160)})).slice(0, 40),
    }))).catch(() => []);
// The workflow dialog as data: header, side menu, action buttons (with classes), boxes, tables.
const wfInfo = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const dlgs = [...document.querySelectorAll('[role=dialog]')].filter(vis);
    const root = dlgs[0] || document.body;
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const tables = [...root.querySelectorAll('table')].filter(vis).map((t) => ({
        name: t.getAttribute('aria-label') || (t.getAttribute('aria-labelledby') && document.getElementById(t.getAttribute('aria-labelledby'))?.innerText.trim()) || (t.querySelector('caption') || {}).innerText?.trim() || null,
        columns: [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
        rows: [...t.querySelectorAll('tbody tr')].filter(vis).map((tr) => tr.innerText.trim().replace(/\s+/g, ' ').slice(0, 260)),
    }));
    const hs = [...root.querySelectorAll('h1,h2,h3,h4')].filter(vis);
    const headings = hs.map((e) => e.innerText.trim()).filter(Boolean).slice(0, 60);
    const region = (cy) => root.querySelector(`[data-cy="${cy}"]`);
    const actionRegion = region('workflow-action-items');
    const actionButtons = actionRegion ? [...actionRegion.querySelectorAll('button, a')].filter(vis).map((b) => ({text: b.innerText.trim().replace(/\s+/g, ' '), cls: b.className.slice(0, 200), primary: /\bbg-primary\b|isPrimary/.test(b.className), warn: /negative|warn|isWarnable/i.test(b.className), secondary: /isSecondary|secondary/.test(b.className)})) : null;
    const actionText = txt(actionRegion);
    const secondary = region('workflow-secondary-items');
    const primary = region('workflow-primary-items');
    const nav = root.querySelector('nav, [data-cy="workflow-menu"], [role="navigation"]');
    const menu = nav ? [...nav.querySelectorAll('a, button, li > span')].filter(vis).map((a) => ({text: txt(a), current: a.getAttribute('aria-current') || null})).filter((a) => a.text).slice(0, 40) : null;
    const byHeading = (re) => { const h = hs.find((x) => re.test(x.innerText.trim())); return h && h.nextElementSibling ? txt(h.nextElementSibling).slice(0, 400) : null; };
    const statusH = hs.find((x) => /Status$/.test(x.innerText.trim()));
    const statusBox = statusH ? {heading: statusH.innerText.trim(), text: txt(statusH.parentElement).slice(0, 600)} : null;
    const lines = (dlgs[0] ? dlgs[0].innerText : '').split('\n').map((l) => l.trim()).filter(Boolean);
    const closeAt = lines.indexOf('Close');
    const header = dlgs[0] ? lines.slice(closeAt >= 0 ? closeAt + 1 : 0, (closeAt >= 0 ? closeAt + 1 : 0) + 8).join(' | ') : null;
    const allButtons = [...root.querySelectorAll('button, a.pkp_button, a[role=button]')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 100);
    return {dialogCount: dlgs.length, header, headings, menu, actionButtons, actionText, statusBox, recommendation: byHeading(/^Recommendation$/i), secondaryText: txt(secondary) && txt(secondary).slice(0, 1200), primaryText: txt(primary) && txt(primary).slice(0, 1500), tables, allButtons, text: root.innerText.replace(/\s+/g, ' ').slice(0, 3000)};
});
// The decision wizard page as data (compact).
const wizInfo = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const main = document.querySelector('main') || document.body;
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const h1 = main.querySelector('h1');
    const railList = [...main.querySelectorAll('ol, ul')].find((l) => /Complete the following steps/i.test(l.getAttribute('aria-label') || ''));
    const rail = railList ? [...railList.children].map((li) => ({text: txt(li), current: li.getAttribute('aria-current') || li.querySelector('[aria-current]')?.getAttribute('aria-current') || null})) : null;
    const hs = [...main.querySelectorAll('h1,h2,h3,h4,legend')].filter(vis).map((e) => ({tag: e.tagName.toLowerCase(), text: txt(e)})).slice(0, 30);
    const btns = [...main.querySelectorAll('button, a.pkp_button, a[role=button], input[type=submit]')].filter(vis).map((b) => ({text: (b.innerText || b.getAttribute('aria-label') || b.value || '').trim().replace(/\s+/g, ' ').slice(0, 80), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'})).filter((b) => b.text && !b.text.match(/^(Bold|Italic|Superscript|Subscript|Link|Unlink|Bullet list|Numbered list|Insert Content|Upload image)$/)).slice(0, 60);
    const panels = [...main.querySelectorAll('.listPanel')].filter(vis).map((p) => ({title: txt(p.querySelector('.listPanel__title, h2, h3')), items: [...p.querySelectorAll('.listPanel__item')].map((it) => ({text: txt(it).slice(0, 220), checked: it.querySelector('input[type=checkbox]')?.checked ?? null})).slice(0, 20), emptyText: [...p.querySelectorAll('.listPanel__empty, [class*="empty"]')].map((e) => txt(e)).filter(Boolean).slice(0, 3), text: txt(p).slice(0, 600)})).slice(0, 8);
    const checkboxes = [...main.querySelectorAll('input[type=checkbox]')].filter(vis).map((i) => ({checked: i.checked, label: (i.closest('label') || i.parentElement || {}).innerText?.trim().replace(/\s+/g, ' ').slice(0, 200)})).slice(0, 30);
    const errors = [...main.querySelectorAll('.pkpFieldError, [role=alert], .pkpNotification')].filter(vis).map((e) => txt(e)).filter(Boolean).slice(0, 12);
    return {url: location.href, title: document.title, h1: txt(h1), rail, headings: hs, buttons: btns, panels, checkboxes, errors, text: main.innerText.slice(0, 6000)};
});
const topWin = (page) => page.locator('[role="dialog"]:visible').last();
async function closeTop(page) {
    const top = topWin(page);
    const c = top.locator('button:visible, a:visible').filter({hasText: /^\s*(Cancel|Close)\s*$/}).last();
    if (await c.count()) { await c.click({timeout: 5000}).catch(() => {}); await idle(page); await page.waitForTimeout(600); }
}
const isWizard = (page) => /\/decision\/record\//.test(page.url());
async function waitWizard(page) {
    await page.waitForURL(/decision\/record/, {timeout: 20000}).catch(() => {});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
    await idle(page);
    await page.waitForFunction(() => !!document.querySelector('main h1') || document.body.innerText.length > 200, null, {timeout: 15000}).catch(() => {});
    await idle(page);
}
const uploadWiz = (page) => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();

forEachApp(async (app) => {
    const sf = stateFile(app);
    const sc = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(sc, null, 2));
    const isOMP = app.name === 'omp';
    const isOJS = app.name === 'ojs';
    const isOPS = app.name === 'ops';
    const ctxUrl = (p, cp) => app.url(`/index.php/${cp || sc.t}${p}`);
    const wf = (id, key) => ctxUrl(`/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const authorWf = (id, key) => ctxUrl(`/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const rkey = (s, n = 0) => (s.rounds && s.rounds[n] ? `workflow_${s.rounds[n].stageId}_${s.rounds[n].id}` : undefined);
    const u = (n) => `${sc.t}${n}`;

    const {page, close} = await launch(app);
    const dialogsSeen = [];
    page.on('dialog', async (d) => { dialogsSeen.push({type: d.type(), message: d.message(), url: page.url()}); log('[browser dialog]', d.type(), flat(d.message(), 120)); await d.accept().catch(() => {}); });
    const as = async (who) => { await signIn(page, u(who), {contextPath: sc.t}); await idle(page); };
    const asAdmin = async () => { await signIn(page, 'admin', {contextPath: sc.t}); await idle(page); };

    async function openWorkflow(url, label, extra) {
        await page.goto(url); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(400);
        const info = await wfInfo(page).catch((e) => ({error: String(e.message)}));
        await snap(page, label, {info, ...(extra || {})});
        log(`[${label}]`, 'header:', flat(info.header, 110), '| status:', flat(info.statusBox && info.statusBox.text, 140), '| actions:', JSON.stringify((info.actionButtons || []).map((b) => `${b.text}${b.primary ? '*' : ''}${b.warn ? '!' : ''}`)), '| rec:', flat(info.recommendation, 100), '| tables:', JSON.stringify((info.tables || []).map((t) => `${t.name}:${t.rows.length}`)));
        return info;
    }
    async function readWizard(label, extra) {
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(300);
        const w = await wizInfo(page).catch((e) => ({error: String(e.message), url: page.url()}));
        await snap(page, label, {wiz: w, ...(extra || {})});
        log(`[${label}]`, 'h1:', flat(w.h1, 90), '| rail:', JSON.stringify((w.rail || []).map((r) => `${r.text}${r.current ? '*' : ''}`)), '| panels:', JSON.stringify((w.panels || []).map((p) => `${p.title}: ${p.items.map((i) => `${i.checked ? '[x]' : '[ ]'}${flat(i.text, 50)}`).join(', ')}${p.items.length ? '' : ' (empty: ' + flat(p.text, 90) + ')'}`)));
        return w;
    }
    // Press a decision button on the open workflow; record any window before the wizard.
    async function press(name, label, {choice, stopAtWindow} = {}) {
        const dlg = page.locator('[role="dialog"]:visible').first();
        const btn = dlg.locator('[data-cy="workflow-action-items"]').getByRole('button', {name, exact: true}).first();
        if (!(await btn.count())) { record(`${label}-button-absent`, {name, actions: (await wfInfo(page)).actionButtons}); log(`[${label}] button "${name}" absent`); return {absent: true}; }
        await loc(page, `${label}: "${name}"`, btn);
        const before = page.url();
        await btn.click(); await idle(page);
        const out = {pressed: name, windows: []};
        for (let i = 0; i < 3 && !isWizard(page); i++) {
            await page.waitForFunction((b) => location.href !== b || [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length > 1, before, {timeout: 10000}).catch(() => {});
            if (isWizard(page)) break;
            const ds = await dialogTexts(page);
            const top = ds[ds.length - 1];
            if (!top || ds.length < 2) break;
            const win = {name: top.name, text: flat(top.text, 900), buttons: top.buttons.map((b) => b.t), inputs: top.inputs.filter((x) => x.type === 'radio' || x.type === 'checkbox')};
            out.windows.push(win);
            await snap(page, `${label}-window${i + 1}`, {win});
            if (stopAtWindow) return out;
            const t = topWin(page);
            if (typeof choice === 'number') { const radios = t.locator('input[type=radio]'); if (await radios.count() > choice) await radios.nth(choice).check({force: true}); }
            const next = t.getByRole('button', {name: /^(Next|Yes, Continue|Continue|OK)$/}).first();
            if (await next.count()) { await next.click(); await idle(page); } else break;
        }
        if (isWizard(page)) await waitWizard(page);
        out.url = page.url();
        out.onWizard = isWizard(page);
        return out;
    }
    // Walk to the page carrying "Record Decision", reading every page; returns the pages.
    async function walk(label) {
        const pages = [];
        for (let n = 1; n < 7; n++) {
            const w = await readWizard(`${label}-p${n}`);
            pages.push({n, h1: w.h1, rail: (w.rail || []).map((r) => `${r.text}${r.current ? '*' : ''}`), headings: (w.headings || []).map((h) => h.text), panels: (w.panels || []).map((p) => ({title: p.title, items: p.items.map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.text.slice(0, 80)}`), text: flat(p.text, 300)})), checkboxes: w.checkboxes});
            const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
            if (await rec.isVisible().catch(() => false)) break;
            const cont = page.getByRole('button', {name: 'Continue', exact: true}).first();
            if (!(await cont.isVisible().catch(() => false))) break;
            await cont.click(); await idle(page); await page.waitForTimeout(400);
        }
        record(`${label}-pages`, pages);
        return pages;
    }
    async function cancelWizard(label) {
        const cancel = page.getByRole('button', {name: 'Cancel', exact: true}).first();
        if (!(await cancel.count())) { record(`${label}-cancel-absent`, {url: page.url()}); return null; }
        await cancel.click(); await page.waitForTimeout(600); await idle(page);
        const ds = await dialogTexts(page);
        const d = ds[ds.length - 1];
        const out = {dialog: d ? {name: d.name, text: flat(d.text, 400), buttons: d.buttons.map((b) => b.t)} : null};
        const cd = topWin(page).getByRole('button', {name: 'Cancel Decision'}).first();
        if (await cd.count()) { await cd.click(); await idle(page); await page.waitForTimeout(900); await idle(page); }
        out.landed = page.url();
        record(`${label}-cancel`, out);
        return out;
    }
    async function recordDecision(label) {
        const rec = page.getByRole('button', {name: 'Record Decision', exact: true}).first();
        if (!(await rec.isVisible().catch(() => false))) { record(`${label}-no-record-button`, {url: page.url()}); return {noRecord: true}; }
        await rec.click(); await idle(page);
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog]')].some((e) => e.getClientRects().length) || document.querySelector('.pkpFieldError'), null, {timeout: 30000}).catch(() => {});
        await page.waitForTimeout(800); await idle(page);
        const ds = await dialogTexts(page);
        const d = ds[ds.length - 1];
        const w = await wizInfo(page).catch(() => ({}));
        const out = {url: page.url(), dialog: d ? {name: d.name, text: flat(d.text, 600), buttons: d.buttons.map((b) => b.t)} : null, errors: w.errors};
        await snap(page, `${label}-recorded`, {out});
        log(`[${label} recorded]`, JSON.stringify(out).slice(0, 400));
        record(`${label}-record`, out);
        return out;
    }
    async function walkAndRecord(label) { const pages = await walk(label); const rec = await recordDecision(label); return {pages, rec}; }
    // A workflow read right after the action and again after a reload.
    async function readTwice(url, label) {
        const a = await openWorkflow(url, `${label}-after`);
        await page.reload(); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(400);
        const b = await wfInfo(page).catch(() => ({}));
        await snap(page, `${label}-reload`, {info: b});
        log(`[${label}-reload]`, 'status:', flat(b.statusBox && b.statusBox.text, 140), '| actions:', JSON.stringify((b.actionButtons || []).map((x) => x.text)));
        return {after: a, reload: b};
    }
    // Each round's menu entry: open it and read.
    async function menuRead(id, label) {
        const info = await openWorkflow(wf(id), `${label}-menu`);
        return info.menu;
    }
    // A fresh read of the submission from the API as admin (rounds, stage).
    async function subState(id) {
        const r = await page.request.get(ctxUrl(`/api/v1/submissions/${id}`)).catch(() => null);
        if (!r || !r.ok()) return {status: r && r.status()};
        const j = await r.json();
        return {stageId: j.stageId, status: j.status, reviewRounds: (j.reviewRounds || []).map((x) => ({id: x.id, stageId: x.stageId, round: x.round, status: x.status, statusId: x.statusId}))};
    }
    const table = (name) => page.locator('[role="dialog"]:visible').first().getByRole('table', {name, exact: true}).first();
    async function tableRows(name) {
        const t = table(name);
        if (!(await t.count())) return {absent: true};
        await idle(page);
        return t.evaluate((el) => ({columns: [...el.querySelectorAll('thead th')].map((th) => th.innerText.trim()), rows: [...el.querySelectorAll('tbody tr')].filter((r) => r.getClientRects().length).map((tr) => tr.innerText.trim().replace(/\s+/g, ' ').slice(0, 200))}));
    }
    // Legacy upload wizard: genre, file, Continue, Continue, Complete.
    async function finishUpload(fileName, label) {
        const w = uploadWiz(page);
        await w.locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000});
        await idle(page);
        const g = w.locator('select[id^="genreId"]');
        const st = {revise: await w.locator('select[id^="revisedFileId"]').evaluate((s) => [...s.options].map((o) => o.text)).catch(() => null), genres: await g.evaluate((s) => [...s.options].map((o) => o.text)).catch(() => null)};
        await snap(page, `${label}-upload-step1`, {st});
        if (await g.count()) await g.selectOption({label: isOJS ? 'Article Text' : 'Book Manuscript'}).catch(() => {});
        await w.locator('input[type="file"]').setInputFiles(pdfNamed(fileName));
        const cont = w.getByRole('button', {name: 'Continue', exact: true});
        for (let i = 0; i < 100 && !(await cont.isEnabled().catch(() => false)); i++) await page.waitForTimeout(200);
        await cont.click(); await idle(page);
        await w.getByRole('tab', {name: /^2\./}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: 30000}).catch(() => {});
        await page.waitForTimeout(500);
        await cont.click(); await idle(page);
        await w.getByRole('button', {name: 'Complete', exact: true}).waitFor({timeout: 30000}).catch(() => {});
        await w.getByRole('button', {name: 'Complete', exact: true}).click();
        await w.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(600); await idle(page);
        return st;
    }
    async function authorUploadRevision(s, n, fileName, label) {
        await as('au');
        const before = await openWorkflow(authorWf(s.id, rkey(s, n)), `${label}-au-round`);
        const btn = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload revisions', exact: true});
        await loc(page, 'author view "Upload revisions"', btn);
        if (!(await btn.count())) { record(`${label}-au-no-upload`, {status: before.statusBox}); log(`[${label}] author has no Upload revisions`); return false; }
        await btn.click();
        await finishUpload(fileName, `${label}-au`);
        const after = await openWorkflow(authorWf(s.id, rkey(s, n)), `${label}-au-round-after-upload`);
        record(`${label}-au-upload`, {revisions: (after.tables || []).find((t) => /Revisions/.test(t.name || ''))});
        return true;
    }
    async function editorUploadRevision(s, n, fileName, label) {
        await openWorkflow(wf(s.id, rkey(s, n)), `${label}-ed-round-before-upload`);
        const container = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('table', {name: 'Revisions Uploaded', exact: true})}).last();
        const btn = container.getByRole('button', {name: 'Upload', exact: true});
        await loc(page, '"Revisions Uploaded" › "Upload" (editor)', btn);
        if (!(await btn.count())) { record(`${label}-ed-no-upload`, {}); return false; }
        await btn.click();
        await finishUpload(fileName, `${label}-ed`);
        const after = await openWorkflow(wf(s.id, rkey(s, n)), `${label}-ed-round-after-upload`);
        record(`${label}-ed-upload`, {revisions: await tableRows('Revisions Uploaded')});
        return true;
    }
    // The "Files for Review" window, before and after "Show files from all accessible workflow stages.".
    async function reviewFilesWindow(label) {
        const container = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('table', {name: 'Files for Review', exact: true})}).last();
        const btn = container.getByRole('button', {name: 'Upload/Select Files', exact: true});
        if (!(await btn.count())) { record(`${label}-no-select`, {}); return null; }
        await btn.click();
        const w = page.getByRole('dialog').filter({has: page.locator('input[name="allStages"]')}).last();
        await w.waitFor({timeout: 30000}).catch(() => {}); await idle(page); await page.waitForTimeout(500);
        const read = () => w.evaluate((d) => ({title: (d.querySelector('h1, h2, .pkp_modal_title') || {}).innerText || null, rows: [...d.querySelectorAll('tr.gridRow, tbody tr')].filter((r) => r.getClientRects().length).map((tr) => ({text: tr.innerText.trim().replace(/\s+/g, ' ').slice(0, 200), checked: tr.querySelector('input[type=checkbox]')?.checked ?? null})), text: d.innerText.replace(/\s+/g, ' ').slice(0, 1500)}));
        const before = await read();
        await snap(page, `${label}-before`, {win: before});
        const all = w.locator('input[name="allStages"]');
        await loc(page, 'Files for Review window "Show files from all accessible workflow stages."', all);
        await all.check({force: true}).catch(() => {});
        await page.waitForTimeout(800); await idle(page); await page.waitForTimeout(800);
        const after = await read();
        await snap(page, `${label}-allstages`, {win: after});
        log(`[${label}] before:`, JSON.stringify(before.rows).slice(0, 300), '| all stages:', JSON.stringify(after.rows).slice(0, 400));
        const c = w.getByRole('link', {name: 'Cancel', exact: true}).or(w.getByRole('button', {name: 'Cancel', exact: true})).first();
        await c.click().catch(() => {}); await idle(page); await page.waitForTimeout(600);
        return {before, after};
    }

    // ---- K2 additions --------------------------------------------------------------------------------
    // The editorial view's layout: the language line, the regions (with their x/y), the panels in order.
    const layoutInfo = () => page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
        const root = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
        const rect = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; };
        const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
        const langEls = [...root.querySelectorAll('*')].filter((e) => vis(e) && /Current Submission Language:/.test(e.innerText || ''));
        const lang = langEls.length ? langEls[langEls.length - 1] : null;
        const region = (cy) => root.querySelector(`[data-cy="${cy}"]`);
        const items = (el) => {
            if (!el) return null;
            return [...el.querySelectorAll('h2, h3, h4, table')].filter(vis).map((e) => ({
                kind: e.tagName.toLowerCase(),
                name: e.tagName === 'TABLE' ? (e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.innerText.trim()) || (e.querySelector('caption') || {}).innerText?.trim() || null) : e.innerText.trim().slice(0, 120),
                y: Math.round(e.getBoundingClientRect().y),
            }));
        };
        const buttons = (el) => (el ? [...el.querySelectorAll('button, a[role=button], a.pkp_button')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 60) : null);
        const P = region('workflow-primary-items'); const S = region('workflow-secondary-items'); const A = region('workflow-action-items');
        const t = root.innerText;
        return {
            langLine: lang ? txt(lang).slice(0, 160) : null, langRect: rect(lang),
            primaryRect: rect(P), secondaryRect: rect(S), actionRect: rect(A),
            primary: items(P), secondary: items(S), secondaryText: txt(S) && txt(S).slice(0, 800), actionText: txt(A) && txt(A).slice(0, 400),
            primaryButtons: buttons(P), secondaryButtons: buttons(S), actionButtons: buttons(A),
            has: {suggestedByAuthor: /Reviewers Suggested by Author/.test(t), authorResponse: /Author Response/.test(t), recommendation: /\bRecommendation\b/i.test(txt(S) || '') || /\bRecommendation\b/i.test(txt(A) || ''), participants: /Participants/i.test(txt(S) || '')},
            dataCy: [...root.querySelectorAll('[data-cy]')].filter(vis).map((e) => e.getAttribute('data-cy')).filter((v, i, a) => a.indexOf(v) === i).slice(0, 40),
        };
    });
    async function view(url, label, extra) {
        const info = await openWorkflow(url, label, extra);
        const lay = await layoutInfo().catch((e) => ({error: String(e.message)}));
        record(`${label}-layout`, lay);
        log(`   [${label} layout]`, 'lang:', flat(lay.langLine, 60), '| primary:', JSON.stringify((lay.primary || []).map((x) => x.name)).slice(0, 300), '| secondary:', JSON.stringify((lay.secondary || []).map((x) => x.name)), '| has:', JSON.stringify(lay.has));
        return {info, lay};
    }
    const rid = (s, n = 0) => s.rounds[n].id;
    const sub = (id) => page.request.get(ctxUrl(`/api/v1/submissions/${id}`)).then(async (r) => (r.ok() ? r.json() : {status: r.status()})).catch(() => null);
    async function refreshRounds(key) {
        const j = await sub(sc[key].id);
        if (j && j.reviewRounds) { sc[key].rounds = j.reviewRounds.map((x) => ({id: x.id, stageId: x.stageId, round: x.round, statusId: x.statusId, status: x.status})); save(); }
        return j && {stageId: j.stageId, status: j.status, rounds: sc[key].rounds};
    }
    const keyOf = (s, stageId, round) => { const r = s.rounds.find((x) => x.stageId === stageId && x.round === round); return r ? `workflow_${stageId}_${r.id}` : null; };
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push({url: page.url().replace(/^https?:\/\/[^/]+/, ''), text: m.text().slice(0, 300)}); });
    page.on('pageerror', (e) => errs.push({url: page.url().replace(/^https?:\/\/[^/]+/, ''), pageerror: String(e.message).slice(0, 300)}));
    const errsSince = (n) => errs.slice(n);
    async function pressEntry(name, label) {
        const nav = page.locator('[role="dialog"]:visible').first().locator('nav');
        const e = nav.getByText(name, {exact: true}).first();
        await loc(page, `workflow side menu: the "${name}" stage entry`, e);
        const n0 = errs.length;
        await e.click().catch(() => {}); await idle(page); await page.waitForTimeout(1000); await idle(page);
        const info = await wfInfo(page);
        const lay = await layoutInfo().catch(() => ({}));
        await snap(page, label, {info, lay, consoleErrors: errsSince(n0)});
        log(`[${label}]`, 'header:', flat(info.header, 100), '| status:', flat(info.statusBox && info.statusBox.text, 140), '| actions:', JSON.stringify(lay.actionButtons), '| secondary:', flat(lay.secondaryText, 120), '| tables:', JSON.stringify((info.tables || []).map((t) => `${t.name}:${t.rows.length}`)), '| errs:', errsSince(n0).length);
        return {info, lay, url: page.url().replace(/^https?:\/\/[^/]+/, ''), consoleErrors: errsSince(n0)};
    }
    // The Participants "Assign" window: its predefined-message list; then leave it with something typed.
    async function assignWindow(label) {
        const btn = page.locator('[role="dialog"]:visible').first().locator('[data-cy="workflow-secondary-items"]').getByRole('button', {name: 'Assign', exact: true});
        await loc(page, `${label}: Participants "Assign"`, btn);
        if (!(await btn.count())) { record(`${label}-no-assign`, {}); return {noAssign: true}; }
        await btn.click();
        const modal = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
        await modal.locator('select[name="filterUserGroupId"]').waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(500);
        const read = await modal.evaluate((d) => ({
            templates: [...d.querySelectorAll('select[name="template"] option')].map((o) => ({text: o.text.trim(), value: o.value})),
            templateLabel: (d.querySelector('label[for^="template"]') || {}).innerText || null,
            roles: [...d.querySelectorAll('select[name="filterUserGroupId"] option')].map((o) => o.text.trim()),
            text: d.innerText.replace(/\s+/g, ' ').slice(0, 1500),
        })).catch((e) => ({error: String(e.message)}));
        await snap(page, `${label}-assign-open`, {assign: read});
        await loc(page, `${label}: Assign window "Choose a predefined message…" list`, modal.locator('select[name="template"]'));
        log(`[${label} assign]`, 'templates:', JSON.stringify((read.templates || []).map((o) => o.text)), '| roles:', JSON.stringify(read.roles));
        // leave with something typed and unsaved
        const box = modal.getByRole('textbox', {name: 'Search User By Name'});
        if (await box.count()) await box.fill('k2 unsaved');
        const n0 = dialogsSeen.length;
        const close = modal.getByRole('button', {name: /^Close/}).first();
        const cancel = modal.getByRole('link', {name: 'Cancel', exact: true}).or(modal.getByRole('button', {name: 'Cancel', exact: true})).first();
        const how = (await cancel.count()) ? 'Cancel' : 'Close';
        await ((await cancel.count()) ? cancel : close).click().catch(() => {});
        await page.waitForTimeout(900); await idle(page);
        const ds = await dialogTexts(page);
        const out = {read, leftBy: how, browserDialogs: dialogsSeen.slice(n0), dialogsAfter: ds.map((d) => ({name: d.name, text: flat(d.text, 200)}))};
        await snap(page, `${label}-assign-left`, {out});
        record(`${label}-assign`, out);
        return out;
    }
    const sleep = (ms) => page.waitForTimeout(ms);

    try {
        // ================================================================ seed
        if (on('seed') && !sc.t) await sect('seed', async () => {
            const t = tag(isOMP ? 'u71k2' : isOJS ? 'u71k2j' : 'u71k2s');
            const users = [
                {username: `${t}mgr`, roles: ['manager'], givenName: 'Mona', familyName: 'Managerk'},
                {username: `${t}se`, roles: ['sectionEditor'], givenName: 'Sid', familyName: 'Serieseditk'},
                {username: `${t}au`, roles: ['author'], givenName: 'Ada', familyName: 'Authork'},
            ];
            if (!isOPS) {
                users.push({username: `${t}ed`, roles: ['editor'], givenName: 'Edna', familyName: 'Presseditk'});
                users.push({username: `${t}rx`, roles: ['externalReviewer'], givenName: 'Rex', familyName: 'Externalonlyk'});
            }
            if (isOMP) {
                users.push({username: `${t}se2`, roles: ['sectionEditor'], givenName: 'Rhea', familyName: 'Recommendk'});
                users.push({username: `${t}se3`, roles: ['sectionEditor'], givenName: 'Una', familyName: 'Unassignedk'});
                users.push({username: `${t}fc`, roles: ['funding'], givenName: 'Finn', familyName: 'Fundingk'});
                users.push({username: `${t}ri1`, roles: ['internalReviewer'], givenName: 'Iris', familyName: 'Internalonek'});
                users.push({username: `${t}ri2`, roles: ['internalReviewer'], givenName: 'Ivo', familyName: 'Internaltwok'});
            }
            await app.api.createContext({tag: t, context: {contactName: `Principal Contact ${t}`, contactEmail: `${t}contact@mail.test`}, users});
            sc.t = t; save();
            const P = (list) => list.map((p) => (typeof p === 'string' ? {username: `${t}${p}`, role: {ed: 'editor', se: 'sectionEditor', fc: 'funding'}[p]} : {username: `${t}${p[0]}`, role: 'sectionEditor', recommendOnly: true}));
            const seed = async (key, body, ctx = t, sfx = t) => {
                const full = {tag: `${sfx}${key.toLowerCase()}`, context: ctx, submitter: `${sfx}au`, title: `K2 ${key} ${sfx}`, ...body};
                try {
                    const s = await app.api.createSubmission(full);
                    sc[key] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds, files: s.files, title: full.title, ctx};
                    log(`[seed] ${key} #${s.submissionId} stage ${s.stageId} rounds ${JSON.stringify(s.reviewRounds)}`);
                } catch (e) { log(`[seed] ${key} FAILED`, String(e.message).slice(0, 400)); sc[`${key}_error`] = String(e.message).slice(0, 600); }
                save();
            };
            const ir = (reviewers, files) => ({stage: 'internal', reviewers: reviewers.map(([n, st]) => ({username: `${t}${n}`, status: st})), ...(files ? {files: [{file: 'article.pdf'}]} : {})});
            if (isOMP) {
                const send = ['sendInternalReview'];
                await seed('M1', {decisions: send, reviewRounds: [ir([['ri1', 'invited']], true)], participants: P(['ed', 'se', ['se2'], 'fc'])});
                await seed('M0', {decisions: send, reviewRounds: [ir([])], participants: P(['ed'])});
                await seed('M2', {decisions: send, reviewRounds: [ir([['ri1', 'completed']])], participants: P(['ed'])});
                await seed('M2b', {decisions: send, reviewRounds: [ir([['ri1', 'completed'], ['ri2', 'invited']])], participants: P(['ed'])});
                await seed('M2c', {decisions: send, reviewRounds: [ir([['ri1', 'accepted']])], participants: P(['ed'])});
                await seed('M2d', {decisions: send, reviewRounds: [ir([['ri1', 'declined']])], participants: P(['ed'])});
                await seed('M3', {decisions: ['sendInternalReview', 'requestRevisionsInternal'], reviewRounds: [ir([['ri1', 'completed']], true)], participants: P(['ed'])});
                await seed('M4', {decisions: ['sendInternalReview', 'sendExternalReview'], reviewRounds: [ir([['ri1', 'completed']], true)], participants: P(['ed'])});
                await seed('M5', {decisions: ['sendInternalReview', 'acceptFromInternal'], reviewRounds: [ir([['ri1', 'completed']], true)], participants: P(['ed'])});
                await seed('M6', {decisions: ['sendInternalReview', 'newInternalReviewRound', 'sendExternalReview'], reviewRounds: [ir([['ri1', 'completed']])], participants: P(['ed'])});
                await seed('M7', {decisions: ['sendInternalReview', 'declineInternal'], reviewRounds: [ir([['ri1', 'invited']])], participants: P(['ed'])});
                await seed('M8', {decisions: send, reviewRounds: [ir([['ri1', 'completed']])], participants: P(['ed', ['se2']])});
                await seed('M9', {decisions: send, reviewRounds: [ir([['ri1', 'invited']])], participants: P(['ed'])});
                const xr = (st) => ({stage: 'external', ...(st ? {reviewers: [{username: `${t}rx`, status: st}]} : {}), files: [{file: 'article.pdf'}]});
                await seed('E0', {decisions: ['skipInternalReview'], reviewRounds: [xr(null)], participants: P(['ed'])});
                await seed('E1', {decisions: ['skipInternalReview'], reviewRounds: [xr('invited')], participants: P(['ed', 'se', 'fc'])});
                await seed('E2', {decisions: ['skipInternalReview'], reviewRounds: [xr('completed')], participants: P(['ed'])});
                await seed('F1', {decisions: send, reviewRounds: [ir([], true)], participants: P(['ed'])});
                await seed('F2', {decisions: send, reviewRounds: [ir([], true)], participants: P(['ed'])});
                await seed('Q', {files: [{file: 'article.pdf'}], participants: P(['ed', 'se'])});
                // press B: suggestions on
                const b = tag('u71k2b');
                await app.api.createContext({tag: b, context: {contactName: `Principal Contact ${b}`, contactEmail: `${b}contact@mail.test`},
                    review: {reviewerSuggestionEnabled: true},
                    users: [
                        {username: `${b}mgr`, roles: ['manager'], givenName: 'Moe', familyName: 'Managerb'},
                        {username: `${b}ed`, roles: ['editor'], givenName: 'Eli', familyName: 'Presseditb'},
                        {username: `${b}se`, roles: ['sectionEditor'], givenName: 'Sue', familyName: 'Serieseditb'},
                        {username: `${b}fc`, roles: ['funding'], givenName: 'Fay', familyName: 'Fundingb'},
                        {username: `${b}au`, roles: ['author'], givenName: 'Abe', familyName: 'Authorb'},
                        {username: `${b}rx`, roles: ['externalReviewer'], givenName: 'Roy', familyName: 'Externalonlyb'},
                        {username: `${b}ri`, roles: ['internalReviewer'], givenName: 'Ida', familyName: 'Internalb'},
                    ]});
                sc.b = b; save();
                const PB = [{username: `${b}ed`, role: 'editor'}, {username: `${b}se`, role: 'sectionEditor'}, {username: `${b}fc`, role: 'funding'}];
                const sugg = [{givenName: 'Roy', familyName: 'Externalonlyb', email: `${b}rx@mail.test`}, {givenName: 'Nora', familyName: 'Noaccountb', email: `${b}nobody@mail.test`}];
                await seed('B1', {decisions: send, reviewRounds: [{stage: 'internal', files: [{file: 'article.pdf'}]}], participants: PB, reviewerSuggestions: sugg}, b, b);
                await seed('B2', {decisions: ['skipInternalReview'], reviewRounds: [{stage: 'external', files: [{file: 'article.pdf'}]}], participants: PB, reviewerSuggestions: sugg}, b, b);
            } else if (isOJS) {
                const P2 = [{username: `${t}ed`, role: 'editor'}, {username: `${t}se`, role: 'sectionEditor'}];
                await seed('J0', {decisions: ['sendExternalReview'], reviewRounds: [{files: [{file: 'article.pdf'}]}], participants: P2});
                await seed('J1', {decisions: ['sendExternalReview'], reviewRounds: [{files: [{file: 'article.pdf'}], reviewers: [{username: `${t}rx`, status: 'invited'}]}], participants: P2});
            } else {
                await seed('Q', {participants: [{username: `${t}se`, role: 'sectionEditor'}]});
            }
        });
        if (!sc.t) throw new Error('no scratch context');
        const B = (p) => ctxUrl(p, sc.b);
        const wfB = (id, key) => B(`/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
        const asB = async (who) => { await signIn(page, `${sc.b}${who}`, {contextPath: sc.b}); await idle(page); };

        // ---- addr2: the stage addresses typed without the monograph's number (a control for the 500 seen on internalReview)
        const addr2 = async () => {
            const out = {};
            await as(isOPS ? 'mgr' : 'ed');
            const ops = isOMP ? ['internalReview', 'externalReview', 'submission', 'editorial', 'production'] : isOPS ? ['production', 'submission', 'internalReview'] : ['externalReview', 'submission', 'editorial', 'production', 'internalReview'];
            for (const op of ops) {
                const r = await page.goto(ctxUrl(`/workflow/${op}`)); await idle(page); await sleep(500);
                const s = await snap(page, `addr2-ed-${op}-noid`, {httpStatus: r && r.status()});
                out[op] = {status: r && r.status(), landed: page.url().replace(/^https?:\/\/[^/]+/, ''), main: flat(s.text && s.text.main, 160)};
            }
            record('addr2-summary', out);
            log('[addr2]', JSON.stringify(out).slice(0, 1500));
        };
        // ================================================================ OPS: read-only control (Rule 19's address)
        if (isOPS) {
            if (on('ops')) await sect('ops', async () => {
                const out = {};
                for (const who of ['mgr', 'se']) {
                    await as(who);
                    for (const op of ['internalReview', 'externalReview', 'production']) {
                        const r = await page.goto(ctxUrl(`/workflow/${op}/${sc.Q.id}`)); await idle(page); await sleep(800); await idle(page);
                        const s = await snap(page, `ops-${who}-addr-${op}`, {httpStatus: r && r.status()});
                        out[`${who}-${op}`] = {status: r && r.status(), landed: page.url().replace(/^https?:\/\/[^/]+/, ''), title: s.title, dialog: flat(s.text && s.text.dialog, 200), main: flat(s.text && s.text.main, 200)};
                    }
                }
                record('ops-summary', out);
                log('[ops]', JSON.stringify(out).slice(0, 1500));
            });
            if (on('addr2')) await sect('addr2', addr2);
            return;
        }
        // ================================================================ OJS: read-only controls
        if (isOJS) {
            if (on('ojs')) await sect('ojs', async () => {
                const out = {};
                await as('ed');
                out.j0 = (await view(wf(sc.J0.id, rkey(sc.J0)), 'ojs-ed-j0-round1')).lay;
                out.j1 = (await view(wf(sc.J1.id, rkey(sc.J1)), 'ojs-ed-j1-round1')).lay;
                out.assign = await assignWindow('ojs-ed-j1');
                await openWorkflow(wf(sc.J1.id, rkey(sc.J1)), 'ojs-ed-j1-round1-again');
                out.entry = await pressEntry('Review', 'ojs-ed-j1-review-entry-pressed');
                for (const who of ['mgr', 'ed']) {
                    await as(who);
                    for (const op of ['internalReview', 'externalReview']) {
                        const r = await page.goto(ctxUrl(`/workflow/${op}/${sc.J1.id}`)); await idle(page); await sleep(1500); await idle(page);
                        const s = await snap(page, `ojs-${who}-addr-${op}`, {httpStatus: r && r.status()});
                        out[`${who}-${op}`] = {status: r && r.status(), landed: page.url().replace(/^https?:\/\/[^/]+/, ''), title: s.title, dialog: flat(s.text && s.text.dialog, 200), main: flat(s.text && s.text.main, 160)};
                    }
                }
                record('ojs-summary', out);
                log('[ojs]', JSON.stringify({a: out['mgr-internalReview'], b: out['ed-internalReview'], c: out['ed-externalReview']}).slice(0, 1200));
            });
            if (on('addr2')) await sect('addr2', addr2);
            // the author's "Review" entry itself (control for the press's author-view stage entry)
            if (on('ojsau')) await sect('ojsau', async () => {
                const out = {};
                await as('au');
                await openWorkflow(authorWf(sc.J1.id), 'ojsau-au-j1-default');
                out.pressed = await pressEntry('Review', 'ojsau-au-j1-review-pressed');
                const n0 = errs.length;
                const t = await openWorkflow(authorWf(sc.J1.id, 'workflow_3'), 'ojsau-au-j1-review-typed');
                out.typed = {status: t.statusBox, tables: (t.tables || []).map((x) => x.name), consoleErrors: errsSince(n0)};
                record('ojsau-summary', {pressed: {status: out.pressed.info.statusBox, tables: (out.pressed.info.tables || []).map((x) => x.name), consoleErrors: out.pressed.consoleErrors}, typed: out.typed});
                log('[ojsau]', JSON.stringify({p: out.pressed.consoleErrors.map((e) => e.text.split('\n')[0]), t: out.typed}).slice(0, 1200));
            });
            return;
        }
        if (on('addr2')) await sect('addr2', addr2);

        // ================================================================ OMP
        // ---- layout: Rule 4 per level on M1 (internal R1, ri1 invited); control E1 (external R1)
        if (on('layout')) await sect('layout', async () => {
            const out = {};
            await asAdmin();
            out.admin = (await view(wf(sc.M1.id, rkey(sc.M1)), 'layout-admin-m1')).lay;
            for (const who of ['mgr', 'ed', 'se', 'se2', 'fc']) {
                await as(who);
                out[who] = (await view(wf(sc.M1.id, rkey(sc.M1)), `layout-${who}-m1`)).lay;
            }
            for (const who of ['ed', 'se', 'fc']) {
                await as(who);
                out[`${who}-E1`] = (await view(wf(sc.E1.id, rkey(sc.E1)), `layout-${who}-e1-external`)).lay;
            }
            record('layout-summary', out);
        });

        // ---- status: Rule 3 across the reachable states, internal vs external
        if (on('status')) await sect('status', async () => {
            const out = {};
            await as('ed');
            const read = async (key, label, n = 0) => { const {info} = await view(wf(sc[key].id, rkey(sc[key], n)), label); out[label] = info.statusBox; return info; };
            for (const k of ['M0', 'M1', 'M2', 'M2b', 'M2c', 'M2d', 'M3', 'M7', 'E0', 'E1', 'E2']) await read(k, `status-ed-${k.toLowerCase()}`);
            // left the stage
            for (const k of ['M4', 'M5', 'M6']) {
                await refreshRounds(k);
                for (let n = 0; n < sc[k].rounds.length; n++) await read(k, `status-ed-${k.toLowerCase()}-${sc[k].rounds[n].stageId === 2 ? 'int' : 'ext'}-r${sc[k].rounds[n].round}`, n);
            }
            // the author's box on M4's internal round (same box?)
            await as('au');
            await openWorkflow(authorWf(sc.M4.id, rkey(sc.M4, 0)), 'status-au-m4-int-r1').then((i) => { out['status-au-m4-int-r1'] = i.statusBox; });
            // revisions submitted: the editor uploads a revised file on M3's round
            await as('ed');
            await editorUploadRevision(sc.M3, 0, 'k2-m3-revision.pdf', 'status-m3');
            const same = await wfInfo(page); await snap(page, 'status-ed-m3-after-upload-same', {info: same});
            out['status-ed-m3-after-upload-same'] = same.statusBox;
            await page.reload(); await idle(page); await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {}); await idle(page); await sleep(500);
            const rel = await wfInfo(page); await snap(page, 'status-ed-m3-after-upload-reload', {info: rel});
            out['status-ed-m3-after-upload-reload'] = rel.statusBox;
            record('status-summary', out);
            log('[status]', JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v && flat(v.text, 160)]))).slice(0, 3000));
        });

        // ---- rec: se2 records a recommendation on M8; the deciding editor's right-hand column
        if (on('rec')) await sect('rec', async () => {
            const out = {};
            await as('ed');
            out.edBefore = (await view(wf(sc.M8.id, rkey(sc.M8)), 'rec-ed-m8-before')).lay;
            await as('se2');
            const b = await view(wf(sc.M8.id, rkey(sc.M8)), 'rec-se2-m8-before');
            out.se2Before = b.lay;
            const names = (b.info.actionButtons || []).map((x) => x.text);
            const pick = names.find((n) => n === 'Recommend Accept') || names.find((n) => /^Recommend/.test(n));
            out.pick = pick;
            if (pick) {
                const p = await press(pick, 'rec-se2-m8');
                if (p.onWizard) out.recorded = await walkAndRecord('rec-se2-m8');
                out.se2After = (await view(wf(sc.M8.id, rkey(sc.M8)), 'rec-se2-m8-after')).lay;
            }
            await as('ed');
            const a = await view(wf(sc.M8.id, rkey(sc.M8)), 'rec-ed-m8-after');
            out.edAfter = a.lay; out.edAfterStatus = a.info.statusBox;
            await page.reload(); await idle(page); await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {}); await idle(page); await sleep(500);
            const rl = await layoutInfo(); await snap(page, 'rec-ed-m8-after-reload', {lay: rl, info: await wfInfo(page)});
            out.edReload = rl;
            await asAdmin();
            out.adminAfter = (await view(wf(sc.M8.id, rkey(sc.M8)), 'rec-admin-m8-after')).lay;
            record('rec-summary', out);
            log('[rec]', JSON.stringify({pick, edAfter: out.edAfter && out.edAfter.secondary, admin: out.adminAfter && out.adminAfter.secondary, status: out.edAfterStatus}).slice(0, 1200));
        });

        // ---- pmsg: the Participants "Assign" window's predefined messages, internal (M1) vs external (E1); left unsaved
        if (on('pmsg')) await sect('pmsg', async () => {
            const out = {};
            await as('ed');
            await openWorkflow(wf(sc.M1.id, rkey(sc.M1)), 'pmsg-ed-m1');
            out.m1 = await assignWindow('pmsg-ed-m1');
            await openWorkflow(wf(sc.M1.id, rkey(sc.M1)), 'pmsg-ed-m1-after-leave');
            await openWorkflow(wf(sc.E1.id, rkey(sc.E1)), 'pmsg-ed-e1');
            out.e1 = await assignWindow('pmsg-ed-e1');
            await openWorkflow(wf(sc.Q.id, 'workflow_1'), 'pmsg-ed-q-submission');
            out.q = await assignWindow('pmsg-ed-q');
            await as('se');
            await openWorkflow(wf(sc.M1.id, rkey(sc.M1)), 'pmsg-se-m1');
            out.seM1 = await assignWindow('pmsg-se-m1');
            record('pmsg-summary', {m1: out.m1.read && out.m1.read.templates, e1: out.e1.read && out.e1.read.templates, q: out.q.read && out.q.read.templates, seM1: out.seM1.read && out.seM1.read.templates, leave: [out.m1.leftBy, out.m1.browserDialogs, out.m1.dialogsAfter]});
        });

        // ---- pool: td-pool on M1 (suggestions off): unsearched list, the two searches, add the external-only person
        if (on('pool')) await sect('pool', async () => {
            const out = {};
            const listInfo = async () => topWin(page).evaluate((root) => {
                const vis = (e) => e.offsetParent !== null;
                return {name: root.getAttribute('aria-label'), panels: [...root.querySelectorAll('.listPanel')].filter(vis).map((p) => ({
                    title: (p.querySelector('.listPanel__title, h2, h3') || {}).innerText?.trim() || null,
                    items: [...p.querySelectorAll('.listPanel__item')].filter(vis).map((li) => li.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6).join(' / ')),
                    empty: (p.querySelector('.listPanel__empty') || {}).innerText?.trim() || null,
                })), text: root.innerText.slice(0, 3000)};
            }).catch((e) => ({error: String(e.message)}));
            const waitList = async () => { await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return d && (d.querySelector('.listPanel__item') || /No items/.test(d.innerText)); }, null, {timeout: 20000}).catch(() => {}); await idle(page); await sleep(600); };
            const locate = () => topWin(page).locator('.listPanel').filter({hasText: 'Locate a Reviewer'}).first();
            const search = async (phrase) => { const box = locate().getByRole('searchbox').or(locate().locator('input[type="search"]')).first(); await box.fill(phrase); await box.press('Enter'); await idle(page); await sleep(1200); await idle(page); return listInfo(); };
            await as('ed');
            await openWorkflow(wf(sc.M1.id, rkey(sc.M1)), 'pool-ed-m1');
            const add = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Add Reviewer', exact: true}).first();
            await loc(page, 'Internal Review: Reviewers panel "Add Reviewer"', add);
            await add.click(); await waitList();
            out.open = await listInfo(); await snap(page, 'pool-ed-m1-add-open', {list: out.open});
            out.searchRx = await search('Externalonlyk'); await snap(page, 'pool-ed-m1-search-external', {list: out.searchRx});
            out.searchRi2 = await search('Internaltwok'); await snap(page, 'pool-ed-m1-search-internal', {list: out.searchRi2});
            // reopen the window: the unsearched list again, then add the external-only person from it
            await closeTop(page); await sleep(700);
            await openWorkflow(wf(sc.M1.id, rkey(sc.M1)), 'pool-ed-m1-again');
            await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Add Reviewer', exact: true}).first().click(); await waitList();
            out.reopen = await listInfo(); await snap(page, 'pool-ed-m1-add-reopen', {list: out.reopen});
            const item = locate().locator('.listPanel__item').filter({hasText: 'Externalonlyk'}).first();
            out.unsearchedHasRx = await item.count();
            if (out.unsearchedHasRx) {
                await item.getByRole('button', {name: /^Select/}).first().click(); await idle(page); await sleep(1500);
                await page.waitForFunction(() => { const ta = document.querySelector('textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 30000}).catch(() => {});
                await idle(page);
                const d = (await dialogTexts(page)).slice(-1)[0];
                await snap(page, 'pool-ed-m1-selected-external', {win: d && {name: d.name, text: flat(d.text, 1500)}});
                const submit = topWin(page).getByRole('button', {name: 'Add Reviewer', exact: true}).last();
                await submit.click(); await idle(page); await sleep(2500); await idle(page);
                for (let i = 0; i < 3 && (await page.locator('[role="dialog"]:visible').count()) > 1; i++) { const c = topWin(page).getByRole('button', {name: /^(Close)$/}).last(); if (await c.count()) { await c.click().catch(() => {}); await idle(page); } else break; }
                out.addSame = await tableRows('Reviewers'); await snap(page, 'pool-ed-m1-after-add-same', {rows: out.addSame});
                await openWorkflow(wf(sc.M1.id, rkey(sc.M1)), 'pool-ed-m1-after-add-reload');
                out.addReload = await tableRows('Reviewers');
            } else await closeTop(page);
            record('pool-summary', out);
            log('[pool]', JSON.stringify({open: out.open && out.open.panels, rx: out.searchRx && out.searchRx.panels, ri2: out.searchRi2 && out.searchRi2.panels, same: out.addSame, reload: out.addReload}).slice(0, 2000));
        });

        // ---- sugg: Rule 5 on press B (suggestions on): B1 internal per level, B2 external control; the Add Reviewer lists
        if (on('sugg')) await sect('sugg', async () => {
            const out = {};
            const listPanels = async () => topWin(page).evaluate((root) => [...root.querySelectorAll('.listPanel')].filter((e) => e.offsetParent !== null).map((p) => ({title: (p.querySelector('.listPanel__title, h2, h3') || {}).innerText?.trim() || null, items: [...p.querySelectorAll('.listPanel__item')].filter((e) => e.offsetParent !== null).map((li) => li.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 5).join(' / ')), empty: (p.querySelector('.listPanel__empty') || {}).innerText?.trim() || null}))).catch((e) => ({error: String(e.message)}));
            const addWin = async (label) => {
                const add = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Add Reviewer', exact: true}).first();
                if (!(await add.count())) return {noAdd: true};
                await add.click();
                await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return d && (d.querySelector('.listPanel__item') || /No items/.test(d.innerText)); }, null, {timeout: 20000}).catch(() => {});
                await idle(page); await sleep(800);
                const panels = await listPanels();
                await snap(page, `${label}-add-open`, {panels});
                await closeTop(page);
                return panels;
            };
            await asAdmin();
            out.admin = (await view(wfB(sc.B1.id, rkey(sc.B1)), 'sugg-admin-b1-internal')).lay;
            for (const who of ['mgr', 'ed', 'se', 'fc']) {
                await asB(who);
                out[`${who}-B1`] = (await view(wfB(sc.B1.id, rkey(sc.B1)), `sugg-${who}-b1-internal`)).lay;
                if (who === 'ed' || who === 'fc') out[`${who}-B1-add`] = await addWin(`sugg-${who}-b1-internal`);
                out[`${who}-B2`] = (await view(wfB(sc.B2.id, rkey(sc.B2)), `sugg-${who}-b2-external`)).lay;
                if (who === 'ed') out[`${who}-B2-add`] = await addWin(`sugg-${who}-b2-external`);
                if (who === 'ed') {
                    // the external stage's panel as data
                    const info = await wfInfo(page);
                    out['ed-B2-tables'] = (info.tables || []).map((t) => ({name: t.name, rows: t.rows}));
                }
            }
            // the Submission stage of B1 (control: the panel there)
            await asB('ed');
            out['ed-B1-submission'] = (await view(wfB(sc.B1.id, 'workflow_1'), 'sugg-ed-b1-submission')).lay;
            record('sugg-summary', out);
            log('[sugg]', JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v && v.has ? v.has : (Array.isArray(v) ? v.map((p) => `${p.title}:${(p.items || []).length}`) : v)]))).slice(0, 2500));
        });

        // ---- extra: external controls for Rule 3's precedence: a declined-only round, a recommendation over a completed review
        if (on('extra')) await sect('extra', async () => {
            const out = {};
            const t = sc.t;
            const P = (list) => list.map((p) => (typeof p === 'string' ? {username: `${t}${p}`, role: {ed: 'editor', se: 'sectionEditor', fc: 'funding'}[p]} : {username: `${t}${p[0]}`, role: 'sectionEditor', recommendOnly: true}));
            for (const [key, body] of [
                ['E3', {decisions: ['skipInternalReview'], reviewRounds: [{stage: 'external', reviewers: [{username: `${t}rx`, status: 'declined'}]}], participants: P(['ed'])}],
                ['E4', {decisions: ['skipInternalReview'], reviewRounds: [{stage: 'external', reviewers: [{username: `${t}rx`, status: 'completed'}]}], participants: P(['ed', ['se2']])}],
            ]) {
                if (sc[key]) continue;
                const s = await app.api.createSubmission({tag: `${t}${key.toLowerCase()}`, context: t, submitter: `${t}au`, title: `K2 ${key} ${t}`, ...body});
                sc[key] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save();
            }
            await as('ed');
            out.e3 = (await openWorkflow(wf(sc.E3.id, rkey(sc.E3)), 'extra-ed-e3-external-declined')).statusBox;
            out.e4Before = (await openWorkflow(wf(sc.E4.id, rkey(sc.E4)), 'extra-ed-e4-external-before')).statusBox;
            await as('se2');
            await openWorkflow(wf(sc.E4.id, rkey(sc.E4)), 'extra-se2-e4-external-before');
            const p = await press('Recommend Accept', 'extra-se2-e4');
            if (p.onWizard) await walkAndRecord('extra-se2-e4');
            await as('ed');
            const a = await view(wf(sc.E4.id, rkey(sc.E4)), 'extra-ed-e4-external-after');
            out.e4After = a.info.statusBox; out.e4Secondary = a.lay.secondary;
            record('extra-summary', out);
            log('[extra]', JSON.stringify(out).slice(0, 1200));
        });

        // ---- files1: td-files part 1 on F1 — editor revision, Send to External Review, External Review's lists
        if (on('files1')) await sect('files1', async () => {
            const S = sc.F1; const out = {};
            await as('ed');
            out.before = {ffr: null, rev: null};
            await openWorkflow(wf(S.id, rkey(S)), 'files1-ed-int-r1-before');
            out.before.ffr = await tableRows('Files for Review'); out.before.rev = await tableRows('Revisions Uploaded');
            await editorUploadRevision(S, 0, 'k2-f1-revision.pdf', 'files1');
            out.afterUpload = {ffr: await tableRows('Files for Review'), rev: await tableRows('Revisions Uploaded')};
            const p = await press('Send to External Review', 'files1-ed-send-external');
            if (!p.onWizard) throw new Error('Send to External Review did not open the wizard');
            const w = await walkAndRecord('files1-ed-send-external');
            out.pages = w.pages; out.rec = w.rec;
            out.state = await refreshRounds('F1');
            const ext = keyOf(sc.F1, 3, 1);
            await openWorkflow(wf(S.id, ext), 'files1-ed-ext-r1-after');
            out.ext = {ffr: await tableRows('Files for Review'), rev: await tableRows('Revisions Uploaded')};
            await page.reload(); await idle(page); await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {}); await idle(page); await sleep(600);
            await snap(page, 'files1-ed-ext-r1-reload', {info: await wfInfo(page)});
            out.extReload = {ffr: await tableRows('Files for Review'), rev: await tableRows('Revisions Uploaded')};
            out.window = await reviewFilesWindow('files1-ed-ext-r1-ffr-window');
            // the internal round afterwards
            await openWorkflow(wf(S.id, keyOf(sc.F1, 2, 1)), 'files1-ed-int-r1-after');
            out.intAfter = {ffr: await tableRows('Files for Review'), rev: await tableRows('Revisions Uploaded')};
            record('files1-summary', out);
            log('[files1]', JSON.stringify({before: out.before, afterUpload: out.afterUpload, pages: (out.pages || []).map((x) => ({h1: x.h1, panels: x.panels})), ext: out.ext, extReload: out.extReload, win: out.window && {b: out.window.before.rows, a: out.window.after.rows}}).slice(0, 4000));
        });

        // ---- files2: td-files part 2 on F2 — a revision on R1, Create New Review Round, a revision on R2, Send to External Review
        if (on('files2')) await sect('files2', async () => {
            const S = sc.F2; const out = {};
            await as('ed');
            await editorUploadRevision(S, 0, 'k2-f2-r1-revision.pdf', 'files2-r1');
            out.r1 = {ffr: await tableRows('Files for Review'), rev: await tableRows('Revisions Uploaded')};
            let p = await press('Create New Review Round', 'files2-ed-new-round');
            if (!p.onWizard) throw new Error('Create New Review Round did not open the wizard');
            const w1 = await walkAndRecord('files2-ed-new-round');
            out.newRoundPages = w1.pages;
            out.state1 = await refreshRounds('F2');
            const r2 = keyOf(sc.F2, 2, 2);
            await openWorkflow(wf(S.id, r2), 'files2-ed-int-r2');
            out.r2Before = {ffr: await tableRows('Files for Review'), rev: await tableRows('Revisions Uploaded')};
            const S2 = {...sc.F2, rounds: sc.F2.rounds.filter((r) => r.stageId === 2)};
            await editorUploadRevision(S2, 1, 'k2-f2-r2-revision.pdf', 'files2-r2');
            out.r2 = {ffr: await tableRows('Files for Review'), rev: await tableRows('Revisions Uploaded')};
            p = await press('Send to External Review', 'files2-ed-send-external');
            if (!p.onWizard) throw new Error('Send to External Review did not open the wizard');
            const w2 = await walkAndRecord('files2-ed-send-external');
            out.sendPages = w2.pages;
            out.state2 = await refreshRounds('F2');
            await openWorkflow(wf(S.id, keyOf(sc.F2, 3, 1)), 'files2-ed-ext-r1-after');
            out.ext = {ffr: await tableRows('Files for Review'), rev: await tableRows('Revisions Uploaded')};
            record('files2-summary', out);
            log('[files2]', JSON.stringify({r1: out.r1, newRound: (out.newRoundPages || []).map((x) => ({h1: x.h1, panels: x.panels})), r2Before: out.r2Before, r2: out.r2, send: (out.sendPages || []).map((x) => ({h1: x.h1, panels: x.panels})), ext: out.ext}).slice(0, 4000));
        });

        // ---- entry: Rule 7 — the "Internal Review" entry itself (pressed and typed), control "External Review"; the author
        if (on('entry')) await sect('entry', async () => {
            const out = {};
            for (const who of ['ed', 'se']) {
                await as(who);
                await openWorkflow(wf(sc.M1.id), `entry-${who}-m1-default`);
                out[`${who}-pressed`] = await pressEntry('Internal Review', `entry-${who}-m1-internal-pressed`);
                const n0 = errs.length;
                const typed = await view(wf(sc.M1.id, 'workflow_2'), `entry-${who}-m1-internal-typed`);
                out[`${who}-typed`] = {info: typed.info, lay: typed.lay, consoleErrors: errsSince(n0)};
            }
            await as('ed');
            await openWorkflow(wf(sc.E1.id), 'entry-ed-e1-default');
            out['ed-ext-pressed'] = await pressEntry('External Review', 'entry-ed-e1-external-pressed');
            const n1 = errs.length;
            const et = await view(wf(sc.E1.id, 'workflow_3'), 'entry-ed-e1-external-typed');
            out['ed-ext-typed'] = {info: et.info, lay: et.lay, consoleErrors: errsSince(n1)};
            // a monograph that left Internal Review (M4): the entry there
            await openWorkflow(wf(sc.M4.id), 'entry-ed-m4-default');
            out['ed-m4-internal-pressed'] = await pressEntry('Internal Review', 'entry-ed-m4-internal-pressed');
            // the author
            await as('au');
            await openWorkflow(authorWf(sc.M1.id), 'entry-au-m1-default');
            out['au-pressed'] = await pressEntry('Internal Review', 'entry-au-m1-internal-pressed');
            const n2 = errs.length;
            const at = await openWorkflow(authorWf(sc.M1.id, 'workflow_2'), 'entry-au-m1-internal-typed');
            out['au-typed'] = {info: at, consoleErrors: errsSince(n2)};
            await openWorkflow(authorWf(sc.E1.id), 'entry-au-e1-default');
            out['au-ext-pressed'] = await pressEntry('External Review', 'entry-au-e1-external-pressed');
            record('entry-summary', Object.fromEntries(Object.entries(out).map(([k, v]) => [k, {header: v.info && v.info.header, status: v.info && v.info.statusBox, actions: v.lay && v.lay.actionButtons, primary: v.lay && v.lay.primary, secondary: v.lay && v.lay.secondary, secondaryText: v.lay && v.lay.secondaryText, tables: v.info && (v.info.tables || []).map((t) => ({name: t.name, rows: t.rows})), consoleErrors: v.consoleErrors}])));
        });

        // ---- addr: Rule 19 — the typed stage address per role, per state; the other stage addresses as controls
        if (on('addr')) await sect('addr', async () => {
            const out = {};
            const go = async (label, p) => {
                const n0 = dialogsSeen.length; const e0 = errs.length;
                const r = await page.goto(ctxUrl(p)); await idle(page);
                await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 15000}).catch(() => {});
                await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 10000}).catch(() => {});
                await idle(page); await sleep(600);
                const info = await wfInfo(page).catch(() => ({}));
                const s = await snap(page, label, {info, httpStatus: r && r.status()});
                out[label] = {status: r && r.status(), landed: page.url().replace(/^https?:\/\/[^/]+/, ''), title: s.title, header: info.header, statusBox: info.statusBox && flat(info.statusBox.text, 160), dialog: flat(s.text && s.text.dialog, 200), main: flat(s.text && s.text.main, 200), browserDialogs: dialogsSeen.slice(n0), consoleErrors: errsSince(e0)};
                log(`[${label}]`, JSON.stringify(out[label]).slice(0, 500));
            };
            await asAdmin(); await go('addr-admin-m1-internal', `/workflow/internalReview/${sc.M1.id}`);
            for (const who of ['mgr', 'ed', 'se', 'se2', 'fc', 'se3', 'au', 'ri1']) {
                await as(who);
                await go(`addr-${who}-m1-internal`, `/workflow/internalReview/${sc.M1.id}`);
            }
            await as('ed');
            await go('addr-ed-e0-internal', `/workflow/internalReview/${sc.E0.id}`);
            await go('addr-ed-q-internal', `/workflow/internalReview/${sc.Q.id}`);
            await go('addr-ed-m5-internal', `/workflow/internalReview/${sc.M5.id}`);
            await go('addr-ed-m1-external', `/workflow/externalReview/${sc.M1.id}`);
            await go('addr-ed-m1-index2', `/workflow/index/${sc.M1.id}/2`);
            await go('addr-ed-m1-access', `/workflow/access/${sc.M1.id}`);
            await go('addr-ed-m1-internal-noid', `/workflow/internalReview`);
            await as('fc');
            await go('addr-fc-e0-internal', `/workflow/internalReview/${sc.E0.id}`);
            record('addr-summary', out);
        });

        // ---- resub: the resubmit sentences (Rule 3): typed decision 21 on M9's internal round as the deciding editor
        if (on('resub')) await sect('resub', async () => {
            const out = {};
            await as('ed');
            const r = await page.goto(ctxUrl(`/decision/record/${sc.M9.id}?decision=21&reviewRoundId=${rid(sc.M9)}`)); await waitWizard(page);
            const w = await readWizard('resub-ed-m9-typed-21', {httpStatus: r && r.status()});
            out.typed = {status: r && r.status(), url: page.url().replace(/^https?:\/\/[^/]+/, ''), h1: w.h1, text: flat(w.text, 500)};
            if (w.h1 && /decision|Resubmit|Revisions/i.test(w.h1) && page.getByRole('button', {name: 'Continue', exact: true}).or(page.getByRole('button', {name: 'Record Decision', exact: true}))) {
                const rec = await walkAndRecord('resub-ed-m9-typed-21');
                out.rec = rec.rec;
                const a = await openWorkflow(wf(sc.M9.id, rkey(sc.M9)), 'resub-ed-m9-after');
                out.after = a.statusBox;
                await page.reload(); await idle(page); await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {}); await idle(page); await sleep(500);
                const b = await wfInfo(page); await snap(page, 'resub-ed-m9-after-reload', {info: b});
                out.reload = b.statusBox; out.reloadActions = b.actionButtons && b.actionButtons.map((x) => x.text);
                out.state = await refreshRounds('M9');
            }
            record('resub-summary', out);
            log('[resub]', JSON.stringify(out).slice(0, 1500));
        });

        // ---- sweep: what the round page's panel controls do when pressed (M1), as ed and as fc
        if (on('sweep')) await sect('sweep', async () => {
            const out = {};
            const dlg = () => page.locator('[role="dialog"]:visible').first();
            const openTop = async (label) => { await idle(page); await sleep(1200); await idle(page); const ds = await dialogTexts(page); const d = ds[ds.length - 1]; await snap(page, label, {top: d && {name: d.name, text: flat(d.text, 1500), buttons: d.buttons.map((b) => b.t)}}); return d && {name: d.name, text: flat(d.text, 600), buttons: d.buttons.map((b) => b.t), count: ds.length}; };
            const menu = async (btn, label) => {
                if (!(await btn.count())) return {absent: true};
                await btn.click(); await sleep(500);
                const items = await page.getByRole('menuitem').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim()));
                await snap(page, label, {items});
                await btn.click().catch(() => {}); await sleep(500);
                return items;
            };
            for (const who of ['ed', 'fc']) {
                await as(who);
                await openWorkflow(wf(sc.M1.id, rkey(sc.M1)), `sweep-${who}-m1`);
                const o = {};
                o.fileMenu = await menu(dlg().getByRole('table', {name: 'Files for Review', exact: true}).getByRole('button', {name: /More Actions/}).first(), `sweep-${who}-m1-file-menu`);
                o.reviewerMenu = await menu(dlg().getByRole('table', {name: 'Reviewers', exact: true}).getByRole('button', {name: /More Actions/}).first(), `sweep-${who}-m1-reviewer-menu`);
                const method = dlg().getByRole('button', {name: 'Anonymous Reviewer/Anonymous Author', exact: true}).first();
                if (await method.count()) { await method.click(); o.method = await openTop(`sweep-${who}-m1-review-method`); await closeTop(page); }
                await openWorkflow(wf(sc.M1.id, rkey(sc.M1)), `sweep-${who}-m1-b`);
                const add = dlg().getByRole('button', {name: 'Add Reviewer', exact: true}).first();
                if (await add.count()) { await add.click(); o.addReviewer = await openTop(`sweep-${who}-m1-add-reviewer`); await closeTop(page); }
                await openWorkflow(wf(sc.M1.id, rkey(sc.M1)), `sweep-${who}-m1-c`);
                const task = dlg().getByRole('button', {name: 'Add', exact: true}).first();
                if (await task.count()) { await task.click(); o.addTask = await openTop(`sweep-${who}-m1-add-task`); await closeTop(page); }
                await openWorkflow(wf(sc.M1.id, rkey(sc.M1)), `sweep-${who}-m1-d`);
                const up = dlg().getByRole('button', {name: 'Upload/Select Files', exact: true}).first();
                if (await up.count()) { await up.click(); o.selectFiles = await openTop(`sweep-${who}-m1-select-files`); await closeTop(page); }
                out[who] = o;
                log(`[sweep ${who}]`, JSON.stringify(o).slice(0, 2500));
            }
            record('sweep-summary', out);
        });

        // ---- more: (a) an internal file picked in External Review's "Files for Review" window (F1); (b) td-pool on press B
        if (on('more')) await sect('more', async () => {
            const out = {};
            await as('ed');
            const ext = keyOf(sc.F1, 3, 1);
            await openWorkflow(wf(sc.F1.id, ext), 'more-ed-f1-ext-r1-before');
            out.before = await tableRows('Files for Review');
            const container = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('table', {name: 'Files for Review', exact: true})}).last();
            await container.getByRole('button', {name: 'Upload/Select Files', exact: true}).click();
            const w = page.getByRole('dialog').filter({has: page.locator('input[name="allStages"]')}).last();
            await w.waitFor({timeout: 30000}); await idle(page); await sleep(500);
            await w.locator('input[name="allStages"]').check({force: true}); await sleep(800); await idle(page); await sleep(800);
            const row = w.locator('tr').filter({hasText: 'article.pdf'}).first();
            out.rowFound = await row.count();
            if (out.rowFound) await row.locator('input[type=checkbox]').check({force: true});
            await snap(page, 'more-ed-f1-ext-r1-window-picked');
            const ok = w.getByRole('button', {name: 'OK', exact: true}).first();
            await loc(page, 'Files for Review window "OK"', ok);
            await ok.click(); await idle(page); await sleep(1500); await idle(page);
            out.same = await tableRows('Files for Review');
            await snap(page, 'more-ed-f1-ext-r1-after-pick-same', {rows: out.same});
            await openWorkflow(wf(sc.F1.id, ext), 'more-ed-f1-ext-r1-after-pick-reload');
            out.reload = await tableRows('Files for Review');
            await openWorkflow(wf(sc.F1.id, keyOf(sc.F1, 2, 1)), 'more-ed-f1-int-r1-after-pick');
            out.internalAfter = await tableRows('Files for Review');
            // (b) press B: search the external-only person, then add him from the suggestions list
            await asB('ed');
            await openWorkflow(wfB(sc.B1.id, rkey(sc.B1)), 'more-bed-b1-internal');
            await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Add Reviewer', exact: true}).first().click();
            await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return d && d.querySelector('.listPanel__item'); }, null, {timeout: 20000}).catch(() => {});
            await idle(page); await sleep(800);
            const locate = topWin(page).locator('.listPanel').filter({hasText: 'Locate a Reviewer'}).first();
            const box = locate.getByRole('searchbox').or(locate.locator('input[type="search"]')).first();
            await box.fill('Externalonlyb'); await box.press('Enter'); await idle(page); await sleep(1200); await idle(page);
            out.bSearch = await locate.evaluate((p) => ({items: [...p.querySelectorAll('.listPanel__item')].filter((e) => e.offsetParent !== null).map((li) => li.innerText.replace(/\s+/g, ' ').slice(0, 120)), empty: (p.querySelector('.listPanel__empty') || {}).innerText?.trim() || null}));
            await snap(page, 'more-bed-b1-search-external', {r: out.bSearch});
            const sugg = topWin(page).locator('.listPanel').filter({hasText: 'Select a Reviewer from Reviewer Suggestions'}).first();
            const item = sugg.locator('.listPanel__item').filter({hasText: 'Externalonlyb'}).first();
            out.suggItem = await item.count();
            if (out.suggItem) {
                await item.getByRole('button', {name: /^Select/}).first().click(); await idle(page); await sleep(1500);
                await page.waitForFunction(() => { const ta = document.querySelector('textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 30000}).catch(() => {});
                await idle(page);
                await snap(page, 'more-bed-b1-selected-suggestion');
                await topWin(page).getByRole('button', {name: 'Add Reviewer', exact: true}).last().click(); await idle(page); await sleep(2500); await idle(page);
                for (let i = 0; i < 3 && (await page.locator('[role="dialog"]:visible').count()) > 1; i++) { const c = topWin(page).getByRole('button', {name: /^(Close)$/}).last(); if (await c.count()) { await c.click().catch(() => {}); await idle(page); } else break; }
                out.bSame = await tableRows('Reviewers');
                await snap(page, 'more-bed-b1-after-add-same', {rows: out.bSame});
                await openWorkflow(wfB(sc.B1.id, rkey(sc.B1)), 'more-bed-b1-after-add-reload');
                out.bReload = await tableRows('Reviewers');
            } else await closeTop(page);
            record('more-summary', out);
            log('[more]', JSON.stringify(out).slice(0, 2500));
        });
    } finally {
        record('browser-dialogs', dialogsSeen);
        record('console-errors', errs);
        await close();
    }
});
