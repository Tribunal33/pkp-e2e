// U71 claim check, chunk K6: side effects (emails, Activity Log lines, notices), cross-feature interactions,
// and the Coverage section's reachability.
// Spec: docs/specs/U71-internal-review-stage.md lines 262–297 (Side effects), 345–383 (Cross-feature
// interactions), 390–452 (Coverage); footnotes e1, td-task, e4, e2, td-notice, r12, e3.
// Helpers (wfInfo, wizInfo, press, walk, recordDecision, finishUpload, …) are K3's (../K3/k3.js), copied.
//
// OMP, press T (tag u71k6…): mgr (Press manager, unassigned), ed (Press editor), ed2 (Press editor, never
// assigned: mail control), se (Series editor, deciding), se2 (Series editor, recommend-only), fc (Funding
// coordinator), ce (Copyeditor), au (author, submitter of all), ri1, ri2 (Internal Reviewers), rv1 (External).
//   E1  internal R1: file, ri1 completed; ed, se, se2(rec), fc → Request Revisions on screen, author Tasks/My
//       Submissions, three author uploads (Revised Version Uploaded: first/repeat/after sign-in), Accept
//       Submission → Copyediting notice (ed, se), the rounds after, "Move to Review" back
//   E2  external R1: file, rv1 completed; ed, se → control: Request Revisions (task), Accept (notice)
//   E3  Submission stage: file; ed, se → "Send to Internal Review" on screen (the notice), Create New Review
//       Round, Cancel Review Round on Round 2
//   E4  Submission stage: file; ed → "Accept and Skip Review" (Copyediting notice)
//   E5  Submission stage: file; ed → Submission-stage "Send to External Review" (Internal Review skipped)
//   C1  internal R1: ri1, ri2 invited; ed → Cancel Review Round: reviewer lists, "Review Cancel" letter
//   C2  external R1: rv1 invited; ed → control: Cancel Review Round on External Review
//   D1  internal R1: ri1 invited; ed, se → Decline, "Delete" per level, Revert Decline
//   N1  internal R1: file, ri1 completed; ed → Create New Review Round, editor revision on R2, Send to External
//       Review (Select Files), Cancel Review Round on External R1 (Rule 17b)
//   A1  internal R1: file, no editor; A2 external R1 no editor; A3 Submission no editor → e3
//   XB  internal R1: file, ri1 invited; ed, se2(rec) → cross-feature reads, every button's wizard, the
//       recommendation "Send to External Review"
//   V1  internal R1: ri1 completed; ed, fc → "New reviews have been submitted.", the FC's view
//   W1  internal R1: ri1 accepted; ed → "Cancel Review Round" withheld
// OMP, press PO (open review mode, minimum 1): O1 internal R1 ri1 completed; ed → author "Read Review", minimum.
// OJS, journal J: JC (R1 rv1 invited) cancel; JA (R1 rv1 completed) accept → notice; JR (R1 rv1 completed)
//   request revisions → author task; JB (R1 rv1 invited) every button's wizard; JQ queued; JN review no editor.
// OPS, server S: Q queued (se); QN queued, no participant.
//
//   PROBE_FEATURE=U71 PROBE_AGENT=ccK6 node bin/probe.js all shared/playwright/checks/U71/K6/k6.js
//   again (second run, OMP): G1 internal R1 ri1 completed; ed, se2(rec) and G2 the same with ed alone → Request
//       Revisions (task), upload, Accept (notice), Move to Review (the box on return); press PS (suggestions on): S1
//       internal R1 and S2 external R1 with the author's suggestions → the panels.
//   PHASES=seed,e1,ext,send,cancel,decline,nr,e3,xf,cov,again,ojs,ops   (default all; later phases reuse k6-state-<app>.json)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const PDF = fs.readFileSync(path.join(REPO, 'apps/omp/playwright/fixtures/files/article.pdf'));
const ALL = ['seed', 'e1', 'ext', 'send', 'cancel', 'decline', 'nr', 'e3', 'xf', 'cov', 'again', 'ojs', 'ops'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const stateFile = (app) => path.join(outDir(), `k6-state-${app.name}.json`);
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


    // ================================================================ K6's own helpers
    const inCtx = (cp) => ({
        wf: (id, key) => ctxUrl(`/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`, cp),
        authorWf: (id, key) => ctxUrl(`/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`, cp),
    });
    const asIn = async (cp, who) => { await signIn(page, `${cp}${who}`, {contextPath: cp}); await idle(page); };
    const addr = (who, cp) => `${cp || sc.t}${who}@mail.test`;
    // The composer of the wizard page on screen: subject, bodies, template list.
    async function composerRead() {
        await page.waitForFunction(() => { const m = document.querySelector('main') || document.body; const c = m.querySelector('.composer'); if (!c) return true; const inp = [...m.querySelectorAll('input')].find((i) => /subject/i.test((i.id && document.querySelector(`label[for="${i.id}"]`)?.innerText) || i.name || i.getAttribute('aria-label') || '')); return inp && inp.value.length > 0; }, null, {timeout: 15000}).catch(() => {});
        await page.waitForFunction(() => { const mce = window.tinymce || window.tinyMCE; return !document.querySelector('.composer') || (mce && mce.get().length && mce.get().every((e) => e.initialized)); }, null, {timeout: 15000}).catch(() => {});
        return page.evaluate(() => {
            const m = document.querySelector('main') || document.body;
            const vis = (e) => e && e.getClientRects().length > 0;
            const inputs = [...m.querySelectorAll('input')].filter(vis);
            const subj = inputs.find((i) => /subject/i.test((i.id && document.querySelector(`label[for="${i.id}"]`)?.innerText) || i.name || i.getAttribute('aria-label') || ''));
            const mce = window.tinymce || window.tinyMCE;
            const bodies = mce ? mce.get().filter((e) => e.initialized && vis(e.getContainer())).map((e) => e.getContent({format: 'text'}).replace(/\s+/g, ' ').slice(0, 1500)) : [];
            const templates = [...m.querySelectorAll('[class*="composer__template"]')].filter(vis).map((e) => e.innerText.trim().replace(/\s+/g, ' ').slice(0, 300)).slice(0, 8);
            const composer = !!m.querySelector('.composer');
            return {composer, subject: subj ? subj.value : null, bodies, templates};
        }).catch((e) => ({error: String(e.message)}));
    }
    // Walk every page to "Record Decision", reading the composer of each.
    async function walkMail(label) {
        const pages = [];
        for (let n = 1; n < 7; n++) {
            const w = await readWizard(`${label}-p${n}`);
            const c = await composerRead();
            pages.push({n, h1: w.h1, rail: (w.rail || []).map((r) => `${r.text}${r.current ? '*' : ''}`), panels: (w.panels || []).map((p) => ({title: p.title, items: p.items.map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.text.slice(0, 80)}`), text: flat(p.text, 300)})), composer: c});
            log(`[${label}-p${n}] subject:`, flat(c.subject, 120), '| body:', flat((c.bodies || [])[0], 200));
            const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
            if (await rec.isVisible().catch(() => false)) break;
            const cont = page.getByRole('button', {name: 'Continue', exact: true}).first();
            if (!(await cont.isVisible().catch(() => false))) break;
            await cont.click(); await idle(page); await page.waitForTimeout(400);
        }
        record(`${label}-pages`, pages);
        return pages;
    }
    async function decide(name, label, opts) {
        const p = await press(name, label, opts);
        if (!p.onWizard) { record(`${label}-no-wizard`, p); log(`[${label}] no wizard`, JSON.stringify(p).slice(0, 300)); return {press: p}; }
        const pages = await walkMail(label);
        const rec = await recordDecision(label);
        // close the "closing window" through its "View Submission" link when there is one
        const view = topWin(page).getByRole('link', {name: /View Submission/}).or(topWin(page).getByRole('button', {name: /View Submission/})).first();
        if (await view.count()) { await view.click().catch(() => {}); await idle(page); await page.waitForTimeout(800); await idle(page); }
        return {press: p, pages, rec, landedAt: page.url()};
    }
    async function activityLog(label) {
        const btn = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: /Activity Log/}).first();
        if (!(await btn.count())) { record(label, {absent: true}); log(`[${label}] no Activity Log button`); return null; }
        await btn.click();
        const dlg = topWin(page);
        await dlg.waitFor({timeout: 30000}).catch(() => {});
        await dlg.locator('table tbody tr td').first().waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(500);
        const rows = await dlg.locator('table tbody tr').evaluateAll((els) => els.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim().replace(/\s+/g, ' ').slice(0, 300))).filter((r) => r.length > 1 && !/pkpHandler|function\(/.test(r.join(' ')))).catch(() => []);
        await snap(page, label, {rows});
        log(`[${label}]`, JSON.stringify(rows.slice(0, 8)).slice(0, 1200));
        await closeTop(page);
        return rows;
    }
    // The header "Tasks" panel of the signed-in user.
    async function tasksPanel(label, dash = 'mySubmissions', cp) {
        await page.goto(ctxUrl(`/dashboard/${dash}`, cp)); await idle(page); await page.waitForTimeout(600);
        const btn = page.getByRole('button', {name: /^Tasks/}).first();
        await loc(page, 'header "Tasks" button', btn);
        const btnText = await btn.innerText().catch(() => null);
        await btn.click().catch(() => {});
        await page.waitForTimeout(1200); await idle(page);
        const links = await topWin(page).locator('a[href]').evaluateAll((els) => els.map((a) => ({text: a.innerText.trim().replace(/\s+/g, ' ').slice(0, 160), href: a.getAttribute('href')}))).catch(() => []);
        const s = await snap(page, label, {tasksButton: btnText, links});
        const panel = s.text && s.text.dialog;
        log(`[${label}] Tasks button:`, JSON.stringify(btnText), '| panel:', flat(panel, 400));
        await closeTop(page);
        return {button: flat(btnText, 60), panel: flat(panel, 1500)};
    }
    // A list row (My Submissions / editorial dashboard) for a title, with the view's header text.
    async function listRow(title, label, dash = 'mySubmissions', cp) {
        await page.goto(ctxUrl(`/dashboard/${dash}`, cp)); await idle(page); await page.waitForTimeout(800); await idle(page);
        const s = await snap(page, label);
        const row = await page.locator('tr').filter({hasText: title}).first().innerText().catch(() => null);
        const cols = await page.locator('table thead th').allInnerTexts().catch(() => []);
        log(`[${label}] row:`, flat(row, 300));
        return {row: flat(row, 500), columns: cols, header: flat(s.text && s.text.header, 300)};
    }
    async function reviewerList(who, label, cp) {
        if (cp) await asIn(cp, who); else await as(who);
        await page.goto(ctxUrl('/dashboard/reviewAssignments', cp)); await idle(page); await page.waitForTimeout(900); await idle(page);
        const s = await snap(page, label);
        const rows = await page.locator('table tbody tr').allInnerTexts().catch(() => []);
        await page.reload(); await idle(page); await page.waitForTimeout(900); await idle(page);
        const s2 = await snap(page, `${label}-reload`);
        const rows2 = await page.locator('table tbody tr').allInnerTexts().catch(() => []);
        log(`[${label}] rows:`, JSON.stringify(rows.map((r) => flat(r, 120))), '| reload:', rows2.length);
        return {rows: rows.map((r) => flat(r, 200)), rowsReload: rows2.map((r) => flat(r, 200)), main: flat(s.text && s.text.main, 800)};
    }
    // Mailpit, scoped by recipient: summaries (subject, from), optionally with text bodies.
    async function mails(email, {subject, withBody, wait = 1500} = {}) {
        await page.waitForTimeout(wait);
        const r = await app.mail._search({to: email, subject}).catch(() => ({}));
        const out = [];
        for (const m of (r.messages || []).slice(0, 12)) {
            const o = {subject: m.Subject, from: m.From && `${m.From.Name} <${m.From.Address}>`, to: (m.To || []).map((x) => x.Address), created: m.Created, id: m.ID};
            if (withBody) { const f = await app.mail.fullMessage(m.ID).catch(() => null); o.text = f ? flat(f.Text, 1500) : null; }
            out.push(o);
        }
        return out;
    }
    async function waitMail(email, subject, timeoutMs = 20000) {
        try { const m = await app.mail.find({to: email, subject, timeoutMs}); return {found: true, subject: m.Subject, from: m.From && `${m.From.Name} <${m.From.Address}>`}; } catch (e) { return {found: false, error: flat(e.message, 200)}; }
    }
    // Author: attach a file in the upload window's first step, then close the window by its header "Close".
    async function authorAttachThenClose(S, n, fileName, label) {
        await as('au');
        await openWorkflow(authorWf(S.id, rkey(S, n)), `${label}-au-round-before`);
        const btn = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload revisions', exact: true});
        if (!(await btn.count())) { record(`${label}-no-upload`, {}); return false; }
        await btn.click();
        const w = uploadWiz(page);
        await w.locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000});
        await idle(page);
        const g = w.locator('select[id^="genreId"]');
        if (await g.count()) await g.selectOption({label: 'Book Manuscript'}).catch(() => {});
        await w.locator('input[type="file"]').setInputFiles(pdfNamed(fileName));
        const cont = w.getByRole('button', {name: 'Continue', exact: true});
        for (let i = 0; i < 100 && !(await cont.isEnabled().catch(() => false)); i++) await page.waitForTimeout(200);
        await snap(page, `${label}-attached`);
        const x = w.getByRole('button', {name: /^Close/}).first();
        await loc(page, 'upload window header "Close"', x);
        await x.click().catch(() => {});
        await w.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(800);
        const after = await wfInfo(page).catch(() => ({}));
        await snap(page, `${label}-closed-same-page`, {info: after});
        return {tablesSamePage: (after.tables || []).map((t) => `${t.name}: ${t.rows.join(' / ')}`)};
    }
    const brief = (i) => (i ? {header: flat(i.header, 160), status: i.statusBox, actions: (i.actionButtons || []).map((b) => b.text), rec: flat(i.recommendation, 200), headings: i.headings, tables: (i.tables || []).map((t) => `${t.name}: [${t.columns.join('|')}] ${t.rows.length}: ${t.rows.slice(0, 4).join(' / ')}`), menu: (i.menu || []).map((m) => m.text)} : null);
    const hasText = (i, re) => !!(i && re.test(i.text || ''));

    const dlgText = async () => flat(await page.locator('[role="dialog"]:visible').first().innerText().catch(() => ''), 20000) || '';
    const noticeOf = (t) => ({notificationHeading: /\bNotification\b/i.test(t), assignCopyeditor: /Assign a copyeditor using the Assign link in the Participants list\./.test(t), awaitingCopyedits: /Awaiting Copyedits\./.test(t), editorMustBeAssigned: /An editor must be assigned before review is initiated/.test(t), internalStarted: /Internal review process started/i.test(t)});
    async function stageRead(url, label) {
        const info = await openWorkflow(url, label);
        const t = await dlgText();
        await page.reload(); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(500);
        const t2 = await dlgText();
        await snap(page, `${label}-reload`, {notice: noticeOf(t2)});
        const r = {info: brief(info), notice: noticeOf(t), noticeReload: noticeOf(t2)};
        log(`[${label}] notice:`, JSON.stringify(r.notice), '| reload:', JSON.stringify(r.noticeReload));
        return r;
    }

    try {
        // ================================================================ seed
        if (on('seed') && !sc.t) await sect('seed', async () => {
            const t = tag(isOMP ? 'u71k6' : isOJS ? 'u71k6j' : 'u71k6s');
            const users = [
                {username: `${t}mgr`, roles: ['manager'], givenName: 'Maya', familyName: 'Managerson'},
                {username: `${t}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Serieseditor'},
                {username: `${t}au`, roles: ['author'], givenName: 'Alex', familyName: 'Authorson'},
            ];
            if (!isOPS) {
                users.push({username: `${t}ed`, roles: ['editor'], givenName: 'Eve', familyName: 'Presseditor'});
                users.push({username: `${t}rv1`, roles: ['externalReviewer'], givenName: 'Rita', familyName: 'Externalrev'});
            }
            if (isOMP) {
                users.push({username: `${t}ed2`, roles: ['editor'], givenName: 'Ed', familyName: 'Unassigned'});
                users.push({username: `${t}se2`, roles: ['sectionEditor'], givenName: 'Selma', familyName: 'Recommender'});
                users.push({username: `${t}fc`, roles: ['funding'], givenName: 'Fran', familyName: 'Funder'});
                users.push({username: `${t}ce`, roles: ['copyeditor'], givenName: 'Cora', familyName: 'Copyeditor'});
                users.push({username: `${t}ri1`, roles: ['internalReviewer'], givenName: 'Ian', familyName: 'Internalone'});
                users.push({username: `${t}ri2`, roles: ['internalReviewer'], givenName: 'Ina', familyName: 'Internaltwo'});
            }
            await app.api.createContext({tag: t, context: {name: `K6 ${t}`, contactName: `Principal Contact ${t}`, contactEmail: `${t}contact@mail.test`}, users});
            sc.t = t; save();
            const P = (list) => list.map((p) => (typeof p === 'string' ? {username: `${t}${p}`, role: {ed: 'editor', se: 'sectionEditor', fc: 'funding'}[p]} : {username: `${t}${p[0]}`, role: 'sectionEditor', recommendOnly: true}));
            const seed = async (key, body, ctx) => {
                const c = ctx || t;
                const full = {tag: `${c}${key.toLowerCase()}`, context: c, submitter: `${c}au`, title: `K6 ${key} ${c}`, ...body};
                const s = await app.api.createSubmission(full);
                sc[key] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds, title: full.title, ctx: c};
                log(`[seed] ${key} #${s.submissionId} stage ${s.stageId} rounds ${JSON.stringify(s.reviewRounds)}`);
                save();
            };
            const file = [{file: 'article.pdf'}];
            const ir = (reviewers, files) => ({stage: 'internal', reviewers: reviewers.map(([n, st]) => ({username: `${t}${n}`, status: st})), ...(files ? {files: file} : {})});
            const er = (reviewers, files) => ({stage: 'external', reviewers: reviewers.map(([n, st]) => ({username: `${t}${n}`, status: st})), ...(files ? {files: file} : {})});
            if (isOMP) {
                const send = ['sendInternalReview'];
                await seed('E1', {decisions: send, reviewRounds: [ir([['ri1', 'completed']], true)], participants: P(['ed', 'se', ['se2'], 'fc'])});
                await seed('E2', {decisions: ['skipInternalReview'], reviewRounds: [er([['rv1', 'completed']], true)], participants: P(['ed', 'se'])});
                await seed('E3', {files: file, participants: P(['ed', 'se'])});
                await seed('E4', {files: file, participants: P(['ed'])});
                await seed('E5', {files: file, participants: P(['ed'])});
                await seed('C1', {decisions: send, reviewRounds: [ir([['ri1', 'invited'], ['ri2', 'invited']])], participants: P(['ed'])});
                await seed('C2', {decisions: ['skipInternalReview'], reviewRounds: [er([['rv1', 'invited']])], participants: P(['ed'])});
                await seed('D1', {decisions: send, reviewRounds: [ir([['ri1', 'invited']])], participants: P(['ed', 'se'])});
                await seed('N1', {decisions: send, reviewRounds: [ir([['ri1', 'completed']], true)], participants: P(['ed'])});
                await seed('A1', {decisions: send, reviewRounds: [ir([], true)]});
                await seed('A2', {decisions: ['skipInternalReview'], reviewRounds: [er([], true)]});
                await seed('A3', {files: file});
                await seed('XB', {decisions: send, reviewRounds: [ir([['ri1', 'invited']], true)], participants: P(['ed', ['se2']])});
                await seed('V1', {decisions: send, reviewRounds: [ir([['ri1', 'completed']], true)], participants: P(['ed', 'fc'])});
                await seed('W1', {decisions: send, reviewRounds: [ir([['ri1', 'accepted']])], participants: P(['ed'])});
                // press PO: open review mode, minimum 1
                const o = tag('u71k6o');
                await app.api.createContext({tag: o, context: {name: `K6 open ${o}`, contactName: `Principal Contact ${o}`, contactEmail: `${o}contact@mail.test`}, review: {defaultReviewMode: 'open', numReviewsPerSubmission: '1'}, users: [
                    {username: `${o}ed`, roles: ['editor'], givenName: 'Olga', familyName: 'Openeditor'},
                    {username: `${o}au`, roles: ['author'], givenName: 'Otto', familyName: 'Openauthor'},
                    {username: `${o}ri1`, roles: ['internalReviewer'], givenName: 'Oona', familyName: 'Openreviewer'},
                ]});
                sc.o = o; save();
                await seed('O1', {decisions: send, reviewRounds: [{stage: 'internal', reviewers: [{username: `${o}ri1`, status: 'completed'}]}], participants: [{username: `${o}ed`, role: 'editor'}]}, o);
            } else if (isOJS) {
                const xr = (st, files) => ({reviewers: st ? [{username: `${t}rv1`, status: st}] : [], ...(files ? {files: file} : {})});
                await seed('JC', {decisions: ['sendExternalReview'], reviewRounds: [xr('invited')], participants: P(['ed'])});
                await seed('JA', {decisions: ['sendExternalReview'], reviewRounds: [xr('completed', true)], participants: P(['ed'])});
                await seed('JR', {decisions: ['sendExternalReview'], reviewRounds: [xr('completed', true)], participants: P(['ed'])});
                await seed('JB', {decisions: ['sendExternalReview'], reviewRounds: [xr('invited', true)], participants: P(['ed'])});
                await seed('JQ', {files: file, participants: P(['ed'])});
                await seed('JN', {decisions: ['sendExternalReview'], reviewRounds: [xr(null, true)]});
            } else {
                await seed('Q', {participants: [{username: `${t}se`, role: 'sectionEditor'}]});
                await seed('QN', {});
            }
        });
        if (!sc.t) throw new Error('no scratch context');

        // ================================================================ OPS: read-only controls
        if (isOPS) {
            if (on('ops')) await sect('ops', async () => {
                const out = {};
                for (const who of ['mgr', 'se']) {
                    await as(who);
                    out[`${who}Q`] = brief(await openWorkflow(wf(sc.Q.id), `ops-${who}-q`));
                    out[`${who}QN`] = brief(await openWorkflow(wf(sc.QN.id), `ops-${who}-qn`));
                    out[`${who}QNnotice`] = noticeOf(await dlgText());
                    out[`${who}Tasks`] = await tasksPanel(`ops-${who}-tasks`, 'editorial');
                    out[`${who}Row`] = await listRow(sc.Q.title, `ops-${who}-dashboard`, 'editorial');
                }
                await as('au');
                out.auRow = await listRow(sc.Q.title, 'ops-au-mysubmissions');
                await as('mgr');
                await page.goto(ctxUrl('/management/settings/workflow')); await idle(page);
                const s = await snap(page, 'ops-mgr-settings-workflow');
                out.settingsTabs = await page.getByRole('tab').allInnerTexts().catch(() => []);
                record('ops-summary', out);
                log('[ops]', JSON.stringify(out).slice(0, 2000));
            });
            return;
        }

        // ================================================================ OJS: controls
        if (isOJS) {
            if (on('ojs')) await sect('ojs', async () => {
                const out = {};
                await as('rv1');
                out.rvBefore = await reviewerList('rv1', 'ojs-rv1-list-before');
                await as('ed');
                // every Review decision button opens the wizard
                out.buttons = {};
                const jb = await openWorkflow(wf(sc.JB.id, rkey(sc.JB)), 'ojs-ed-jb-round1');
                out.jbActions = (jb.actionButtons || []).map((b) => b.text);
                for (const name of out.jbActions) {
                    await openWorkflow(wf(sc.JB.id, rkey(sc.JB)), `ojs-ed-jb-before-${name.replace(/\W+/g, '-').toLowerCase()}`);
                    const p = await press(name, `ojs-ed-jb-${name.replace(/\W+/g, '-').toLowerCase()}`, {stopAtWindow: true});
                    out.buttons[name] = {onWizard: !!p.onWizard, url: page.url().replace(/^.*index\.php/, ''), windows: (p.windows || []).map((w) => w.name || flat(w.text, 80))};
                    if (p.onWizard) { const w = await readWizard(`ojs-ed-jb-${name.replace(/\W+/g, '-').toLowerCase()}-wizard`); out.buttons[name].h1 = w.h1; }
                    else await closeTop(page);
                }
                // Cancel Review Round: the reviewer's letter, the list
                await openWorkflow(wf(sc.JC.id, rkey(sc.JC)), 'ojs-ed-jc-before');
                out.jcCancel = await decide('Cancel Review Round', 'ojs-ed-jc-cancel');
                out.jcLog = await activityLog('ojs-ed-jc-log');
                out.rvMail = await mails(addr('rv1'), {subject: 'cancelled', withBody: true, wait: 3000});
                out.rvAfter = await reviewerList('rv1', 'ojs-rv1-list-after');
                // Accept from review → the Copyediting notice
                await as('ed');
                await openWorkflow(wf(sc.JA.id, rkey(sc.JA)), 'ojs-ed-ja-before');
                out.jaAccept = await decide('Accept Submission', 'ojs-ed-ja-accept');
                out.jaCopyediting = await stageRead(wf(sc.JA.id, 'workflow_4'), 'ojs-ed-ja-copyediting');
                // Request Revisions → the author's task
                await openWorkflow(wf(sc.JR.id, rkey(sc.JR)), 'ojs-ed-jr-before');
                out.jrRequest = await decide('Request Revisions', 'ojs-ed-jr-request');
                await as('au');
                out.jrTasks = await tasksPanel('ojs-au-tasks-after-request');
                out.jrRow = await listRow(sc.JR.title, 'ojs-au-mysubmissions-after-request');
                // the dashboards' stage labels, the menus, no Internal Review
                out.auQRow = await listRow(sc.JQ.title, 'ojs-au-mysubmissions');
                await as('ed');
                out.edRows = await listRow(sc.JQ.title, 'ojs-ed-dashboard', 'editorial');
                out.edRowJB = await listRow(sc.JB.title, 'ojs-ed-dashboard-jb', 'editorial');
                out.jq = brief(await openWorkflow(wf(sc.JQ.id), 'ojs-ed-jq-submission'));
                // e3 control: a review round with no editor
                await as('mgr');
                const jn = await openWorkflow(wf(sc.JN.id, rkey(sc.JN)), 'ojs-mgr-jn-round-noeditor');
                out.jnNotice = noticeOf(await dlgText());
                out.jnSubmission = noticeOf((await openWorkflow(wf(sc.JN.id, 'workflow_1'), 'ojs-mgr-jn-submission-noeditor'), await dlgText()));
                out.mgrTasks = await tasksPanel('ojs-mgr-tasks', 'editorial');
                // settings: the review settings (no "Internal Review Guidelines")
                await page.goto(ctxUrl('/management/settings/workflow#review')); await idle(page); await page.waitForTimeout(800);
                await snap(page, 'ojs-mgr-settings-review');
                const guidance = page.getByRole('tab', {name: /Reviewer Guidance/}).first();
                if (await guidance.count()) { await guidance.click(); await idle(page); await page.waitForTimeout(600); }
                const g = await snap(page, 'ojs-mgr-settings-review-guidance');
                out.guidanceHasInternal = /Internal Review Guidelines/i.test(g.text && g.text.main || '');
                record('ojs-summary', out);
                log('[ojs]', JSON.stringify(out).slice(0, 3000));
            });
            return;
        }

        // ================================================================ OMP
        const X = sc;
        // ---- e1: Request Revisions, the author's task and row, the uploads' email, Accept, the notice, Move to Review
        if (on('e1')) await sect('e1', async () => {
            const S = X.E1; const out = {};
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'e1-ed-before');
            out.request = await decide('Request Revisions', 'e1-ed-request');
            out.requested = await readTwice(wf(S.id, rkey(S)), 'e1-ed-requested');
            out.requestLog = await activityLog('e1-ed-log-after-request');
            out.auMailRequest = await mails(addr('au'), {wait: 2500});
            out.ri1MailRequest = await mails(addr('ri1'));
            await as('au');
            out.tasks1 = await tasksPanel('e1-au-tasks-after-request');
            out.row1 = await listRow(S.title, 'e1-au-mysubmissions-after-request');
            // upload 1: attach in the first step, close by the header "Close"
            out.up1 = await authorAttachThenClose(S, 0, 'k6-e1-rev1.pdf', 'e1-up1');
            out.up1Reload = brief(await openWorkflow(authorWf(S.id, rkey(S)), 'e1-au-round-after-up1-reload'));
            out.mail1 = {};
            for (const w of ['ed', 'se', 'se2']) out.mail1[w] = await waitMail(addr(w), 'Revised Version Uploaded');
            for (const w of ['ed', 'se', 'se2', 'fc', 'mgr', 'ed2', 'au']) out.mail1[`${w}List`] = await mails(addr(w), {subject: 'Revised Version Uploaded', wait: 200});
            // upload 2, completed, same day, no editor signed in since
            out.up2 = await authorUploadRevision(S, 0, 'k6-e1-rev2.pdf', 'e1-up2');
            await page.waitForTimeout(6000);
            out.mail2 = {};
            for (const w of ['ed', 'se', 'se2']) out.mail2[w] = await mails(addr(w), {subject: 'Revised Version Uploaded', wait: 200});
            out.tasks2 = await tasksPanel('e1-au-tasks-after-upload');
            out.row2 = await listRow(S.title, 'e1-au-mysubmissions-after-upload');
            // the editor signs in and reads the round
            await as('ed');
            out.revised = await readTwice(wf(S.id, rkey(S)), 'e1-ed-revised');
            // upload 3 after ed signed in (se did not)
            out.up3 = await authorUploadRevision(S, 0, 'k6-e1-rev3.pdf', 'e1-up3');
            await page.waitForTimeout(6000);
            out.mail3 = {};
            for (const w of ['ed', 'se', 'se2']) out.mail3[w] = await mails(addr(w), {subject: 'Revised Version Uploaded', wait: 200});
            // Accept Submission → Copyediting, the notice for the assigned editors
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'e1-ed-before-accept');
            out.accept = await decide('Accept Submission', 'e1-ed-accept');
            out.copyEd = await stageRead(wf(S.id, 'workflow_4'), 'e1-ed-copyediting');
            out.acceptLog = await activityLog('e1-ed-log-after-accept');
            out.auMailAccept = await mails(addr('au'), {wait: 2000});
            out.ri1MailAccept = await mails(addr('ri1'));
            out.edTasks = await tasksPanel('e1-ed-tasks-after-accept', 'editorial');
            await as('se');
            out.copySe = await stageRead(wf(S.id, 'workflow_4'), 'e1-se-copyediting');
            await as('ed');
            out.internalAfter = brief(await openWorkflow(wf(S.id, rkey(S)), 'e1-ed-internal-round-after-accept'));
            out.externalEntry = brief(await openWorkflow(wf(S.id, 'workflow_3'), 'e1-ed-external-entry-after-accept'));
            out.edRow = await listRow(S.title, 'e1-ed-dashboard-after-accept', 'editorial');
            // "Move to Review" from Copyediting
            await openWorkflow(wf(S.id, 'workflow_4'), 'e1-ed-copyediting-before-back');
            out.back = await decide('Move to Review', 'e1-ed-back');
            out.backLanding = await readTwice(wf(S.id), 'e1-ed-back-landing');
            out.backLog = await activityLog('e1-ed-log-after-back');
            record('e1-summary', out);
            log('[e1]', JSON.stringify({mail1: out.mail1, mail2: out.mail2, mail3: out.mail3, tasks1: out.tasks1, tasks2: out.tasks2, row1: out.row1.row, row2: out.row2.row}).slice(0, 4000));
        });

        // ---- ext: the External Review controls (task, notice)
        if (on('ext')) await sect('ext', async () => {
            const S = X.E2; const out = {};
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'ext-ed-before');
            out.request = await decide('Request Revisions', 'ext-ed-request');
            out.requestLog = await activityLog('ext-ed-log-after-request');
            await as('au');
            out.tasks = await tasksPanel('ext-au-tasks-after-request');
            out.row = await listRow(S.title, 'ext-au-mysubmissions-after-request');
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'ext-ed-before-accept');
            out.accept = await decide('Accept Submission', 'ext-ed-accept');
            out.copyEd = await stageRead(wf(S.id, 'workflow_4'), 'ext-ed-copyediting');
            await as('se');
            out.copySe = await stageRead(wf(S.id, 'workflow_4'), 'ext-se-copyediting');
            record('ext-summary', out);
            log('[ext]', JSON.stringify({tasks: out.tasks, row: out.row.row, copyEd: out.copyEd.notice, copySe: out.copySe.notice}).slice(0, 2000));
        });

        // ---- send: "Send to Internal Review" on screen (the notice), new round, cancel Round 2; skip paths
        if (on('send')) await sect('send', async () => {
            const S = X.E3; const out = {};
            await as('ed');
            out.submission = brief(await openWorkflow(wf(S.id, 'workflow_1'), 'send-ed-e3-submission'));
            out.send = await decide('Send to Internal Review', 'send-ed-e3-send');
            out.landing = await readTwice(wf(S.id), 'send-ed-e3-landing');
            out.sendLog = await activityLog('send-ed-e3-log-after-send');
            out.auMailSend = await mails(addr('au'), {wait: 2500});
            out.edTasks = await tasksPanel('send-ed-tasks-after-send', 'editorial');
            await as('au');
            out.auTasks = await tasksPanel('send-au-tasks-after-send');
            out.auRow = await listRow(S.title, 'send-au-mysubmissions-after-send');
            out.auNotice = {};
            await openWorkflow(authorWf(S.id), 'send-au-e3-landing');
            out.auNotice.landing = noticeOf(await dlgText());
            const st = await (async () => { await as('ed'); const r = await page.request.get(ctxUrl(`/api/v1/submissions/${S.id}`)); return r.ok() ? r.json() : null; })();
            S.rounds = (st && st.reviewRounds || []).map((r) => ({id: r.id, stageId: r.stageId, round: r.round})); save();
            await as('au');
            await openWorkflow(authorWf(S.id, rkey(S, 0)), 'send-au-e3-round1');
            out.auNotice.round1 = noticeOf(await dlgText());
            out.auNotice.header = noticeOf((await screen(page)).text.header || '');
            await as('se');
            out.seTasks = await tasksPanel('send-se-tasks-after-send', 'editorial');
            // Create New Review Round, then Cancel Review Round on Round 2
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S, 0)), 'send-ed-e3-round1');
            out.newRound = await decide('Create New Review Round', 'send-ed-e3-new');
            out.newLanding = brief(await openWorkflow(wf(S.id), 'send-ed-e3-new-landing'));
            out.newLog = await activityLog('send-ed-e3-log-after-new');
            const st2 = await (await page.request.get(ctxUrl(`/api/v1/submissions/${S.id}`))).json();
            S.rounds = (st2.reviewRounds || []).map((r) => ({id: r.id, stageId: r.stageId, round: r.round})); save();
            await openWorkflow(wf(S.id, rkey(S, 1)), 'send-ed-e3-round2');
            out.cancel = await decide('Cancel Review Round', 'send-ed-e3-cancel');
            out.cancelLanding = await readTwice(wf(S.id), 'send-ed-e3-cancel-landing');
            out.cancelLog = await activityLog('send-ed-e3-log-after-cancel');
            out.auMailAll = await mails(addr('au'), {wait: 2000});
            // "Accept and Skip Review" (E4) → the Copyediting notice
            await openWorkflow(wf(X.E4.id, 'workflow_1'), 'send-ed-e4-submission');
            out.skip = await decide('Accept and Skip Review', 'send-ed-e4-skip');
            out.skipCopy = await stageRead(wf(X.E4.id, 'workflow_4'), 'send-ed-e4-copyediting');
            // Submission-stage "Send to External Review" (E5): Internal Review never initiated
            await openWorkflow(wf(X.E5.id, 'workflow_1'), 'send-ed-e5-submission');
            out.ext = await decide('Send to External Review', 'send-ed-e5-send-external');
            out.extLanding = brief(await openWorkflow(wf(X.E5.id), 'send-ed-e5-landing'));
            out.extInternalEntry = brief(await openWorkflow(wf(X.E5.id, 'workflow_2'), 'send-ed-e5-internal-entry'));
            out.extLog = await activityLog('send-ed-e5-log');
            record('send-summary', out);
            log('[send]', JSON.stringify({auTasks: out.auTasks, auNotice: out.auNotice, skipCopy: out.skipCopy.notice, extInternal: out.extInternalEntry}).slice(0, 3000));
        });

        // ---- cancel: the reviewers' lists and the "Review Cancel" letter, internal and external
        if (on('cancel')) await sect('cancel', async () => {
            const out = {};
            out.ri1Before = await reviewerList('ri1', 'cancel-ri1-list-before');
            out.ri2Before = await reviewerList('ri2', 'cancel-ri2-list-before');
            out.rv1Before = await reviewerList('rv1', 'cancel-rv1-list-before');
            await as('ed');
            await openWorkflow(wf(X.C1.id, rkey(X.C1)), 'cancel-ed-c1-before');
            out.c1 = await decide('Cancel Review Round', 'cancel-ed-c1');
            out.c1Landing = await readTwice(wf(X.C1.id), 'cancel-ed-c1-landing');
            out.c1Log = await activityLog('cancel-ed-c1-log');
            out.ri1Mail = await mails(addr('ri1'), {subject: 'cancelled', withBody: true, wait: 3000});
            out.ri2Mail = await mails(addr('ri2'), {subject: 'cancelled', withBody: true});
            out.auMail = await mails(addr('au'), {subject: 'cancelled'});
            out.ri1After = await reviewerList('ri1', 'cancel-ri1-list-after');
            out.ri2After = await reviewerList('ri2', 'cancel-ri2-list-after');
            // the reviewer's typed page for the withdrawn request
            await page.goto(ctxUrl(`/reviewer/submission/${X.C1.id}`)); await idle(page);
            await snap(page, 'cancel-ri2-typed-review-page');
            await as('ed');
            await openWorkflow(wf(X.C2.id, rkey(X.C2)), 'cancel-ed-c2-before');
            out.c2 = await decide('Cancel Review Round', 'cancel-ed-c2');
            out.c2Landing = brief(await openWorkflow(wf(X.C2.id), 'cancel-ed-c2-landing'));
            out.c2Log = await activityLog('cancel-ed-c2-log');
            out.rv1Mail = await mails(addr('rv1'), {subject: 'cancelled', withBody: true, wait: 3000});
            out.rv1After = await reviewerList('rv1', 'cancel-rv1-list-after');
            record('cancel-summary', out);
            log('[cancel]', JSON.stringify({ri1Before: out.ri1Before.rows, ri1After: out.ri1After.rows, ri1AfterReload: out.ri1After.rowsReload, ri1Mail: out.ri1Mail, rv1Mail: out.rv1Mail, rv1After: out.rv1After.rows}).slice(0, 4000));
        });

        // ---- decline: Decline, "Delete" per level, Revert Decline
        if (on('decline')) await sect('decline', async () => {
            const S = X.D1; const out = {};
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'decline-ed-before');
            out.decline = await decide('Decline Submission', 'decline-ed');
            out.declined = await readTwice(wf(S.id, rkey(S)), 'decline-ed-declined');
            out.declineLog = await activityLog('decline-ed-log');
            for (const who of ['mgr', 'se']) { await as(who); out[`${who}Declined`] = brief(await openWorkflow(wf(S.id, rkey(S)), `decline-${who}-declined`)); }
            await asAdmin(); out.adminDeclined = brief(await openWorkflow(wf(S.id, rkey(S)), 'decline-admin-declined'));
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'decline-ed-before-revert');
            out.revert = await decide('Revert Decline', 'revert-ed');
            out.reverted = await readTwice(wf(S.id, rkey(S)), 'revert-ed-reverted');
            out.revertLog = await activityLog('revert-ed-log');
            out.auMail = await mails(addr('au'), {wait: 2500});
            record('decline-summary', out);
            log('[decline]', JSON.stringify({mgr: out.mgrDeclined && out.mgrDeclined.actions, se: out.seDeclined && out.seDeclined.actions, admin: out.adminDeclined && out.adminDeclined.actions, auMail: out.auMail}).slice(0, 2000));
        });

        // ---- nr: Create New Review Round, a revision on Round 2, Send to External Review, back by Cancel Review Round
        if (on('nr')) await sect('nr', async () => {
            const S = X.N1; const out = {};
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'nr-ed-round1-before');
            out.newRound = await decide('Create New Review Round', 'nr-ed-new');
            let st = await (await page.request.get(ctxUrl(`/api/v1/submissions/${S.id}`))).json();
            S.rounds = (st.reviewRounds || []).map((r) => ({id: r.id, stageId: r.stageId, round: r.round})); save();
            out.round2 = brief(await openWorkflow(wf(S.id, rkey(S, 1)), 'nr-ed-round2'));
            out.round1Past = brief(await openWorkflow(wf(S.id, rkey(S, 0)), 'nr-ed-round1-past'));
            out.newLog = await activityLog('nr-ed-log-after-new');
            out.upload = await editorUploadRevision(S, 1, 'k6-n1-r2-revision.pdf', 'nr');
            await openWorkflow(wf(S.id, rkey(S, 1)), 'nr-ed-round2-before-send');
            out.send = await decide('Send to External Review', 'nr-ed-send-external');
            out.sendLanding = brief(await openWorkflow(wf(S.id), 'nr-ed-send-landing'));
            out.internalAfter = brief(await openWorkflow(wf(S.id, rkey(S, 1)), 'nr-ed-internal-round2-after'));
            out.sendLog = await activityLog('nr-ed-log-after-send');
            out.auMail = await mails(addr('au'), {wait: 2000});
            st = await (await page.request.get(ctxUrl(`/api/v1/submissions/${S.id}`))).json();
            S.rounds = (st.reviewRounds || []).map((r) => ({id: r.id, stageId: r.stageId, round: r.round})); save();
            const ext = S.rounds.findIndex((r) => r.stageId === 3);
            await openWorkflow(wf(S.id, rkey(S, ext)), 'nr-ed-external-round1');
            out.cancelExt = await decide('Cancel Review Round', 'nr-ed-cancel-external');
            out.backLanding = await readTwice(wf(S.id), 'nr-ed-back-landing');
            out.backLog = await activityLog('nr-ed-log-after-back');
            record('nr-summary', out);
            log('[nr]', JSON.stringify({sendPages: out.send.pages && out.send.pages.map((p) => p.panels), back: out.backLanding.after && out.backLanding.after.statusBox}).slice(0, 2500));
        });

        // ---- e3: the stage's editor-assignment notice (no editor assigned)
        if (on('e3')) await sect('e3', async () => {
            const out = {};
            for (const who of ['mgr']) {
                await as(who);
                const r = await openWorkflow(wf(X.A1.id, rkey(X.A1)), `e3-${who}-a1-internal-noeditor`);
                out.a1Round = {info: brief(r), notice: noticeOf(await dlgText())};
                await openWorkflow(wf(X.A1.id, 'workflow_2'), `e3-${who}-a1-internal-entry`);
                out.a1Entry = noticeOf(await dlgText());
                await openWorkflow(wf(X.A2.id, rkey(X.A2)), `e3-${who}-a2-external-noeditor`);
                out.a2Round = noticeOf(await dlgText());
                await openWorkflow(wf(X.A3.id, 'workflow_1'), `e3-${who}-a3-submission-noeditor`);
                out.a3Submission = noticeOf(await dlgText());
                out.tasks = await tasksPanel(`e3-${who}-tasks`, 'editorial');
                out.a1Row = await listRow(X.A1.title, `e3-${who}-dashboard-a1`, 'editorial');
            }
            await asAdmin();
            await openWorkflow(wf(X.A1.id, rkey(X.A1)), 'e3-admin-a1-internal-noeditor');
            out.adminA1 = noticeOf(await dlgText());
            record('e3-summary', out);
            log('[e3]', JSON.stringify(out).slice(0, 2500));
        });

        // ---- xf: the cross-feature surfaces on one internal round
        if (on('xf')) await sect('xf', async () => {
            const S = X.XB; const out = {};
            await as('ed');
            const r1 = await openWorkflow(wf(S.id, rkey(S)), 'xf-ed-xb-round1');
            out.round1 = brief(r1);
            out.primaryOrder = await page.locator('[role="dialog"]:visible').first().locator('[data-cy="workflow-primary-items"] h2, [data-cy="workflow-primary-items"] h3').allInnerTexts().catch(() => []);
            out.secondary = await page.locator('[role="dialog"]:visible').first().locator('[data-cy="workflow-secondary-items"] h2, [data-cy="workflow-secondary-items"] h3').allInnerTexts().catch(() => []);
            // every decision button opens the wizard
            out.buttons = {};
            for (const name of out.round1.actions) {
                const lb = `xf-ed-xb-${name.replace(/\W+/g, '-').toLowerCase()}`;
                await openWorkflow(wf(S.id, rkey(S)), `${lb}-before`);
                const p = await press(name, lb, {stopAtWindow: true});
                out.buttons[name] = {onWizard: !!p.onWizard, url: page.url().replace(/^.*index\.php/, '')};
                if (p.onWizard) { const w = await readWizard(`${lb}-wizard`); out.buttons[name].h1 = w.h1; out.buttons[name].rail = (w.rail || []).map((x) => x.text); }
                if (p.onWizard && name === 'Decline Submission') {
                    // left once with something changed and unsaved
                    const c = await composerRead();
                    const body = page.frameLocator('iframe[id*="notifyAuthors"], .composer iframe').first().locator('body');
                    await body.click().catch(() => {}); await body.pressSequentially(' K6 unsaved words.').catch(() => {});
                    const cancel = page.getByRole('button', {name: 'Cancel', exact: true}).first();
                    await cancel.click().catch(() => {}); await page.waitForTimeout(700); await idle(page);
                    const ds = await dialogTexts(page);
                    out.unsavedCancel = ds.length ? {name: ds[ds.length - 1].name, text: flat(ds[ds.length - 1].text, 300), buttons: ds[ds.length - 1].buttons.map((b) => b.t)} : null;
                    await snap(page, 'xf-ed-xb-decline-unsaved-cancel', {d: out.unsavedCancel, composerBefore: c});
                    const keep = topWin(page).getByRole('button', {name: 'Keep Working'}).first();
                    if (await keep.count()) { await keep.click(); await page.waitForTimeout(500); }
                    const before = dialogsSeen.length;
                    await page.goto(wf(S.id, rkey(S))); await idle(page);
                    out.unsavedLeave = {browserDialogs: dialogsSeen.slice(before)};
                    await snap(page, 'xf-ed-xb-decline-unsaved-left', {d: out.unsavedLeave});
                }
            }
            // the Reviewers panel: the row's actions, "Add Reviewer"
            await openWorkflow(wf(S.id, rkey(S)), 'xf-ed-xb-reviewers');
            const dlg = page.locator('[role="dialog"]:visible').first();
            const rowMenu = dlg.getByRole('table', {name: 'Reviewers'}).locator('tbody tr').first().getByRole('button').last();
            await loc(page, 'Reviewers row: last button (actions menu)', rowMenu);
            if (await rowMenu.count()) {
                await rowMenu.click().catch(() => {}); await page.waitForTimeout(600);
                out.reviewerRowMenu = await page.getByRole('menuitem').allInnerTexts().catch(() => []);
                await snap(page, 'xf-ed-xb-reviewer-row-menu', {items: out.reviewerRowMenu});
                await rowMenu.click().catch(() => {}); await page.waitForTimeout(400);
            }
            const add = dlg.getByRole('button', {name: 'Add Reviewer', exact: true}).first();
            await loc(page, 'Reviewers "Add Reviewer"', add);
            if (await add.count()) {
                await add.click(); await page.waitForTimeout(1500); await idle(page);
                const ds = await dialogTexts(page);
                out.addReviewer = ds.length > 1 ? {name: ds[ds.length - 1].name, text: flat(ds[ds.length - 1].text, 900)} : null;
                await snap(page, 'xf-ed-xb-add-reviewer', {w: out.addReviewer});
                await closeTop(page);
            }
            // the file panels' windows
            await openWorkflow(wf(S.id, rkey(S)), 'xf-ed-xb-files');
            out.filesWindow = await reviewFilesWindow('xf-ed-xb-files-for-review-window');
            await openWorkflow(wf(S.id, rkey(S)), 'xf-ed-xb-files2');
            const revC = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('table', {name: 'Revisions Uploaded', exact: true})}).last();
            const up = revC.getByRole('button', {name: 'Upload', exact: true});
            if (await up.count()) {
                await up.click();
                const w = uploadWiz(page);
                await w.locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000}).catch(() => {});
                await idle(page);
                const ds = await dialogTexts(page);
                out.revisionsUploadWindow = ds.length > 1 ? {name: ds[ds.length - 1].name, text: flat(ds[ds.length - 1].text, 500)} : null;
                await snap(page, 'xf-ed-xb-revisions-upload-window', {w: out.revisionsUploadWindow});
                await w.getByRole('button', {name: /^Close/}).first().click().catch(() => {});
                await page.waitForTimeout(800);
            }
            // the typed stage address
            await page.goto(ctxUrl(`/workflow/internalReview/${S.id}`)); await idle(page); await page.waitForTimeout(1500); await idle(page);
            out.typedAddress = {url: page.url().replace(/^.*index\.php/, '')};
            await snap(page, 'xf-ed-xb-typed-internalReview-address', {u: out.typedAddress});
            // the Participants "Assign" roles on this stage
            await openWorkflow(wf(S.id, rkey(S)), 'xf-ed-xb-participants');
            const assign = page.locator('[role="dialog"]:visible').first().locator('[data-cy="workflow-secondary-items"]').getByRole('button', {name: 'Assign', exact: true});
            if (await assign.count()) {
                await assign.click();
                const win = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
                await win.locator('select[name="filterUserGroupId"]').waitFor({timeout: 30000}).catch(() => {});
                await idle(page);
                out.assignRoles = await win.locator('select[name="filterUserGroupId"] option').allTextContents().catch(() => []);
                await snap(page, 'xf-ed-xb-assign-window', {roles: out.assignRoles});
                await win.getByRole('link', {name: 'Cancel', exact: true}).or(win.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
                await page.waitForTimeout(800);
            }
            // lists: the editorial dashboard's and the author's row
            out.edRow = await listRow(S.title, 'xf-ed-dashboard-xb', 'editorial');
            // the recommending editor: every recommend button opens its wizard; then "Recommend Send to External Review"
            await as('se2');
            const r2 = await openWorkflow(wf(S.id, rkey(S)), 'xf-se2-xb-round1');
            out.se2 = brief(r2);
            out.se2Participants = flat(r2.secondaryText, 600);
            out.recButtons = {};
            for (const name of out.se2.actions) {
                const lb = `xf-se2-xb-${name.replace(/\W+/g, '-').toLowerCase()}`;
                await openWorkflow(wf(S.id, rkey(S)), `${lb}-before`);
                const p = await press(name, lb, {stopAtWindow: true});
                out.recButtons[name] = {onWizard: !!p.onWizard, url: page.url().replace(/^.*index\.php/, '')};
                if (p.onWizard) { const w = await readWizard(`${lb}-wizard`); out.recButtons[name].h1 = w.h1; out.recButtons[name].rail = (w.rail || []).map((x) => x.text); }
            }
            await openWorkflow(wf(S.id, rkey(S)), 'xf-se2-xb-before-recommend');
            out.recommend = await decide('Recommend Send to External Review', 'xf-se2-xb-recommend-send-external');
            out.se2After = brief(await openWorkflow(wf(S.id, rkey(S)), 'xf-se2-xb-after-recommend'));
            await as('ed');
            const r3 = await openWorkflow(wf(S.id, rkey(S)), 'xf-ed-xb-after-recommend');
            out.edRecBox = brief(r3);
            out.edRecLog = await activityLog('xf-ed-xb-log-after-recommend');
            // the Internal Reviewer's own page
            await as('ri1');
            await page.goto(ctxUrl('/dashboard/reviewAssignments')); await idle(page); await page.waitForTimeout(800);
            await snap(page, 'xf-ri1-review-assignments');
            await page.goto(ctxUrl(`/reviewer/submission/${S.id}`)); await idle(page); await page.waitForTimeout(800);
            const rp = await snap(page, 'xf-ri1-reviewer-page');
            out.reviewerPage = flat(rp.text && rp.text.main, 800);
            await page.goto(wf(S.id)); await idle(page); await page.waitForTimeout(1500);
            out.reviewerWorkflow = flat((await dialogTexts(page)).map((d) => d.text).join(' | '), 400) || flat((await screen(page)).text.main, 300);
            await snap(page, 'xf-ri1-typed-workflow', {t: out.reviewerWorkflow});
            // the author's view: panels, discussions
            await as('au');
            const a = await openWorkflow(authorWf(S.id, rkey(S)), 'xf-au-xb-round1');
            out.author = brief(a);
            out.auRow = await listRow(S.title, 'xf-au-mysubmissions-xb');
            // settings: review setup, guidance, tasks templates
            await as('mgr');
            await page.goto(ctxUrl('/management/settings/workflow#review')); await idle(page); await page.waitForTimeout(800);
            const rs = await snap(page, 'xf-mgr-settings-review');
            out.reviewSetup = flat(rs.text && rs.text.main, 2500);
            const guidance = page.getByRole('tab', {name: /Reviewer Guidance/}).first();
            if (await guidance.count()) { await guidance.click(); await idle(page); await page.waitForTimeout(600); }
            const gs = await snap(page, 'xf-mgr-settings-review-guidance');
            out.guidance = flat(gs.text && gs.text.main, 1500);
            const tdTab = page.getByRole('tab', {name: /Tasks and Discussions/}).first();
            await page.goto(ctxUrl('/management/settings/workflow')); await idle(page); await page.waitForTimeout(600);
            const tabs = await page.getByRole('tab').allInnerTexts().catch(() => []);
            out.workflowTabs = tabs.map((x) => flat(x, 60));
            if (await tdTab.count()) { await tdTab.click(); await idle(page); await page.waitForTimeout(1000); }
            const ts = await snap(page, 'xf-mgr-settings-tasks-discussions');
            out.tasksTemplates = flat(ts.text && ts.text.main, 1500);
            record('xf-summary', out);
            log('[xf]', JSON.stringify(out).slice(0, 5000));
        });

        // ---- cov: the Coverage rows' remaining states
        if (on('cov')) await sect('cov', async () => {
            const out = {};
            await as('ed');
            out.v1Ed = brief(await openWorkflow(wf(X.V1.id, rkey(X.V1)), 'cov-ed-v1-new-reviews'));
            out.w1Ed = brief(await openWorkflow(wf(X.W1.id, rkey(X.W1)), 'cov-ed-w1-accepted-reviewer'));
            out.xbEntry = brief(await openWorkflow(wf(X.XB.id, 'workflow_2'), 'cov-ed-xb-stage-entry'));
            await as('fc');
            out.v1Fc = brief(await openWorkflow(wf(X.V1.id, rkey(X.V1)), 'cov-fc-v1-round1'));
            // the open press: the author's "Read Review", the minimum
            const O = sc.o; const c = inCtx(O); const S = X.O1;
            await asIn(O, 'au');
            const a = await openWorkflow(c.authorWf(S.id, rkey(S)), 'cov-au-o1-round1');
            out.o1Author = brief(a);
            const rr = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Read Review', exact: true}).first();
            await loc(page, 'author view: Reviewers "Read Review"', rr);
            if (await rr.count()) {
                await rr.click(); await page.waitForTimeout(1500); await idle(page);
                const ds = await dialogTexts(page);
                out.readReview = ds.length > 1 ? {name: flat(ds[ds.length - 1].name, 120), text: flat(ds[ds.length - 1].text, 800)} : {none: true};
                await snap(page, 'cov-au-o1-read-review', {w: out.readReview});
                await closeTop(page);
            }
            await asIn(O, 'ed');
            const e = await openWorkflow(c.wf(S.id, rkey(S)), 'cov-ed-o1-round1-minimum');
            out.o1Ed = brief(e);
            const p = await press('Accept Submission', 'cov-ed-o1-accept-minimum', {stopAtWindow: true});
            out.o1AcceptWindow = p.windows;
            await closeTop(page);
            record('cov-summary', out);
            log('[cov]', JSON.stringify(out).slice(0, 4000));
        });

        // ---- again: a second run of the task, the notice and the return, with and without a recommending editor; the suggestions panel
        if (on('again')) await sect('again', async () => {
            const t = sc.t; const out = {};
            if (!sc.G1) {
                for (const [key, parts] of [['G1', [{username: `${t}ed`, role: 'editor'}, {username: `${t}se2`, role: 'sectionEditor', recommendOnly: true}]], ['G2', [{username: `${t}ed`, role: 'editor'}]]]) {
                    const s = await app.api.createSubmission({tag: `${t}${key.toLowerCase()}`, context: t, submitter: `${t}au`, title: `K6 ${key} ${t}`, decisions: ['sendInternalReview'], reviewRounds: [{stage: 'internal', files: [{file: 'article.pdf'}], reviewers: [{username: `${t}ri2`, status: 'completed'}]}], participants: parts});
                    sc[key] = {id: s.submissionId, rounds: s.reviewRounds, title: `K6 ${key} ${t}`}; save();
                }
                const b = tag('u71k6p');
                await app.api.createContext({tag: b, context: {name: `K6 sugg ${b}`, contactName: `Principal Contact ${b}`, contactEmail: `${b}contact@mail.test`}, review: {reviewerSuggestionEnabled: true}, users: [
                    {username: `${b}ed`, roles: ['editor'], givenName: 'Pia', familyName: 'Suggeditor'},
                    {username: `${b}au`, roles: ['author'], givenName: 'Pat', familyName: 'Suggauthor'},
                ]});
                sc.ps = b; save();
                const sugg = [{givenName: 'Nora', familyName: 'Noaccount', email: `${b}nobody@mail.test`}];
                for (const [key, dec, stage] of [['S1', 'sendInternalReview', 'internal'], ['S2', 'skipInternalReview', 'external']]) {
                    const s = await app.api.createSubmission({tag: `${b}${key.toLowerCase()}`, context: b, submitter: `${b}au`, title: `K6 ${key} ${b}`, decisions: [dec], reviewRounds: [{stage, files: [{file: 'article.pdf'}]}], participants: [{username: `${b}ed`, role: 'editor'}], reviewerSuggestions: sugg});
                    sc[key] = {id: s.submissionId, rounds: s.reviewRounds, title: `K6 ${key} ${b}`}; save();
                }
            }
            for (const key of ['G1', 'G2']) {
                const S = sc[key]; const o = {};
                await as('ed');
                await openWorkflow(wf(S.id, rkey(S)), `again-ed-${key}-before`);
                o.request = await decide('Request Revisions', `again-ed-${key}-request`);
                o.requested = brief(await openWorkflow(wf(S.id, rkey(S)), `again-ed-${key}-requested`));
                await as('au');
                o.tasks1 = await tasksPanel(`again-au-${key}-tasks-after-request`);
                o.up = await authorUploadRevision(S, 0, `k6-${key}-rev.pdf`, `again-${key}`);
                o.tasks2 = await tasksPanel(`again-au-${key}-tasks-after-upload`);
                await as('ed');
                o.revised = brief(await openWorkflow(wf(S.id, rkey(S)), `again-ed-${key}-revised`));
                o.accept = await decide('Accept Submission', `again-ed-${key}-accept`);
                o.copy = await stageRead(wf(S.id, 'workflow_4'), `again-ed-${key}-copyediting`);
                o.back = await decide('Move to Review', `again-ed-${key}-back`);
                const rb = await readTwice(wf(S.id), `again-ed-${key}-back-landing`);
                o.backAfter = rb.after.statusBox; o.backReload = rb.reload.statusBox; o.backHeader = flat(rb.after.header, 140);
                out[key] = {requested: o.requested.status, tasks1: o.tasks1, tasks2: o.tasks2, revised: o.revised.status, copy: o.copy.notice, copyReload: o.copy.noticeReload, backAfter: o.backAfter, backReload: o.backReload, backHeader: o.backHeader};
            }
            const c = inCtx(sc.ps);
            await asIn(sc.ps, 'ed');
            for (const key of ['S1', 'S2']) {
                const i = await openWorkflow(c.wf(sc[key].id, rkey(sc[key])), `again-ed-${key}-suggestions`);
                out[key] = {headings: i.headings, secondary: flat(i.secondaryText, 400), tables: (i.tables || []).map((x) => x.name)};
            }
            record('again-summary', out);
            log('[again]', JSON.stringify(out).slice(0, 5000));
        });
    } finally {
        record('browser-dialogs', dialogsSeen);
        await close();
    }
});
