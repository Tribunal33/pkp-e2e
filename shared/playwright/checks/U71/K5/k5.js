// U71 claim check, chunk K5: the author's view of an internal round, the author's "Reviewers" list,
// coming back to Internal Review, and the internal rounds after the monograph has moved on.
// Spec: docs/specs/U71-internal-review-stage.md lines 217–255 (Rules 15–18), register OMP1 (470–479),
// OMP3 (491–502), OMP5 (517–527), summary rows 460–465; footnotes g, td-emails, td-reviewers, r17,
// td-return, td-left, f-omp1, f-omp3, f-omp5.
//
// OMP: press O (tag u71k5o…, "Default Review Mode" Open through the review passthrough) with mgr (Press
// manager), ed (Press editor, manager-level), se (Series editor), fc (Funding coordinator), au (author),
// ri1..ri3 (Internal Reviewers), rv1 (External Reviewer). Press A (tag u71k5a…, install default review
// mode) with ed, au, ri1. Monographs (submitter au; ed, se, fc assigned unless noted):
//   E   Submission stage, one file                → on screen: Send to Internal Review (email), author view,
//                                                   Request Revisions (email), author Tasks / My Submissions,
//                                                   author upload (and one left unsaved), Send to External
//                                                   Review, author External Review "Notifications", external
//                                                   Request Revisions, author Tasks (OMP1 control)
//   W   internal R1, no reviewer                  → author: box "Waiting for reviewers…", no Upload revisions
//   V1  internal R1, ri1 invited (open)           → OMP5: empty table; ri1 accepts and submits on screen; the row, "Read Review"
//   V2  internal R1, ri1 accepted (open)          → Rule 16 state axis
//   V3  internal R1, ri1 declined (open)          → Rule 16 state axis
//   V4  internal R1, ri1 completed + ri2 invited (open); on screen ed adds ri3 anonymous, ri3 submits
//                                                 → only open completed reviews listed; anonymous never
//   N2  internal R1 revisions requested, R2 revisions requested → author: Upload revisions on R2 lands on R2; R1 read too
//   L1  internal R1 (file, ri1 completed) → External Review R1  → Rule 18 per level; ed adds ri2 on the past round, uploads there
//   L2  external R1 (file, rv1 completed) → External R2          → Rule 18 control: a past External Review round
//   C1  internal R1 → Accept (Copyediting)        → 17a "Move to Review" lands on Internal R1; Rule 18 after Accept
//   C2  internal R1, R2 → Accept                  → 17a: lands on the last internal round
//   C3  internal R1 → External R1 → Accept        → 17a control: External Review
//   C4  Accept and Skip Review                    → 17a control: no review round
//   R1  internal R1 (ri1 completed) → External R1 (empty)          → 17b "Cancel Review Round"
//   R2  internal R1 (ri1 completed), R2 → External R1 (empty)      → 17b: the last internal round
//   R3  Send to External Review from Submission → External R1       → 17b control
//   R4  internal R1 → External R1 → External R2 (empty)             → 17b control: Round 2
//   X1  external R1, rv1 invited (open)           → OMP5 control: author's External Review, invited
//   X2  external R1, rv1 completed (open)         → OMP5 control: completed
//   A1  (press A) internal R1, ri1 completed (anonymous default)  → td-reviewers control
//   A2  (press A) internal R1, ri1 invited                        → control
// OJS (read-only controls, scratch journals): JO open mode: J1 rv1 invited, J2 rv1 completed, J5 invited
// (on screen Request Revisions: author Notifications, Tasks); JA default: J4 rv1 completed.
// OPS (read-only control): scratch server, one preprint, the author's workflow.
//
//   PROBE_FEATURE=U71 PROBE_AGENT=ccK5 node bin/probe.js all shared/playwright/checks/U71/K5/k5.js
//   PHASES=seed,emails,states,reviewers,rounds,back,cancel,left,sweep,late,cancelled,ojs,ops   (default all; later phases reuse k5-state-<app>.json)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const PDF = fs.readFileSync(path.join(REPO, 'apps/omp/playwright/fixtures/files/article.pdf'));
const ALL = ['seed', 'emails', 'states', 'reviewers', 'rounds', 'back', 'cancel', 'left', 'sweep', 'late', 'cancelled', 'ojs', 'ops'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const stateFile = (app) => path.join(outDir(), `k5-state-${app.name}.json`);
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
// The workflow dialog as data: header, side menu, action buttons, boxes, tables, headings in DOM order.
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
    const actionButtons = actionRegion ? [...actionRegion.querySelectorAll('button, a')].filter(vis).map((b) => ({text: b.innerText.trim().replace(/\s+/g, ' ')})) : null;
    const secondary = region('workflow-secondary-items');
    const primary = region('workflow-primary-items');
    const primaryHeadings = primary ? [...primary.querySelectorAll('h2,h3')].filter(vis).map((e) => e.innerText.trim()).filter(Boolean) : null;
    const nav = root.querySelector('nav, [data-cy="workflow-menu"], [role="navigation"]');
    const menu = nav ? [...nav.querySelectorAll('a, button, li > span')].filter(vis).map((a) => ({text: txt(a), current: a.getAttribute('aria-current') || null})).filter((a) => a.text).slice(0, 40) : null;
    const statusH = hs.find((x) => /Status$/.test(x.innerText.trim()));
    const statusBox = statusH ? {heading: statusH.innerText.trim(), text: txt(statusH.parentElement).slice(0, 600)} : null;
    const h2 = root.querySelector('h2');
    const bubble = root.querySelector('span[class*="bg-stage-"]');
    const allButtons = [...root.querySelectorAll('button, a.pkp_button, a[role=button]')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 120);
    return {dialogCount: dlgs.length, h2: h2 ? h2.textContent.trim() : null, bubble: bubble && bubble.parentElement ? txt(bubble.parentElement) : null, headings, primaryHeadings, menu, actionButtons, statusBox, secondaryText: txt(secondary) && txt(secondary).slice(0, 1200), primaryText: txt(primary) && txt(primary).slice(0, 2500), tables, allButtons, text: root.innerText.replace(/\s+/g, ' ').slice(0, 3500)};
});
const wizInfo = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const main = document.querySelector('main') || document.body;
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const h1 = main.querySelector('h1');
    const railList = [...main.querySelectorAll('ol, ul')].find((l) => /Complete the following steps/i.test(l.getAttribute('aria-label') || ''));
    const rail = railList ? [...railList.children].map((li) => ({text: txt(li), current: li.getAttribute('aria-current') || li.querySelector('[aria-current]')?.getAttribute('aria-current') || null})) : null;
    const hs = [...main.querySelectorAll('h1,h2,h3,h4,legend')].filter(vis).map((e) => ({tag: e.tagName.toLowerCase(), text: txt(e)})).slice(0, 30);
    const btns = [...main.querySelectorAll('button, a.pkp_button, a[role=button], input[type=submit]')].filter(vis).map((b) => ({text: (b.innerText || b.getAttribute('aria-label') || b.value || '').trim().replace(/\s+/g, ' ').slice(0, 80), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'})).filter((b) => b.text && !b.text.match(/^(Bold|Italic|Superscript|Subscript|Link|Unlink|Bullet list|Numbered list|Insert Content|Upload image)$/)).slice(0, 60);
    const panels = [...main.querySelectorAll('.listPanel')].filter(vis).map((p) => ({title: txt(p.querySelector('.listPanel__title, h2, h3')), items: [...p.querySelectorAll('.listPanel__item')].map((it) => ({text: txt(it).slice(0, 220), checked: it.querySelector('input[type=checkbox]')?.checked ?? null})).slice(0, 20), text: txt(p).slice(0, 600)})).slice(0, 8);
    const errors = [...main.querySelectorAll('.pkpFieldError, [role=alert], .pkpNotification')].filter(vis).map((e) => txt(e)).filter(Boolean).slice(0, 12);
    return {url: location.href, title: document.title, h1: txt(h1), rail, headings: hs, buttons: btns, panels, errors, text: main.innerText.slice(0, 5000)};
});
const topWin = (page) => page.locator('[role="dialog"]:visible').last();
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
    let cp = null; // the context the current signed-in user works in
    const ctxUrl = (p, c) => app.url(`/index.php/${c || cp}${p}`);
    const wf = (id, key, c) => ctxUrl(`/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`, c);
    const authorWf = (id, key, c) => ctxUrl(`/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`, c);
    const rkey = (s, n = 0) => (s.rounds && s.rounds[n] ? `workflow_${s.rounds[n].stageId}_${s.rounds[n].id}` : undefined);
    const rkeyStage = (s, stageId, n = 0) => { const rs = (s.rounds || []).filter((r) => r.stageId === stageId); return rs[n] ? `workflow_${stageId}_${rs[n].id}` : undefined; };

    const {page, close} = await launch(app);
    const dialogsSeen = [];
    page.on('dialog', async (d) => { dialogsSeen.push({type: d.type(), message: d.message(), url: page.url()}); log('[browser dialog]', d.type(), flat(d.message(), 120)); await d.accept().catch(() => {}); });
    const as = async (c, who) => { cp = c; await signIn(page, who === 'admin' ? 'admin' : `${c}${who}`, {contextPath: c}); await idle(page); };

    async function openWorkflow(url, label, extra) {
        await page.goto(url); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(500);
        const info = await wfInfo(page).catch((e) => ({error: String(e.message)}));
        await snap(page, label, {info, ...(extra || {})});
        log(`[${label}]`, 'h2:', flat(info.h2, 70), '| status:', flat(info.statusBox && info.statusBox.text, 130), '| actions:', JSON.stringify((info.actionButtons || []).map((b) => b.text)), '| primary:', JSON.stringify(info.primaryHeadings), '| tables:', JSON.stringify((info.tables || []).map((t) => `${t.name}:${t.rows.length}`)));
        return info;
    }
    async function reloadRead(label) {
        await page.reload(); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(500);
        const info = await wfInfo(page).catch(() => ({}));
        await snap(page, label, {info});
        log(`[${label}]`, 'status:', flat(info.statusBox && info.statusBox.text, 130), '| actions:', JSON.stringify((info.actionButtons || []).map((x) => x.text)), '| primary:', JSON.stringify(info.primaryHeadings));
        return info;
    }
    async function readWizard(label) {
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(300);
        const w = await wizInfo(page).catch((e) => ({error: String(e.message), url: page.url()}));
        await snap(page, label, {wiz: w});
        log(`[${label}]`, 'h1:', flat(w.h1, 90), '| rail:', JSON.stringify((w.rail || []).map((r) => `${r.text}${r.current ? '*' : ''}`)), '| panels:', JSON.stringify((w.panels || []).map((p) => `${p.title}: ${p.items.map((i) => `${i.checked ? '[x]' : '[ ]'}${flat(i.text, 50)}`).join(', ')}`)));
        return w;
    }
    async function press(name, label, {choiceRe} = {}) {
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
            const t = topWin(page);
            if (choiceRe) { const r = t.locator('label').filter({hasText: choiceRe}).locator('input[type=radio]').first(); if (await r.count()) await r.check({force: true}); else { const r2 = t.getByLabel(choiceRe).first(); if (await r2.count()) await r2.check({force: true}); } }
            const next = t.getByRole('button', {name: /^(Next|Yes, Continue|Continue|OK)$/}).first();
            if (await next.count()) { await next.click(); await idle(page); } else break;
        }
        if (isWizard(page)) await waitWizard(page);
        out.url = page.url();
        out.onWizard = isWizard(page);
        return out;
    }
    async function walk(label) {
        const pages = [];
        for (let n = 1; n < 7; n++) {
            const w = await readWizard(`${label}-p${n}`);
            pages.push({n, h1: w.h1, rail: (w.rail || []).map((r) => `${r.text}${r.current ? '*' : ''}`), panels: (w.panels || []).map((p) => ({title: p.title, items: p.items.map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.text.slice(0, 80)}`)}))});
            const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
            if (await rec.isVisible().catch(() => false)) break;
            const cont = page.getByRole('button', {name: 'Continue', exact: true}).first();
            if (!(await cont.isVisible().catch(() => false))) break;
            await cont.click(); await idle(page); await page.waitForTimeout(400);
        }
        record(`${label}-pages`, pages);
        return pages;
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
        log(`[${label} recorded]`, JSON.stringify(out).slice(0, 300));
        return out;
    }
    async function decide(s, key, name, label, opts) {
        await openWorkflow(wf(s.id, key), `${label}-before`);
        const p = await press(name, label, opts);
        if (!p.onWizard) { log(`[${label}] no wizard`, JSON.stringify(p).slice(0, 300)); return {press: p}; }
        const pages = await walk(label);
        const rec = await recordDecision(label);
        return {press: p, pages, rec};
    }
    async function subState(id) {
        const r = await page.request.get(ctxUrl(`/api/v1/submissions/${id}`)).catch(() => null);
        if (!r || !r.ok()) return {status: r && r.status()};
        const j = await r.json();
        return {stageId: j.stageId, status: j.status, reviewRounds: (j.reviewRounds || []).map((x) => ({id: x.id, stageId: x.stageId, round: x.round, status: x.status, statusId: x.statusId})), reviewAssignments: (j.reviewAssignments || []).map((a) => ({id: a.id, roundId: a.roundId, reviewerId: a.reviewerId, statusId: a.statusId, reviewMethod: a.reviewMethod}))};
    }
    async function refreshRounds(s) { const st = await subState(s.id); if (st.reviewRounds) { s.rounds = st.reviewRounds.map((r) => ({id: r.id, stageId: r.stageId, round: r.round})); save(); } return st; }
    // Legacy upload wizard: genre, file, Continue, Continue, Complete.
    async function finishUpload(fileName, label) {
        const w = uploadWiz(page);
        await w.locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000});
        await idle(page);
        const g = w.locator('select[id^="genreId"]');
        const st = {revise: await w.locator('select[id^="revisedFileId"]').evaluate((s) => [...s.options].map((o) => o.text)).catch(() => null), genres: await g.evaluate((s) => [...s.options].map((o) => o.text)).catch(() => null), text: flat(await w.innerText().catch(() => ''), 800)};
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
    // The author's "Upload revisions" (the author must be signed in and on the round).
    async function authorUpload(fileName, label) {
        const btn = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload revisions', exact: true});
        await loc(page, 'author view "Upload revisions"', btn);
        if (!(await btn.count())) { record(`${label}-no-upload`, {}); log(`[${label}] no Upload revisions`); return false; }
        await btn.click();
        return finishUpload(fileName, label);
    }
    // The header "Tasks" panel of the signed-in user, on the dashboard.
    async function tasksPanel(label, dash = 'mySubmissions') {
        await page.goto(ctxUrl(`/dashboard/${dash}`)); await idle(page); await page.waitForTimeout(600);
        const btn = page.getByRole('button', {name: /^Tasks/}).first();
        await loc(page, 'header "Tasks" button', btn);
        const btnText = await btn.innerText().catch(() => null);
        await btn.click().catch(() => {});
        await page.waitForTimeout(1200); await idle(page);
        const s = await snap(page, label, {tasksButton: btnText});
        const panel = s.text && s.text.dialog;
        log(`[${label}] Tasks button:`, JSON.stringify(btnText), '| panel:', flat(panel, 400));
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(400);
        return {button: btnText, panel: flat(panel, 1500)};
    }
    // The author's "My Submissions" row for a title.
    async function mySubmissionsRow(title, label) {
        await page.goto(ctxUrl('/dashboard/mySubmissions')); await idle(page); await page.waitForTimeout(600);
        const s = await snap(page, label);
        const row = await page.locator('tr').filter({hasText: title}).first().innerText().catch(() => null);
        log(`[${label}] row:`, flat(row, 300));
        return flat(row, 400);
    }
    // The author's mail from the press (subjects), newest first.
    async function inbox(email) {
        await page.waitForTimeout(1500);
        const r = await app.mail._search({to: email}).catch(() => ({}));
        return (r.messages || []).map((m) => ({subject: m.Subject, created: m.Created, id: m.ID})).slice(0, 12);
    }
    // Reviewer: accept, step 3, type comments, submit (on screen).
    async function reviewerSubmits(c, who, id, label) {
        await as(c, who);
        await page.goto(ctxUrl(`/reviewer/submission/${id}`)); await idle(page);
        const accept = page.getByRole('button', {name: /Accept Review, Continue to Step #2/}).filter({visible: true});
        const saveBtn = page.getByRole('button', {name: 'Save and continue', exact: true}).filter({visible: true});
        const step3 = page.getByRole('button', {name: 'Continue to Step #3'}).filter({visible: true});
        const submit = page.getByRole('button', {name: 'Submit Review', exact: true}).filter({visible: true});
        await accept.or(saveBtn).or(step3).or(submit).first().waitFor({timeout: 30000});
        await snap(page, `${label}-step1`);
        if (await accept.count() || await saveBtn.count()) {
            const privacy = page.locator('input[name="privacyConsent"]').filter({visible: true});
            if (await privacy.count()) await privacy.check();
            await accept.or(saveBtn).first().click(); await idle(page);
        }
        await step3.or(submit).first().waitFor({timeout: 30000});
        if (await step3.count()) { await step3.first().click(); await idle(page); }
        await submit.waitFor({timeout: 30000});
        await page.waitForFunction(() => { const mce = window.tinyMCE || window.tinymce; const eds = mce ? mce.get() : []; return eds.length > 0 && eds.every((e) => e.initialized); }, null, {timeout: 30000}).catch(() => {});
        const body = page.frameLocator('iframe[id^="comments"]:not([id^="commentsPrivate"])').locator('body');
        await body.click().catch(() => {});
        await body.pressSequentially(`K5 review by ${who}.`).catch(() => {});
        await page.evaluate(() => { const mce = window.tinyMCE || window.tinymce; for (const e of mce.get()) if (e.initialized) { e.fire('change'); e.save(); } }).catch(() => {});
        await snap(page, `${label}-step3`);
        await submit.first().click(); await idle(page); await page.waitForTimeout(600);
        const ok = topWin(page).getByRole('button', {name: /^(OK|Yes|Submit)$/}).last();
        if (await ok.count()) { await ok.click(); await idle(page); await page.waitForTimeout(1000); }
        const s = await snap(page, `${label}-submitted`);
        log(`[${label}] submitted:`, flat(s.text && s.text.main, 160));
    }
    // Add Reviewer on the open round: pick the entry by name, optionally a review type; returns the form's review types.
    async function addReviewer(name, label, {method} = {}) {
        const btn = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Add Reviewer', exact: true}).first();
        await loc(page, `${label}: Reviewers "Add Reviewer"`, btn);
        if (!(await btn.count())) { record(`${label}-no-add-reviewer`, {}); return {absent: true}; }
        await btn.click();
        const dlg = page.getByRole('dialog', {name: /Add Reviewer/i}).last();
        await dlg.waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return d && (d.querySelector('.listPanel__item') || /No items/.test(d.innerText)); }, null, {timeout: 20000}).catch(() => {});
        await idle(page); await page.waitForTimeout(500);
        const listed = await dlg.locator('.listPanel__item').evaluateAll((els) => els.map((e) => e.innerText.split('\n')[0].trim())).catch(() => []);
        await snap(page, `${label}-window`, {listed});
        const entry = dlg.locator('.listPanel__item').filter({hasText: name}).first();
        if (!(await entry.count())) { await dlg.getByRole('button', {name: 'Close'}).first().click().catch(() => {}); return {noEntry: true, listed}; }
        await entry.getByRole('button', {name: /Select/}).first().click(); await idle(page);
        const formEl = dlg.locator('#regularReviewerForm');
        await formEl.waitFor({state: 'visible', timeout: 30000}).catch(() => {});
        await page.waitForTimeout(600);
        await page.waitForFunction(() => { const ta = document.querySelector('#regularReviewerForm textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 30000}).catch(() => {});
        const methods = await formEl.locator('input[name="reviewMethod"]').evaluateAll((els) => els.map((i) => { const l = document.querySelector(`label[for="${i.id}"]`) || i.closest('label'); return `${l ? l.innerText.trim() : i.value}${i.checked ? ' [x]' : ''}`; })).catch(() => null);
        if (method) {
            const ids = await formEl.locator('input[name="reviewMethod"]').evaluateAll((els, m) => els.filter((i) => { const l = document.querySelector(`label[for="${i.id}"]`) || i.closest('label'); return l && l.innerText.trim() === m; }).map((i) => i.id), method);
            if (ids[0]) await formEl.locator(`[id="${ids[0]}"]`).check({force: true});
        }
        const methodsAfter = await formEl.locator('input[name="reviewMethod"]').evaluateAll((els) => els.map((i) => { const l = document.querySelector(`label[for="${i.id}"]`) || i.closest('label'); return `${l ? l.innerText.trim() : i.value}${i.checked ? ' [x]' : ''}`; })).catch(() => null);
        await snap(page, `${label}-form`, {methods, methodsAfter});
        await formEl.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
        await formEl.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(900);
        return {listed, methods, methodsAfter};
    }
    // Press a table's own button in the workflow (e.g. "Upload" on "Revisions Uploaded") and read the window; close it.
    async function pressPanelButton(tableName, btnName, label) {
        const container = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('table', {name: tableName, exact: true})}).last();
        const btn = container.getByRole('button', {name: btnName, exact: true}).first();
        await loc(page, `${label}: "${tableName}" › "${btnName}"`, btn);
        if (!(await btn.count())) return {absent: true};
        await btn.click(); await page.waitForTimeout(1200); await idle(page); await page.waitForTimeout(600);
        const ds = await dialogTexts(page);
        const d = ds[ds.length - 1];
        const out = {windows: ds.length, top: d ? {name: flat(d.name, 120), text: flat(d.text, 700), buttons: d.buttons.map((b) => b.t).slice(0, 20)} : null};
        await snap(page, label, {out});
        log(`[${label}]`, JSON.stringify(out).slice(0, 300));
        return out;
    }
    async function closeTopWindow() {
        const t = topWin(page);
        const c = t.getByRole('link', {name: 'Cancel', exact: true}).or(t.getByRole('button', {name: 'Cancel', exact: true})).or(t.getByRole('button', {name: 'Close', exact: true})).first();
        if (await c.count()) { await c.click({timeout: 5000}).catch(() => {}); await idle(page); await page.waitForTimeout(900); }
    }
    const brief = (i) => i && ({h2: i.h2, bubble: i.bubble, status: i.statusBox && i.statusBox.text, actions: (i.actionButtons || []).map((b) => b.text), primary: i.primaryHeadings, tables: (i.tables || []).map((t) => ({name: t.name, columns: t.columns, rows: t.rows})), menu: (i.menu || []).map((m) => `${m.text}${m.current ? '*' : ''}`), buttons: i.allButtons, secondary: flat(i.secondaryText, 400)});
    const has = (i, re) => !!(i && (i.headings || []).some((h) => re.test(h)));

    try {
        // ================================================================ seed
        if (on('seed') && !sc.O) await sect('seed', async () => {
            if (isOMP) {
                const O = tag('u71k5o');
                const A = tag('u71k5a');
                const person = (c, n, roles, g, f) => ({username: `${c}${n}`, roles, givenName: g, familyName: f});
                await app.api.createContext({tag: O, context: {name: `K5 open ${O}`, contactName: `Principal Contact ${O}`, contactEmail: `${O}contact@mail.test`}, review: {defaultReviewMode: 'open'}, users: [
                    person(O, 'mgr', ['manager'], 'Maya', 'Managerson'), person(O, 'ed', ['editor'], 'Eve', 'Presseditor'), person(O, 'se', ['sectionEditor'], 'Sam', 'Serieseditor'),
                    person(O, 'fc', ['funding'], 'Fran', 'Funder'), person(O, 'au', ['author'], 'Alex', 'Authorson'),
                    person(O, 'ri1', ['internalReviewer'], 'Ian', 'Internalone'), person(O, 'ri2', ['internalReviewer'], 'Ina', 'Internaltwo'), person(O, 'ri3', ['internalReviewer'], 'Ivo', 'Internalthree'),
                    person(O, 'rv1', ['externalReviewer'], 'Rita', 'Externalrev')]});
                await app.api.createContext({tag: A, context: {name: `K5 default ${A}`, contactName: `Principal Contact ${A}`, contactEmail: `${A}contact@mail.test`}, users: [
                    person(A, 'ed', ['editor'], 'Eve', 'Presseditor'), person(A, 'au', ['author'], 'Alex', 'Authorson'), person(A, 'ri1', ['internalReviewer'], 'Ian', 'Internalone')]});
                sc.O = O; sc.A = A; sc.subs = {}; save();
                const P = (c, list) => list.map((p) => ({username: `${c}${p}`, role: {ed: 'editor', se: 'sectionEditor', fc: 'funding'}[p]}));
                const seed = async (c, key, body) => {
                    const full = {tag: `${c}${key.toLowerCase()}`, context: c, submitter: `${c}au`, title: `K5 ${key} ${c}`, participants: P(c, c === O ? ['ed', 'se', 'fc'] : ['ed']), ...body};
                    const s = await app.api.createSubmission(full);
                    sc.subs[key] = {c, id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds, title: full.title};
                    log(`[seed] ${key} #${s.submissionId} stage ${s.stageId} rounds ${JSON.stringify(s.reviewRounds)}`);
                    save();
                };
                const ir = (c, rs, files) => ({stage: 'internal', reviewers: rs.map(([n, st]) => ({username: `${c}${n}`, status: st})), ...(files ? {files: [{file: 'article.pdf'}]} : {})});
                const er = (c, rs, files) => ({stage: 'external', reviewers: rs.map(([n, st]) => ({username: `${c}${n}`, status: st})), ...(files ? {files: [{file: 'article.pdf'}]} : {})});
                await seed(O, 'E', {files: [{file: 'article.pdf'}]});
                await seed(O, 'W', {decisions: ['sendInternalReview'], reviewRounds: [ir(O, [])]});
                await seed(O, 'V1', {decisions: ['sendInternalReview'], reviewRounds: [ir(O, [['ri1', 'invited']])]});
                await seed(O, 'V2', {decisions: ['sendInternalReview'], reviewRounds: [ir(O, [['ri1', 'accepted']])]});
                await seed(O, 'V3', {decisions: ['sendInternalReview'], reviewRounds: [ir(O, [['ri1', 'declined']])]});
                await seed(O, 'V4', {decisions: ['sendInternalReview'], reviewRounds: [ir(O, [['ri1', 'completed'], ['ri2', 'invited']])]});
                await seed(O, 'N2', {decisions: ['sendInternalReview', 'requestRevisionsInternal', 'newInternalReviewRound', 'requestRevisionsInternal'], reviewRounds: [ir(O, [['ri1', 'completed']], true)]});
                await seed(O, 'L1', {decisions: ['sendInternalReview', 'sendExternalReview'], reviewRounds: [ir(O, [['ri1', 'completed']], true)]});
                await seed(O, 'L2', {decisions: ['skipInternalReview', 'newExternalReviewRound'], reviewRounds: [er(O, [['rv1', 'completed']], true)]});
                await seed(O, 'C1', {decisions: ['sendInternalReview', 'acceptFromInternal'], reviewRounds: [ir(O, [])]});
                await seed(O, 'C2', {decisions: ['sendInternalReview', 'newInternalReviewRound', 'acceptFromInternal'], reviewRounds: [ir(O, [])]});
                await seed(O, 'C3', {decisions: ['sendInternalReview', 'sendExternalReview', 'accept'], reviewRounds: [ir(O, [])]});
                await seed(O, 'C4', {decisions: ['skipExternalReview']});
                await seed(O, 'R1', {decisions: ['sendInternalReview', 'sendExternalReview'], reviewRounds: [ir(O, [['ri1', 'completed']])]});
                await seed(O, 'R2', {decisions: ['sendInternalReview', 'newInternalReviewRound', 'sendExternalReview'], reviewRounds: [ir(O, [['ri1', 'completed']])]});
                await seed(O, 'R3', {decisions: ['skipInternalReview']});
                await seed(O, 'R4', {decisions: ['sendInternalReview', 'sendExternalReview', 'newExternalReviewRound'], reviewRounds: [ir(O, [['ri1', 'completed']])]});
                await seed(O, 'X1', {decisions: ['skipInternalReview'], reviewRounds: [er(O, [['rv1', 'invited']])]});
                await seed(O, 'X2', {decisions: ['skipInternalReview'], reviewRounds: [er(O, [['rv1', 'completed']])]});
                await seed(A, 'A1', {decisions: ['sendInternalReview'], reviewRounds: [ir(A, [['ri1', 'completed']])]});
                await seed(A, 'A2', {decisions: ['sendInternalReview'], reviewRounds: [ir(A, [['ri1', 'invited']])]});
            } else if (isOJS) {
                const O = tag('u71k5jo');
                const A = tag('u71k5ja');
                const person = (c, n, roles, g, f) => ({username: `${c}${n}`, roles, givenName: g, familyName: f});
                await app.api.createContext({tag: O, context: {contactName: `Principal Contact ${O}`, contactEmail: `${O}contact@mail.test`}, review: {defaultReviewMode: 'open'}, users: [
                    person(O, 'ed', ['editor'], 'Eve', 'Journaleditor'), person(O, 'au', ['author'], 'Alex', 'Authorson'), person(O, 'rv1', ['externalReviewer'], 'Rita', 'Externalrev')]});
                await app.api.createContext({tag: A, context: {contactName: `Principal Contact ${A}`, contactEmail: `${A}contact@mail.test`}, users: [
                    person(A, 'ed', ['editor'], 'Eve', 'Journaleditor'), person(A, 'au', ['author'], 'Alex', 'Authorson'), person(A, 'rv1', ['externalReviewer'], 'Rita', 'Externalrev')]});
                sc.O = O; sc.A = A; sc.subs = {}; save();
                const seed = async (c, key, body) => {
                    const full = {tag: `${c}${key.toLowerCase()}`, context: c, submitter: `${c}au`, title: `K5 ${key} ${c}`, participants: [{username: `${c}ed`, role: 'editor'}], ...body};
                    const s = await app.api.createSubmission(full);
                    sc.subs[key] = {c, id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds, title: full.title};
                    log(`[seed] ${key} #${s.submissionId} rounds ${JSON.stringify(s.reviewRounds)}`);
                    save();
                };
                const xr = (c, st) => ({reviewers: [{username: `${c}rv1`, status: st}]});
                await seed(O, 'J1', {decisions: ['sendExternalReview'], reviewRounds: [xr(O, 'invited')]});
                await seed(O, 'J2', {decisions: ['sendExternalReview'], reviewRounds: [xr(O, 'completed')]});
                await seed(O, 'J5', {decisions: ['sendExternalReview'], reviewRounds: [xr(O, 'invited')]});
                await seed(A, 'J4', {decisions: ['sendExternalReview'], reviewRounds: [xr(A, 'completed')]});
            } else {
                const O = tag('u71k5s');
                await app.api.createContext({tag: O, context: {contactName: `Principal Contact ${O}`, contactEmail: `${O}contact@mail.test`}, users: [
                    {username: `${O}au`, roles: ['author'], givenName: 'Alex', familyName: 'Authorson'}, {username: `${O}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Moderator'}]});
                sc.O = O; sc.subs = {}; save();
                const s = await app.api.createSubmission({tag: `${O}q`, context: O, submitter: `${O}au`, title: `K5 Q ${O}`, participants: [{username: `${O}se`, role: 'sectionEditor'}]});
                sc.subs.Q = {c: O, id: s.submissionId, title: `K5 Q ${O}`}; save();
            }
        });
        if (!sc.O) throw new Error('no scratch context');
        const S = sc.subs;

        // ================================================================ OPS: read-only control
        if (isOPS) {
            if (on('ops')) await sect('ops', async () => {
                await as(sc.O, 'au');
                const i = await openWorkflow(authorWf(S.Q.id), 'ops-au-q');
                record('ops-summary', {author: brief(i)});
            });
            return;
        }
        // ================================================================ OJS: read-only controls
        if (isOJS) {
            if (on('ojs')) await sect('ojs', async () => {
                const out = {};
                await as(sc.O, 'au');
                out.j1 = brief(await openWorkflow(authorWf(S.J1.id, rkey(S.J1)), 'ojs-au-j1-open-invited'));
                out.j2 = brief(await openWorkflow(authorWf(S.J2.id, rkey(S.J2)), 'ojs-au-j2-open-completed'));
                const rr = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Read Review', exact: true}).first();
                await loc(page, 'OJS author view: Reviewers "Read Review"', rr);
                out.j2ReadReview = await rr.count();
                out.j5Before = brief(await openWorkflow(authorWf(S.J5.id, rkey(S.J5)), 'ojs-au-j5-before'));
                out.tasksBefore = await tasksPanel('ojs-au-tasks-before');
                await as(sc.O, 'ed');
                out.request = await decide(S.J5, rkey(S.J5), 'Request Revisions', 'ojs-ed-j5-request', {choiceRe: /not be subject/i});
                await as(sc.O, 'au');
                out.j5After = brief(await openWorkflow(authorWf(S.J5.id, rkey(S.J5)), 'ojs-au-j5-requested'));
                // a Notifications row, pressed
                const notif = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('heading', {name: /^Notifications$/i})}).last();
                const firstRow = notif.locator('button, a').filter({hasText: /\S/}).first();
                if (await firstRow.count()) { await firstRow.click().catch(() => {}); await page.waitForTimeout(1200); await idle(page); const ds = await dialogTexts(page); out.j5LetterWindow = ds.length > 1 ? {name: flat(ds[ds.length - 1].name, 100), text: flat(ds[ds.length - 1].text, 800)} : null; await snap(page, 'ojs-au-j5-letter', {w: out.j5LetterWindow}); await closeTopWindow(); }
                out.tasksAfter = await tasksPanel('ojs-au-tasks-after');
                await as(sc.A, 'au');
                out.j4 = brief(await openWorkflow(authorWf(S.J4.id, rkey(S.J4)), 'ojs-au-j4-anonymous-completed'));
                record('ojs-summary', out);
            });
            return;
        }

        // ================================================================ OMP
        const O = sc.O; const A = sc.A;
        const au = async () => as(O, 'au');

        // ---- emails: Rule 15, OMP1, OMP3 on monograph E, all decisions on screen
        if (on('emails')) await sect('emails', async () => {
            const E = S.E; const out = sc.emails || {}; sc.emails = out;
            await as(O, 'ed');
            out.send = await decide(E, 'workflow_1', 'Send to Internal Review', 'em-ed-send-internal');
            const st = await refreshRounds(E); out.stateAfterSend = st;
            out.mailAfterSend = await inbox(`${O}au@mail.test`);
            await au();
            out.auRound1 = brief(await openWorkflow(authorWf(E.id, rkey(E)), 'em-au-internal-r1-sent'));
            out.auRound1Reload = brief(await reloadRead('em-au-internal-r1-sent-reload'));
            out.tasks0 = await tasksPanel('em-au-tasks-after-send');
            // Request Revisions on the internal round, with its email
            await as(O, 'ed');
            out.request = await decide(E, rkey(E), 'Request Revisions', 'em-ed-request-internal');
            out.mailAfterRequest = await inbox(`${O}au@mail.test`);
            await au();
            out.auRequested = brief(await openWorkflow(authorWf(E.id, rkey(E)), 'em-au-internal-r1-requested'));
            out.auRequestedReload = brief(await reloadRead('em-au-internal-r1-requested-reload'));
            out.tasks1 = await tasksPanel('em-au-tasks-after-request');
            out.row1 = await mySubmissionsRow(E.title, 'em-au-mysubmissions-after-request');
            // the upload window left with a file chosen, unsaved
            await openWorkflow(authorWf(E.id, rkey(E)), 'em-au-before-unsaved-upload');
            {
                const btn = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload revisions', exact: true});
                if (await btn.count()) {
                    await btn.click();
                    const w = uploadWiz(page);
                    await w.locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000}).catch(() => {});
                    await idle(page);
                    const g = w.locator('select[id^="genreId"]');
                    if (await g.count()) await g.selectOption({label: 'Book Manuscript'}).catch(() => {});
                    await w.locator('input[type="file"]').setInputFiles(pdfNamed('k5-unsaved.pdf'));
                    await page.waitForTimeout(2500);
                    await snap(page, 'em-au-upload-unsaved');
                    const before = dialogsSeen.length;
                    const x = w.getByRole('button', {name: /^(Close|Cancel)$/}).or(w.getByRole('link', {name: 'Cancel', exact: true})).first();
                    await loc(page, 'author upload window: its close/cancel', x);
                    await x.click().catch(() => {}); await page.waitForTimeout(1200); await idle(page);
                    const ds = await dialogTexts(page);
                    out.unsavedLeave = {browserDialogs: dialogsSeen.slice(before), windows: ds.map((d) => ({name: flat(d.name, 100), text: flat(d.text, 300)}))};
                    await snap(page, 'em-au-upload-unsaved-left', {leave: out.unsavedLeave});
                    const ok = topWin(page).getByRole('button', {name: /^(OK|Yes)$/}).first();
                    if (ds.length > 1 && await ok.count()) { await ok.click().catch(() => {}); await page.waitForTimeout(800); await idle(page); }
                    out.afterUnsaved = brief(await openWorkflow(authorWf(E.id, rkey(E)), 'em-au-after-unsaved-upload'));
                }
            }
            // the author's "Upload revisions"
            await openWorkflow(authorWf(E.id, rkey(E)), 'em-au-before-upload');
            out.upload = await authorUpload('k5-e-revision.pdf', 'em-au-upload');
            out.auRevised = brief(await openWorkflow(authorWf(E.id, rkey(E)), 'em-au-internal-r1-revised'));
            out.auRevisedReload = brief(await reloadRead('em-au-internal-r1-revised-reload'));
            out.tasks2 = await tasksPanel('em-au-tasks-after-upload');
            out.row2 = await mySubmissionsRow(E.title, 'em-au-mysubmissions-after-upload');
            await as(O, 'ed');
            out.edRevised = brief(await openWorkflow(wf(E.id, rkey(E)), 'em-ed-internal-r1-revised'));
            // Send to External Review
            out.sendExt = await decide(E, rkey(E), 'Send to External Review', 'em-ed-send-external');
            out.stateAfterExt = await refreshRounds(E);
            await au();
            const ext = rkeyStage(E, 3);
            out.auExternal = brief(await openWorkflow(authorWf(E.id, ext), 'em-au-external-r1'));
            out.auExternalReload = brief(await reloadRead('em-au-external-r1-reload'));
            // press a Notifications row
            const notifRows = async (label) => {
                const dlg = page.locator('[role="dialog"]:visible').first();
                const items = await dlg.evaluate((root) => {
                    const h = [...root.querySelectorAll('h2,h3')].find((x) => /^Notifications$/i.test(x.innerText.trim()));
                    if (!h) return null;
                    let box = h.parentElement; for (let i = 0; i < 3 && box && box.querySelectorAll('button, a').length === 0; i++) box = box.parentElement;
                    return {boxText: box ? box.innerText.trim().replace(/\s+/g, ' ').slice(0, 1500) : null, items: box ? [...box.querySelectorAll('button, a')].map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 20) : []};
                }).catch(() => null);
                record(label, {items});
                return items;
            };
            out.auExternalNotif = await notifRows('em-au-external-notifications');
            const firstNotif = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('heading', {name: /^Notifications$/i})}).last().locator('button, a').filter({hasText: /Internal|Revision|Review/i}).first();
            await loc(page, 'author External Review "Notifications": a letter', firstNotif);
            if (await firstNotif.count()) {
                await firstNotif.click().catch(() => {}); await page.waitForTimeout(1500); await idle(page);
                const ds = await dialogTexts(page);
                out.auLetterWindow = ds.length > 1 ? {name: flat(ds[ds.length - 1].name, 120), text: flat(ds[ds.length - 1].text, 1200), buttons: ds[ds.length - 1].buttons.map((b) => b.t)} : {none: true, count: ds.length};
                await snap(page, 'em-au-external-letter', {w: out.auLetterWindow});
                await closeTopWindow();
            }
            out.auInternalAfterExt = brief(await openWorkflow(authorWf(E.id, rkeyStage(E, 2)), 'em-au-internal-r1-after-external'));
            out.tasks3 = await tasksPanel('em-au-tasks-after-send-external');
            // OMP1 control: Request Revisions on External Review
            await as(O, 'ed');
            out.extRequest = await decide(E, ext, 'Request Revisions', 'em-ed-request-external', {choiceRe: /not be subject/i});
            await au();
            out.tasks4 = await tasksPanel('em-au-tasks-after-external-request');
            out.auExternalRequested = brief(await openWorkflow(authorWf(E.id, ext), 'em-au-external-r1-requested'));
            out.auExternalNotif2 = await notifRows('em-au-external-notifications-2');
            out.row3 = await mySubmissionsRow(E.title, 'em-au-mysubmissions-after-external-request');
            out.mailEnd = await inbox(`${O}au@mail.test`);
            save();
            record('emails-summary', out);
        });

        // ---- states: the author's view at each box (W, V1..V3), "Upload revisions" absent
        if (on('states')) await sect('states', async () => {
            const out = {};
            await au();
            for (const k of ['W', 'V1', 'V2', 'V3', 'V4']) out[k] = brief(await openWorkflow(authorWf(S[k].id, rkey(S[k])), `st-au-${k.toLowerCase()}`));
            // the sweep: press "Add" on "Review Tasks & Discussions" in the author view and leave it with text typed
            const add = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Add', exact: true}).first();
            await loc(page, 'author view "Review Tasks & Discussions" › "Add"', add);
            if (await add.count()) {
                await add.click(); await page.waitForTimeout(1500); await idle(page);
                const ds = await dialogTexts(page);
                out.addWindow = ds.length > 1 ? {name: flat(ds[ds.length - 1].name, 100), text: flat(ds[ds.length - 1].text, 800), buttons: ds[ds.length - 1].buttons.map((b) => b.t).slice(0, 20), inputs: ds[ds.length - 1].inputs.map((i) => `${i.type}:${i.name}:${i.label}`).slice(0, 12)} : null;
                await snap(page, 'st-au-v4-add-discussion', {w: out.addWindow});
                const subj = topWin(page).locator('input[type=text]:visible').first();
                if (await subj.count()) await subj.fill('K5 unsaved subject').catch(() => {});
                const before = dialogsSeen.length;
                await closeTopWindow();
                const ds2 = await dialogTexts(page);
                out.addLeave = {browserDialogs: dialogsSeen.slice(before), windows: ds2.map((d) => ({name: flat(d.name, 80), text: flat(d.text, 200)}))};
                await snap(page, 'st-au-v4-add-discussion-left', {leave: out.addLeave});
                const yes = topWin(page).getByRole('button', {name: /^(Yes|OK|Discard|Close)/}).first();
                if (ds2.length > 1 && await yes.count()) { await yes.click().catch(() => {}); await page.waitForTimeout(800); }
            }
            record('states-summary', out);
        });

        // ---- reviewers: Rule 16 / OMP5 / td-reviewers
        if (on('reviewers')) await sect('reviewers', async () => {
            const out = {};
            await au();
            out.v1Invited = brief(await openWorkflow(authorWf(S.V1.id, rkey(S.V1)), 'rv-au-v1-invited'));
            // ri1 accepts (no submit yet): state accepted, then submits
            await reviewerSubmits(O, 'ri1', S.V1.id, 'rv-ri1-v1');
            await au();
            out.v1Completed = brief(await openWorkflow(authorWf(S.V1.id, rkey(S.V1)), 'rv-au-v1-completed'));
            out.v1CompletedReload = brief(await reloadRead('rv-au-v1-completed-reload'));
            const rr = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Read Review', exact: true}).first();
            await loc(page, 'author view: Reviewers "Read Review"', rr);
            if (await rr.count()) {
                await rr.click(); await page.waitForTimeout(1500); await idle(page);
                const ds = await dialogTexts(page);
                out.readReview = ds.length > 1 ? {name: flat(ds[ds.length - 1].name, 120), text: flat(ds[ds.length - 1].text, 1500), buttons: ds[ds.length - 1].buttons.map((b) => b.t).slice(0, 20)} : {none: true};
                await snap(page, 'rv-au-v1-read-review', {w: out.readReview});
                await closeTopWindow();
            }
            // V4: an anonymous review added on screen and submitted
            await as(O, 'ed');
            await openWorkflow(wf(S.V4.id, rkey(S.V4)), 'rv-ed-v4-before-add');
            out.v4Add = await addReviewer('Ivo Internalthree', 'rv-ed-v4-add-ri3', {method: 'Anonymous Reviewer/Anonymous Author'});
            out.v4Ed = brief(await openWorkflow(wf(S.V4.id, rkey(S.V4)), 'rv-ed-v4-after-add'));
            await reviewerSubmits(O, 'ri3', S.V4.id, 'rv-ri3-v4');
            await as(O, 'ed');
            out.v4EdAfter = brief(await openWorkflow(wf(S.V4.id, rkey(S.V4)), 'rv-ed-v4-after-ri3'));
            out.v4State = await subState(S.V4.id);
            await au();
            out.v4Author = brief(await openWorkflow(authorWf(S.V4.id, rkey(S.V4)), 'rv-au-v4-mixed'));
            // external controls on press O
            out.x1 = brief(await openWorkflow(authorWf(S.X1.id, rkey(S.X1)), 'rv-au-x1-external-invited'));
            out.x2 = brief(await openWorkflow(authorWf(S.X2.id, rkey(S.X2)), 'rv-au-x2-external-completed'));
            // press A (anonymous default)
            await as(A, 'au');
            out.a1 = brief(await openWorkflow(authorWf(S.A1.id, rkey(S.A1), A), 'rv-au-a1-anonymous-completed'));
            out.a2 = brief(await openWorkflow(authorWf(S.A2.id, rkey(S.A2), A), 'rv-au-a2-anonymous-invited'));
            await as(A, 'ed');
            out.a1Ed = brief(await openWorkflow(wf(S.A1.id, rkey(S.A1), A), 'rv-ed-a1'));
            record('reviewers-summary', out);
        });

        // ---- rounds: "Upload revisions" on Round 2 of N2 lands on Round 2
        if (on('rounds')) await sect('rounds', async () => {
            const N = S.N2; const out = {};
            await as(O, 'ed');
            out.state0 = await refreshRounds(N);
            out.edR1 = brief(await openWorkflow(wf(N.id, rkey(N, 0)), 'nr-ed-r1'));
            out.edR2 = brief(await openWorkflow(wf(N.id, rkey(N, 1)), 'nr-ed-r2'));
            await au();
            out.auR1 = brief(await openWorkflow(authorWf(N.id, rkey(N, 0)), 'nr-au-r1-past'));
            out.auR2 = brief(await openWorkflow(authorWf(N.id, rkey(N, 1)), 'nr-au-r2-requested'));
            out.upload = await authorUpload('k5-n2-round2.pdf', 'nr-au-r2-upload');
            out.auR2After = brief(await openWorkflow(authorWf(N.id, rkey(N, 1)), 'nr-au-r2-after-upload'));
            out.auR2Reload = brief(await reloadRead('nr-au-r2-after-upload-reload'));
            out.auR1After = brief(await openWorkflow(authorWf(N.id, rkey(N, 0)), 'nr-au-r1-after-upload'));
            await as(O, 'ed');
            out.edR1After = brief(await openWorkflow(wf(N.id, rkey(N, 0)), 'nr-ed-r1-after'));
            out.edR2After = brief(await openWorkflow(wf(N.id, rkey(N, 1)), 'nr-ed-r2-after'));
            // the past round's own "Upload revisions" in the author view, if offered: press it and upload
            await au();
            await openWorkflow(authorWf(N.id, rkey(N, 0)), 'nr-au-r1-before-past-upload');
            const b = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload revisions', exact: true});
            out.pastRoundUploadOffered = await b.count();
            if (out.pastRoundUploadOffered) {
                out.pastUpload = await authorUpload('k5-n2-round1-late.pdf', 'nr-au-r1-past-upload');
                out.auR1Past = brief(await openWorkflow(authorWf(N.id, rkey(N, 0)), 'nr-au-r1-after-past-upload'));
                out.auR1PastReload = brief(await reloadRead('nr-au-r1-after-past-upload-reload'));
                out.auR2Past = brief(await openWorkflow(authorWf(N.id, rkey(N, 1)), 'nr-au-r2-after-past-upload'));
                await as(O, 'ed');
                out.edR2Past = brief(await openWorkflow(wf(N.id, rkey(N, 1)), 'nr-ed-r2-after-past-upload'));
            }
            record('rounds-summary', out);
        });

        // ---- back: 17a "Move to Review" from Copyediting (C1..C4)
        if (on('back')) await sect('back', async () => {
            const out = {};
            await as(O, 'ed');
            for (const k of ['C1', 'C2', 'C3', 'C4']) {
                const s = S[k]; const o = {};
                o.before = await refreshRounds(s);
                // Rule 18 after Accept: each internal round while the monograph is at Copyediting
                o.internalAtCopyediting = [];
                for (const r of s.rounds.filter((x) => x.stageId === 2)) o.internalAtCopyediting.push(brief(await openWorkflow(wf(s.id, `workflow_2_${r.id}`), `bk-ed-${k.toLowerCase()}-internal-r${r.round}-at-copyediting`)));
                const ce = await openWorkflow(wf(s.id, 'workflow_4'), `bk-ed-${k.toLowerCase()}-copyediting`);
                o.copyeditingActions = (ce.actionButtons || []).map((b) => b.text);
                const label = o.copyeditingActions.find((t) => /^Move to (Review|Submission)$/.test(t));
                o.label = label || null;
                if (label) {
                    const p = await press(label, `bk-ed-${k.toLowerCase()}-back`);
                    if (p.onWizard) { o.pages = await walk(`bk-ed-${k.toLowerCase()}-back`); o.rec = await recordDecision(`bk-ed-${k.toLowerCase()}-back`); }
                    o.after = await refreshRounds(s);
                    o.landing = brief(await openWorkflow(wf(s.id), `bk-ed-${k.toLowerCase()}-landing`));
                    o.landingReload = brief(await reloadRead(`bk-ed-${k.toLowerCase()}-landing-reload`));
                }
                out[k] = o;
                log(`[back ${k}]`, label, '→ stage', o.after && o.after.stageId, '|', o.landing && o.landing.h2, '|', o.landing && flat(o.landing.status, 100));
            }
            // Rule 18 after Accept: C1 before its move is gone; read C3's internal round (moved on through External, then Accept, then back) as an extra read
            save();
            record('back-summary', out);
        });

        // ---- cancel: 17b "Cancel Review Round" on External Review Round 1 (R1..R4)
        if (on('cancel')) await sect('cancel', async () => {
            const out = {};
            await as(O, 'ed');
            for (const k of ['R1', 'R2', 'R3', 'R4']) {
                const s = S[k]; const o = {};
                o.before = await refreshRounds(s);
                const extRounds = s.rounds.filter((r) => r.stageId === 3);
                const last = extRounds[extRounds.length - 1];
                const key = last ? `workflow_3_${last.id}` : 'workflow_3';
                o.external = brief(await openWorkflow(wf(s.id, key), `cx-ed-${k.toLowerCase()}-external-last`));
                const p = await press('Cancel Review Round', `cx-ed-${k.toLowerCase()}-cancel`);
                o.press = {absent: !!p.absent, windows: p.windows};
                if (p.onWizard) { o.pages = await walk(`cx-ed-${k.toLowerCase()}-cancel`); o.rec = await recordDecision(`cx-ed-${k.toLowerCase()}-cancel`); }
                const v = topWin(page).getByRole('link', {name: /View Submission/}).or(topWin(page).getByRole('button', {name: /View Submission/})).first();
                if (await v.count()) {
                    await v.click(); await idle(page); await page.waitForTimeout(1500); await idle(page);
                    const li = await wfInfo(page).catch(() => ({}));
                    await snap(page, `cx-ed-${k.toLowerCase()}-view-submission`, {info: li});
                    o.viewSubmission = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), ...brief(li)};
                }
                o.after = await refreshRounds(s);
                o.landing = brief(await openWorkflow(wf(s.id), `cx-ed-${k.toLowerCase()}-landing`));
                o.landingReload = brief(await reloadRead(`cx-ed-${k.toLowerCase()}-landing-reload`));
                // each internal round, opened
                o.internal = [];
                for (const r of s.rounds.filter((x) => x.stageId === 2)) o.internal.push(brief(await openWorkflow(wf(s.id, `workflow_2_${r.id}`), `cx-ed-${k.toLowerCase()}-internal-r${r.round}`)));
                out[k] = o;
                log(`[cancel ${k}]`, '→ stage', o.after && o.after.stageId, '|', o.landing && o.landing.h2, '|', o.landing && flat(o.landing.status, 100), '|', JSON.stringify(o.landing && o.landing.actions));
            }
            // the author's view of R1 after the return
            await au();
            out.R1Author = brief(await openWorkflow(authorWf(S.R1.id), 'cx-au-r1-landing'));
            save();
            record('cancel-summary', out);
        });

        // ---- left: Rule 18 on L1 (internal R1 after Send to External Review), per level; L2 control; C3 after Accept
        if (on('left')) await sect('left', async () => {
            const L = S.L1; const out = {levels: {}};
            await as(O, 'ed'); await refreshRounds(L); await refreshRounds(S.L2);
            const ik = rkeyStage(L, 2);
            for (const who of ['admin', 'mgr', 'ed', 'se', 'fc']) {
                await as(O, who);
                const i = await openWorkflow(wf(L.id, ik), `lf-${who}-l1-internal-r1`);
                out.levels[who] = {...brief(i), addReviewer: (i.allButtons || []).includes('Add Reviewer'), uploadSelect: (i.allButtons || []).some((b) => /^Upload\/Select Files$/.test(b)), upload: (i.allButtons || []).some((b) => /^Upload$/.test(b))};
                const x = await openWorkflow(wf(L.id, rkeyStage(L, 3)), `lf-${who}-l1-external-r1`);
                out.levels[who].externalActions = (x.actionButtons || []).map((b) => b.text);
            }
            // the author: past internal round
            await au();
            out.author = brief(await openWorkflow(authorWf(L.id, ik), 'lf-au-l1-internal-r1'));
            // ed: press each panel control on the past round
            await as(O, 'ed');
            await openWorkflow(wf(L.id, ik), 'lf-ed-l1-before-controls');
            out.filesWindow = await pressPanelButton('Files for Review', 'Upload/Select Files', 'lf-ed-l1-files-for-review-window');
            await closeTopWindow();
            await page.waitForTimeout(700);
            await openWorkflow(wf(L.id, ik), 'lf-ed-l1-before-revision-upload');
            {
                const container = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('table', {name: 'Revisions Uploaded', exact: true})}).last();
                const btn = container.getByRole('button', {name: 'Upload', exact: true}).first();
                await loc(page, 'past internal round: "Revisions Uploaded" › "Upload" (editor)', btn);
                if (await btn.count()) { await btn.click(); out.revisionUpload = await finishUpload('k5-l1-past-revision.pdf', 'lf-ed-l1-revision'); }
            }
            out.afterRevision = brief(await openWorkflow(wf(L.id, ik), 'lf-ed-l1-after-revision-upload'));
            out.afterRevisionReload = brief(await reloadRead('lf-ed-l1-after-revision-upload-reload'));
            // Add Reviewer on the past round
            out.add = await addReviewer('Ina Internaltwo', 'lf-ed-l1-add-ri2');
            out.afterAdd = brief(await openWorkflow(wf(L.id, ik), 'lf-ed-l1-after-add'));
            out.afterAddReload = brief(await reloadRead('lf-ed-l1-after-add-reload'));
            out.stateAfter = await subState(L.id);
            out.externalAfter = brief(await openWorkflow(wf(L.id, rkeyStage(L, 3)), 'lf-ed-l1-external-after-add'));
            out.landingAfter = brief(await openWorkflow(wf(L.id), 'lf-ed-l1-landing-after-add'));
            // ri2's review page for the past-round request
            await as(O, 'ri2');
            await page.goto(ctxUrl(`/reviewer/submission/${L.id}`)); await idle(page);
            const r2 = await snap(page, 'lf-ri2-l1-review-page');
            out.ri2Page = flat(r2.text && r2.text.main, 600);
            // L2 control: a past External Review round
            await as(O, 'ed');
            out.l2Past = brief(await openWorkflow(wf(S.L2.id, rkeyStage(S.L2, 3, 0)), 'lf-ed-l2-external-r1-past'));
            out.l2Current = brief(await openWorkflow(wf(S.L2.id, rkeyStage(S.L2, 3, 1)), 'lf-ed-l2-external-r2-current'));
            // after Accept from internal (C1 went back in phase back; use C3's internal round and a fresh read of C2 when still at copyediting)
            for (const k of ['C1', 'C2', 'C3']) { const s = S[k]; await refreshRounds(s); const i2 = s.rounds.filter((r) => r.stageId === 2); if (i2.length) out[`${k}Internal`] = brief(await openWorkflow(wf(s.id, `workflow_2_${i2[0].id}`), `lf-ed-${k.toLowerCase()}-internal-r1`)); out[`${k}State`] = (await subState(s.id)).stageId; }
            save();
            record('left-summary', out);
        });
        // ---- sweep: the author's own panel controls, the task link, the anonymous control of the participants list,
        //      the late reviewer's "Previous Reviews"; and a read-only re-drive of the states/reviewers/rounds screens
        //      (their first run record was overwritten by a second process started in the same second)
        if (on('sweep')) await sect('sweep', async () => {
            const out = {};
            await au();
            // re-drive, read-only
            for (const k of ['W', 'V1', 'V2', 'V3', 'V4', 'X1', 'X2']) out[`re${k}`] = brief(await openWorkflow(authorWf(S[k].id, rkey(S[k])), `sw-au-${k.toLowerCase()}`));
            await refreshRounds(S.N2).catch(() => {});
            out.reN2r1 = brief(await openWorkflow(authorWf(S.N2.id, rkey(S.N2, 0)), 'sw-au-n2-r1'));
            out.reN2r2 = brief(await openWorkflow(authorWf(S.N2.id, rkey(S.N2, 1)), 'sw-au-n2-r2'));
            // the author's "Upload" above "Revisions Uploaded" on a round with no revision request (W)
            await openWorkflow(authorWf(S.W.id, rkey(S.W)), 'sw-au-w-before-panel-upload');
            out.wPanelUpload = await pressPanelButton('Revisions Uploaded', 'Upload', 'sw-au-w-panel-upload');
            await closeTopWindow();
            out.wAfterPanelUpload = brief(await openWorkflow(authorWf(S.W.id, rkey(S.W)), 'sw-au-w-after-panel-upload'));
            // the same on the round the monograph has left (E's internal round, now at External Review)
            await refreshRounds(S.E).catch(() => {});
            await openWorkflow(authorWf(S.E.id, rkeyStage(S.E, 2)), 'sw-au-e-internal-past');
            out.ePastPanelUpload = await pressPanelButton('Revisions Uploaded', 'Upload', 'sw-au-e-internal-past-panel-upload');
            await closeTopWindow();
            // a revised file's "More Actions" on that past round, read and closed by its own button
            await openWorkflow(authorWf(S.E.id, rkeyStage(S.E, 2)), 'sw-au-e-internal-past-2');
            {
                const tbl = page.locator('[role="dialog"]:visible').first().getByRole('table', {name: 'Revisions Uploaded', exact: true});
                const more = tbl.getByRole('button', {name: /More Actions/}).first();
                await loc(page, 'author past internal round: a revised file\'s "More Actions"', more);
                if (await more.count()) {
                    await more.click(); await page.waitForTimeout(700);
                    out.ePastRowMenu = await page.getByRole('menuitem').allInnerTexts().catch(() => []);
                    await snap(page, 'sw-au-e-internal-past-row-menu', {menu: out.ePastRowMenu});
                    await more.click().catch(() => {}); await page.waitForTimeout(500);
                }
            }
            // the "Add" window of "Review Tasks & Discussions" on V4 (open + anonymous reviewers), left with a name typed
            await openWorkflow(authorWf(S.V4.id, rkey(S.V4)), 'sw-au-v4-before-add');
            const openAdd = async (label) => {
                const add = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Add', exact: true}).last();
                await add.click(); await page.waitForTimeout(1500); await idle(page);
                const ds = await dialogTexts(page);
                const top = ds[ds.length - 1];
                const w = top ? {name: flat(top.name, 100), participants: top.inputs.filter((i) => i.name === 'participants').map((i) => flat(i.label, 160))} : null;
                await snap(page, label, {w});
                return w;
            };
            out.v4AddWindow = await openAdd('sw-au-v4-add-discussion');
            {
                const subj = topWin(page).locator('input[name="title"]:visible').first();
                if (await subj.count()) await subj.fill('K5 unsaved subject').catch(() => {});
                await closeTopWindow();
                const ds2 = await dialogTexts(page);
                out.v4AddLeave = ds2.map((d) => flat(d.text, 160));
                const no = topWin(page).getByRole('button', {name: 'Yes', exact: true}).first();
                if (ds2.length > 1 && await no.count()) { await no.click().catch(() => {}); await page.waitForTimeout(900); }
                await snap(page, 'sw-au-v4-add-discussion-left', {leave: out.v4AddLeave});
            }
            // the Tasks panel item after the External Review request: press it
            await page.goto(ctxUrl('/dashboard/mySubmissions')); await idle(page); await page.waitForTimeout(600);
            const tb = page.getByRole('button', {name: /^Tasks/}).first();
            await tb.click().catch(() => {}); await page.waitForTimeout(1200); await idle(page);
            const item = topWin(page).getByText('Revisions to consider in External Review.').first();
            await loc(page, 'Tasks panel: "Revisions to consider in External Review." item', item);
            out.taskItem = await item.count();
            if (out.taskItem) {
                const link = topWin(page).locator('a, button').filter({hasText: /Revisions to consider/}).first();
                const target = (await link.count()) ? link : item;
                await target.click().catch(() => {}); await page.waitForTimeout(2000); await idle(page);
                const i = await wfInfo(page).catch(() => ({}));
                await snap(page, 'sw-au-task-pressed', {info: i});
                out.taskLanding = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), h2: i.h2, status: i.statusBox && i.statusBox.text};
                log('[task pressed]', JSON.stringify(out.taskLanding));
            }
            // press A (anonymous): the author's "Add" participants list on A1 (completed anonymous review)
            await as(A, 'au');
            out.reA1 = brief(await openWorkflow(authorWf(S.A1.id, rkey(S.A1), A), 'sw-au-a1'));
            out.reA2 = brief(await openWorkflow(authorWf(S.A2.id, rkey(S.A2), A), 'sw-au-a2'));
            await openWorkflow(authorWf(S.A1.id, rkey(S.A1), A), 'sw-au-a1-before-add');
            out.a1AddWindow = await openAdd('sw-au-a1-add-discussion');
            await closeTopWindow();
            // the late reviewer on L1's past internal round: "Previous Reviews" › "Read Round 1 Review"
            await as(O, 'ri2');
            await page.goto(ctxUrl(`/reviewer/submission/${S.L1.id}`)); await idle(page);
            const prev = page.getByRole('button', {name: /Read Round 1 Review/}).first();
            await loc(page, 'reviewer wizard "Previous Reviews" › "Read Round 1 Review"', prev);
            if (await prev.count()) {
                await prev.click(); await page.waitForTimeout(1500); await idle(page);
                const ds = await dialogTexts(page);
                out.ri2Previous = ds.length ? {name: flat(ds[ds.length - 1].name, 100), text: flat(ds[ds.length - 1].text, 700)} : null;
                await snap(page, 'sw-ri2-l1-previous-review', {w: out.ri2Previous});
                await closeTopWindow();
            }
            // editor re-reads
            await as(O, 'ed');
            out.reV4Ed = brief(await openWorkflow(wf(S.V4.id, rkey(S.V4)), 'sw-ed-v4'));
            out.reN2Ed = brief(await openWorkflow(wf(S.N2.id, rkey(S.N2, 1)), 'sw-ed-n2-r2'));
            record('sweep-summary', out);
        });
        // ---- late: the author's "Upload" above the past internal round's "Revisions Uploaded" while External Review
        //      asks for revisions (E), completed; control: the same press on L1, whose External Review asks nothing
        if (on('late')) await sect('late', async () => {
            const out = {};
            await au();
            await refreshRounds(S.E).catch(() => {}); await refreshRounds(S.L1).catch(() => {});
            out.lControl = await (async () => { await openWorkflow(authorWf(S.L1.id, rkeyStage(S.L1, 2)), 'lt-au-l1-internal-past'); const r = await pressPanelButton('Revisions Uploaded', 'Upload', 'lt-au-l1-internal-past-panel-upload'); await closeTopWindow(); return r; })();
            out.eExtBefore = brief(await openWorkflow(authorWf(S.E.id, rkeyStage(S.E, 3)), 'lt-au-e-external-before'));
            await openWorkflow(authorWf(S.E.id, rkeyStage(S.E, 2)), 'lt-au-e-internal-past-before');
            {
                const container = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('table', {name: 'Revisions Uploaded', exact: true})}).last();
                const btn = container.getByRole('button', {name: 'Upload', exact: true}).first();
                await loc(page, 'author, past internal round: "Revisions Uploaded" › "Upload"', btn);
                await btn.click();
                out.upload = await finishUpload('k5-e-late-internal.pdf', 'lt-au-e-internal-past');
            }
            out.eIntAfter = brief(await openWorkflow(authorWf(S.E.id, rkeyStage(S.E, 2)), 'lt-au-e-internal-past-after'));
            out.eIntReload = brief(await reloadRead('lt-au-e-internal-past-after-reload'));
            out.eExtAfter = brief(await openWorkflow(authorWf(S.E.id, rkeyStage(S.E, 3)), 'lt-au-e-external-after'));
            await as(O, 'ed');
            out.edInt = brief(await openWorkflow(wf(S.E.id, rkeyStage(S.E, 2)), 'lt-ed-e-internal-past-after'));
            out.edExt = brief(await openWorkflow(wf(S.E.id, rkeyStage(S.E, 3)), 'lt-ed-e-external-after'));
            record('late-summary', out);
        });
        // ---- cancelled: Rule 16's state axis, a cancelled open request (V2's accepted request, cancelled on screen)
        if (on('cancelled')) await sect('cancelled', async () => {
            const out = {};
            await as(O, 'ed');
            await openWorkflow(wf(S.V2.id, rkey(S.V2)), 'cr-ed-v2-before');
            const row = page.locator('[role="dialog"]:visible').first().getByRole('table', {name: 'Reviewers', exact: true}).locator('tbody tr').filter({hasText: 'Ian Internalone'}).first();
            await row.getByRole('button', {name: /More Actions/}).first().click();
            await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
            out.menu = (await page.getByRole('menuitem').allInnerTexts()).map((x) => x.trim());
            const item = page.getByRole('menuitem', {name: 'Cancel Reviewer', exact: true});
            await loc(page, 'reviewer row "More Actions" › "Cancel Reviewer"', item);
            if (await item.count()) {
                await item.click(); await idle(page);
                await page.waitForFunction(() => { const ta = [...document.querySelectorAll('textarea')].pop(); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 20000}).catch(() => {});
                await idle(page); await page.waitForTimeout(600);
                await snap(page, 'cr-ed-v2-cancel-window');
                await topWin(page).getByRole('button', {name: 'Cancel Reviewer', exact: true}).last().click().catch(() => {});
                await idle(page); await page.waitForTimeout(1500); await idle(page);
            }
            out.ed = brief(await openWorkflow(wf(S.V2.id, rkey(S.V2)), 'cr-ed-v2-after'));
            out.state = await subState(S.V2.id);
            await au();
            out.au = brief(await openWorkflow(authorWf(S.V2.id, rkey(S.V2)), 'cr-au-v2-cancelled'));
            out.auReload = brief(await reloadRead('cr-au-v2-cancelled-reload'));
            record('cancelled-summary', out);
        });
    } finally {
        record('browser-dialogs', dialogsSeen);
        await close();
    }
});
