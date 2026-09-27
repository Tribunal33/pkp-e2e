// U71 claim check, chunk K3: the decision buttons of an internal round and what each does.
// Spec: docs/specs/U71-internal-review-stage.md lines 147–200 (Rules 8–13), register OMP2, OMP4, OMP6
// (entries 480–490, 503–516, 528–542, summary rows 460–465); footnotes r8, r11, td-resubmit, r12,
// td-files, td-carry, f-omp2, f-omp4, f-omp6.
//
// OMP: one scratch press (tag u71k3…) with mgr (Press manager), ed (Press editor, manager-level), se
// (Series editor, deciding), se2 (Series editor, recommend-only on its assignments), fc (Funding
// coordinator), au (author), ri1..ri2 (Internal Reviewers), rv1 (External Reviewer). Monographs
// (submitter au):
//   R   internal R1: file, ri1 invited; ed, se, se2(rec-only), fc       → Rule 8 roster per level, each button's wizard, Rule 11
//   CA  internal R1: ri1 accepted; ed                                    → Rule 9 axis
//   CD  internal R1: ri1 declined; ed                                    → Rule 9 axis
//   CC  internal R1: ri1 completed; ed                                   → Rule 9 axis
//   P   internal R1 (ri1 completed) + R2 (empty); ed, se                  → Rule 8 past round / stage entry
//   X1  internal R1: ri1 invited; ed                                      → Rule 12 "Cancel Review Round" from Round 1
//   X2  internal R1 (ri1 completed) + R2 (empty); ed                      → Rule 12 "Cancel Review Round" from Round 2
//   DC  internal R1: ri1 invited; ed, se                                  → Rule 12 Decline, Rule 10 per level, Revert Decline
//   RR  internal R1: file, ri1 completed; ed                              → Request Revisions, author upload, Accept (td-carry 1)
//   RN  internal R1: file, ri1 completed; ed                              → Request Revisions, upload, Create New Review Round (td-carry 2), R2 revision, Send to External Review (td-files 2)
//   FS  internal R1: file; ed                                             → editor revision upload, Send to External Review (td-files 1)
//   NR  internal R1: file; ed                                             → Send to External Review with no revision (OMP4)
//   T   internal R1: ri1 invited; ed, se2(rec-only)                       → td-resubmit (typed decisions 25 and 21)
//   EA  external R1: file, rv1 completed; ed, se2(rec-only)               → OMP2 control: external Request Revisions (choice), upload, Accept
//   EN  external R1: file, rv1 completed; ed                              → OMP2 control: external Request Revisions, upload, Create New Review Round
//   EX  external R1: rv1 invited; ed, se2(rec-only) (seeded in phase extra) → OMP6: "Recommend Revisions" on External vs Internal Review
//   SS  Submission stage, a submission file; ed (seeded in phase extra2)   → OMP4 lean: the Submission stage's "Select Files"
// OJS (read-only controls): scratch journal, external rounds: OI invited, OA accepted, OP two rounds.
// OPS (read-only control): scratch server, one queued preprint.
//
//   PROBE_FEATURE=U71 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U71/K3/k3.js
//   PHASES=seed,roster,cancelaxis,past,resubmit,decline,cancel,rr,rn,fs,nr,ext,extra,extra2,ojsentry,ojs,ops   (default all; later phases reuse k3-state-<app>.json)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const PDF = fs.readFileSync(path.join(REPO, 'apps/omp/playwright/fixtures/files/article.pdf'));
const ALL = ['seed', 'roster', 'cancelaxis', 'past', 'resubmit', 'decline', 'cancel', 'rr', 'rn', 'fs', 'nr', 'ext', 'extra', 'extra2', 'ojsentry', 'ojs', 'ops'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const stateFile = (app) => path.join(outDir(), `k3-state-${app.name}.json`);
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

    try {
        // ================================================================ seed
        if (on('seed') && !sc.t) await sect('seed', async () => {
            const t = tag(isOMP ? 'u71k3' : isOJS ? 'u71k3j' : 'u71k3s');
            const users = [
                {username: `${t}mgr`, roles: ['manager'], givenName: 'Maya', familyName: 'Managerson'},
                {username: `${t}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Serieseditor'},
                {username: `${t}au`, roles: ['author'], givenName: 'Alex', familyName: 'Authorson'},
            ];
            if (!isOPS) {
                users.push({username: `${t}ed`, roles: ['editor'], givenName: 'Eve', familyName: 'Presseditor'});
                users.push({username: `${t}se2`, roles: ['sectionEditor'], givenName: 'Selma', familyName: 'Recommender'});
                users.push({username: `${t}fc`, roles: ['funding'], givenName: 'Fran', familyName: 'Funder'});
                users.push({username: `${t}rv1`, roles: ['externalReviewer'], givenName: 'Rita', familyName: 'Externalrev'});
            }
            if (isOMP) {
                users.push({username: `${t}ri1`, roles: ['internalReviewer'], givenName: 'Ian', familyName: 'Internalone'});
                users.push({username: `${t}ri2`, roles: ['internalReviewer'], givenName: 'Ina', familyName: 'Internaltwo'});
            }
            await app.api.createContext({tag: t, context: {contactName: `Principal Contact ${t}`, contactEmail: `${t}contact@mail.test`}, users});
            sc.t = t; save();
            const P = (list) => list.map((p) => (typeof p === 'string' ? {username: `${t}${p}`, role: {ed: 'editor', se: 'sectionEditor', fc: 'funding'}[p]} : {username: `${t}${p[0]}`, role: 'sectionEditor', recommendOnly: true}));
            const seed = async (key, body) => {
                const full = {tag: `${t}${key.toLowerCase()}`, context: t, submitter: `${t}au`, title: `K3 ${key} ${t}`, ...body};
                const s = await app.api.createSubmission(full);
                sc[key] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds, title: full.title};
                log(`[seed] ${key} #${s.submissionId} stage ${s.stageId} rounds ${JSON.stringify(s.reviewRounds)}`);
                save();
            };
            const ir = (reviewers, files) => ({stage: 'internal', reviewers: reviewers.map(([n, st]) => ({username: `${t}${n}`, status: st})), ...(files ? {files: [{file: 'article.pdf'}]} : {})});
            if (isOMP) {
                const send = ['sendInternalReview'];
                await seed('R', {decisions: send, reviewRounds: [ir([['ri1', 'invited']], true)], participants: P(['ed', 'se', ['se2'], 'fc'])});
                await seed('CA', {decisions: send, reviewRounds: [ir([['ri1', 'accepted']])], participants: P(['ed'])});
                await seed('CD', {decisions: send, reviewRounds: [ir([['ri1', 'declined']])], participants: P(['ed'])});
                await seed('CC', {decisions: send, reviewRounds: [ir([['ri1', 'completed']])], participants: P(['ed'])});
                await seed('P', {decisions: ['sendInternalReview', 'newInternalReviewRound'], reviewRounds: [ir([['ri1', 'completed']])], participants: P(['ed', 'se'])});
                await seed('X1', {decisions: send, reviewRounds: [ir([['ri1', 'invited']])], participants: P(['ed'])});
                await seed('X2', {decisions: ['sendInternalReview', 'newInternalReviewRound'], reviewRounds: [ir([['ri1', 'completed']])], participants: P(['ed'])});
                await seed('DC', {decisions: send, reviewRounds: [ir([['ri1', 'invited']])], participants: P(['ed', 'se'])});
                await seed('RR', {decisions: send, reviewRounds: [ir([['ri1', 'completed']], true)], participants: P(['ed'])});
                await seed('RN', {decisions: send, reviewRounds: [ir([['ri1', 'completed']], true)], participants: P(['ed'])});
                await seed('FS', {decisions: send, reviewRounds: [ir([], true)], participants: P(['ed'])});
                await seed('NR', {decisions: send, reviewRounds: [ir([], true)], participants: P(['ed'])});
                await seed('T', {decisions: send, reviewRounds: [ir([['ri1', 'invited']])], participants: P(['ed', ['se2']])});
                const er = {stage: 'external', files: [{file: 'article.pdf'}], reviewers: [{username: `${t}rv1`, status: 'completed'}]};
                await seed('EA', {decisions: ['skipInternalReview'], reviewRounds: [er], participants: P(['ed', ['se2']])});
                await seed('EN', {decisions: ['skipInternalReview'], reviewRounds: [er], participants: P(['ed'])});
            } else if (isOJS) {
                const xr = (st) => ({reviewers: [{username: `${t}rv1`, status: st}]});
                await seed('OI', {decisions: ['sendExternalReview'], reviewRounds: [xr('invited')], participants: P(['ed', ['se2']])});
                await seed('OA', {decisions: ['sendExternalReview'], reviewRounds: [xr('accepted')], participants: P(['ed'])});
                await seed('OP', {decisions: ['sendExternalReview', 'newExternalReviewRound'], reviewRounds: [xr('completed')], participants: P(['ed'])});
            } else {
                await seed('Q', {participants: [{username: `${t}se`, role: 'sectionEditor'}]});
            }
        });
        if (!sc.t) throw new Error('no scratch context');

        // ================================================================ OPS: read-only control
        if (isOPS) {
            if (on('ops')) await sect('ops', async () => {
                for (const who of ['mgr', 'se']) {
                    await as(who);
                    await openWorkflow(wf(sc.Q.id), `ops-${who}-q`);
                }
            });
            return;
        }
        // ================================================================ OJS: read-only controls
        if (isOJS) {
            if (on('ojs')) await sect('ojs', async () => {
                await as('ed');
                await openWorkflow(wf(sc.OI.id, rkey(sc.OI)), 'ojs-ed-oi-round1-invited');
                await openWorkflow(wf(sc.OA.id, rkey(sc.OA)), 'ojs-ed-oa-round1-accepted');
                await openWorkflow(wf(sc.OP.id, rkey(sc.OP, 0)), 'ojs-ed-op-round1-past');
                await openWorkflow(wf(sc.OP.id, rkey(sc.OP, 1)), 'ojs-ed-op-round2-current');
                await openWorkflow(wf(sc.OP.id, 'workflow_3'), 'ojs-ed-op-stage-entry');
                await openWorkflow(wf(sc.OI.id, rkey(sc.OI)), 'ojs-ed-oi-round1-again');
                const p = await press('Request Revisions', 'ojs-ed-oi-request-revisions', {stopAtWindow: true});
                record('ojs-ed-oi-request-revisions-press', p);
                await closeTop(page);
                await as('se2');
                await openWorkflow(wf(sc.OI.id, rkey(sc.OI)), 'ojs-se2-oi-round1-recommendonly');
            });
            // the page error seen once on the Review entry (typed address after a round page): re-drive with a console listener
            if (on('ojsentry')) await sect('ojsentry', async () => {
                const errs = [];
                page.on('console', (m) => { if (m.type() === 'error') errs.push({at: new Date().toISOString(), url: page.url(), text: m.text().slice(0, 300)}); });
                page.on('pageerror', (e) => errs.push({at: new Date().toISOString(), url: page.url(), pageerror: String(e.message).slice(0, 300)}));
                await as('ed');
                const seq = [['round2', rkey(sc.OP, 1)], ['entry', 'workflow_3'], ['round1', rkey(sc.OP, 0)], ['entry2', 'workflow_3'], ['oi-round', rkey(sc.OI)], ['oi-entry', 'workflow_3']];
                const out = [];
                for (const [n, key] of seq) {
                    const before = errs.length;
                    const id = n.startsWith('oi') ? sc.OI.id : sc.OP.id;
                    await openWorkflow(wf(id, key), `ojsentry-ed-${n}`);
                    out.push({step: n, key, errors: errs.slice(before)});
                }
                // the same entry reached by pressing the side menu's "Review" from a round page
                await openWorkflow(wf(sc.OP.id, rkey(sc.OP, 1)), 'ojsentry-ed-round2-for-click');
                const before = errs.length;
                const entry = page.locator('[role="dialog"]:visible').first().locator('nav').getByRole('link', {name: /^Review$/}).or(page.locator('[role="dialog"]:visible').first().locator('nav').getByRole('button', {name: /^Review$/})).first();
                await loc(page, 'OJS side menu "Review" entry', entry);
                if (await entry.count()) { await entry.click(); await idle(page); await page.waitForTimeout(800); await snap(page, 'ojsentry-ed-entry-by-click', {info: await wfInfo(page)}); }
                out.push({step: 'entry-by-click', errors: errs.slice(before)});
                record('ojsentry-summary', out);
                log('[ojsentry]', JSON.stringify(out).slice(0, 1500));
            });
            // the recommending editor's "Recommend Revisions" on an external round: the window before the wizard
            if (on('extra')) await sect('ojs-extra', async () => {
                await as('se2');
                await openWorkflow(wf(sc.OI.id, rkey(sc.OI)), 'extra-ojs-se2-oi-before');
                const p = await press('Recommend Revisions', 'extra-ojs-se2-recommend-revisions', {stopAtWindow: true});
                record('extra-ojs-se2-recommend-revisions-press', p);
                if (isWizard(page)) await cancelWizard('extra-ojs-se2-recommend-revisions'); else await closeTop(page);
            });
            return;
        }

        // ================================================================ OMP
        // ---- roster: Rule 8 per level on R; each button's wizard; Rule 11 (Request Revisions at once); the unsaved exit
        if (on('roster')) await sect('roster', async () => {
            const R = sc.R;
            const out = {};
            await asAdmin();
            out.admin = await openWorkflow(wf(R.id, rkey(R)), 'roster-admin-r1');
            for (const who of ['mgr', 'ed', 'se', 'se2', 'fc']) {
                await as(who);
                out[who] = await openWorkflow(wf(R.id, rkey(R)), `roster-${who}-r1`);
            }
            record('roster-summary', Object.fromEntries(Object.entries(out).map(([k, v]) => [k, {actions: v.actionButtons, actionText: v.actionText, rec: v.recommendation}])));
            // each decision button as ed: its first page, then Cancel
            await as('ed');
            const opened = {};
            for (const name of ['Request Revisions', 'Send to External Review', 'Accept Submission', 'Create New Review Round', 'Cancel Review Round', 'Decline Submission']) {
                await openWorkflow(wf(R.id, rkey(R)), `roster-ed-before-${name.replace(/\W+/g, '-').toLowerCase()}`);
                const p = await press(name, `roster-ed-${name.replace(/\W+/g, '-').toLowerCase()}`);
                const w = p.onWizard ? await readWizard(`roster-ed-${name.replace(/\W+/g, '-').toLowerCase()}-wizard`) : null;
                opened[name] = {windows: p.windows, onWizard: p.onWizard, url: p.url && p.url.replace(/^https?:\/\/[^/]+/, ''), h1: w && w.h1, rail: w && (w.rail || []).map((r) => r.text)};
                if (p.onWizard) await cancelWizard(`roster-ed-${name.replace(/\W+/g, '-').toLowerCase()}`);
            }
            record('roster-ed-buttons-open', opened);
            log('[roster buttons]', JSON.stringify(opened).slice(0, 1500));
            // the unsaved exit: type into Request Revisions' letter, then leave by the wizard's Cancel, and once by a typed address
            await openWorkflow(wf(R.id, rkey(R)), 'roster-ed-before-unsaved');
            const p = await press('Request Revisions', 'roster-ed-unsaved');
            if (p.onWizard) {
                const edId = await page.evaluate(() => { const l = window.tinymce ? (window.tinymce.get() || []) : []; const e = l.find((x) => { try { return x.getContainer().getClientRects().length; } catch (_) { return false; } }) || l[0]; return e ? e.id : null; });
                if (edId) { await page.evaluate((i) => { const e = window.tinymce.get(i); e.focus(); e.selection.select(e.getBody(), true); e.selection.collapse(true); }, edId); await page.keyboard.type('K3 unsaved words ', {delay: 10}); }
                const cancel = page.getByRole('button', {name: 'Cancel', exact: true}).first();
                await cancel.click(); await page.waitForTimeout(700); await idle(page);
                const ds = await dialogTexts(page);
                await snap(page, 'roster-ed-unsaved-cancel-dialog', {dialogs: ds.map((d) => ({name: d.name, text: flat(d.text, 400), buttons: d.buttons.map((b) => b.t)}))});
                // keep editing: press the dialog's other button
                const keep = topWin(page).getByRole('button', {name: /^(Continue|No|Keep|Close)/}).first();
                const keepName = await keep.innerText().catch(() => null);
                if (await keep.count()) { await keep.click(); await page.waitForTimeout(500); }
                const nBefore = dialogsSeen.length;
                await page.goto(wf(R.id, rkey(R))); await idle(page);
                record('roster-ed-unsaved-leave-by-address', {keepButton: keepName, browserDialogs: dialogsSeen.slice(nBefore), landed: page.url()});
                await snap(page, 'roster-ed-unsaved-leave-by-address-landed');
            }
        });

        // ---- Rule 9 axis: invited (R), accepted, declined, completed
        if (on('cancelaxis')) await sect('cancelaxis', async () => {
            await as('ed');
            const out = {};
            for (const k of ['R', 'CA', 'CD', 'CC']) {
                const info = await openWorkflow(wf(sc[k].id, rkey(sc[k])), `cancelaxis-ed-${k.toLowerCase()}`);
                out[k] = {actions: (info.actionButtons || []).map((b) => b.text), reviewers: (info.tables || []).find((t) => /Reviewers/.test(t.name || ''))};
            }
            record('cancelaxis-summary', out);
        });

        // ---- Rule 8: past round, current round, stage entry (P), as ed and se
        if (on('past')) await sect('past', async () => {
            for (const who of ['ed', 'se']) {
                await as(who);
                await openWorkflow(wf(sc.P.id, rkey(sc.P, 0)), `past-${who}-p-round1`);
                await openWorkflow(wf(sc.P.id, rkey(sc.P, 1)), `past-${who}-p-round2`);
                await openWorkflow(wf(sc.P.id, 'workflow_2'), `past-${who}-p-stage-entry`);
            }
        });

        // ---- td-resubmit (T): se2 types decision 25; ed types decision 21 (and 25 as a control of the address)
        if (on('resubmit')) await sect('resubmit', async () => {
            const T = sc.T; const rid = T.rounds[0].id;
            const typed = async (who, n, label) => {
                await as(who);
                const url = ctxUrl(`/decision/record/${T.id}?decision=${n}&reviewRoundId=${rid}`);
                const resp = await page.goto(url); await waitWizard(page);
                const w = await readWizard(label, {httpStatus: resp && resp.status()});
                return {status: resp && resp.status(), h1: w.h1, text: flat(w.text, 600)};
            };
            const out = {};
            await as('se2');
            out.se2Round = await openWorkflow(wf(T.id, rkey(T)), 'resubmit-se2-round-before');
            out.se2Typed25 = await typed('se2', 25, 'resubmit-se2-typed-25');
            if (/Recommend/i.test(out.se2Typed25.h1 || '')) {
                out.se2Record25 = await walkAndRecord('resubmit-se2-typed-25');
                out.se2After = await readTwice(wf(T.id, rkey(T)), 'resubmit-se2-round');
                await as('ed');
                out.edAfter = await readTwice(wf(T.id, rkey(T)), 'resubmit-ed-round');
                out.state = await (async () => { await asAdmin(); return subState(T.id); })();
            }
            out.edTyped21 = await typed('ed', 21, 'resubmit-ed-typed-21');
            out.edTyped20 = await typed('ed', 20, 'resubmit-ed-typed-20-control');
            if (/decision\/record/.test(page.url())) await cancelWizard('resubmit-ed-typed-20-control');
            record('resubmit-summary', out);
            log('[resubmit]', JSON.stringify(out).slice(0, 1500));
        });

        // ---- Rule 12 Decline, Rule 10 per level, Revert Decline (DC)
        if (on('decline')) await sect('decline', async () => {
            const D = sc.DC; const out = {};
            await as('ed');
            await openWorkflow(wf(D.id, rkey(D)), 'decline-ed-before');
            const p = await press('Decline Submission', 'decline-ed');
            if (!p.onWizard) throw new Error('Decline did not open the wizard');
            out.decline = await walkAndRecord('decline-ed');
            out.edAfter = await readTwice(wf(D.id, rkey(D)), 'decline-ed-round');
            for (const who of ['mgr', 'se']) { await as(who); out[`${who}Declined`] = await openWorkflow(wf(D.id, rkey(D)), `decline-${who}-declined`); }
            await asAdmin(); out.adminDeclined = await openWorkflow(wf(D.id, rkey(D)), 'decline-admin-declined');
            out.stateDeclined = await subState(D.id);
            // what "Delete" offers (open its dialog and leave with Cancel)
            const del = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Delete', exact: true}).first();
            if (await del.count()) {
                await loc(page, 'declined internal round: "Delete" (admin)', del);
                await del.click(); await page.waitForTimeout(700); await idle(page);
                const ds = await dialogTexts(page);
                out.deleteDialog = ds.slice(-1).map((d) => ({name: d.name, text: flat(d.text, 400), buttons: d.buttons.map((b) => b.t)}));
                await snap(page, 'decline-admin-delete-dialog', {deleteDialog: out.deleteDialog});
                const c = topWin(page).getByRole('button', {name: /^(Cancel|No)$/}).first();
                if (await c.count()) { await c.click(); await page.waitForTimeout(600); }
            }
            // Revert Decline as ed
            await as('ed');
            await openWorkflow(wf(D.id, rkey(D)), 'decline-ed-before-revert');
            const r = await press('Revert Decline', 'revert-ed');
            if (r.onWizard) { out.revert = await walkAndRecord('revert-ed'); out.edReverted = await readTwice(wf(D.id, rkey(D)), 'revert-ed-round'); }
            else out.revertPress = r;
            await asAdmin(); out.stateReverted = await subState(D.id);
            record('decline-summary', out);
        });

        // ---- Rule 12 Cancel Review Round: from Round 1 (X1) and from Round 2 (X2)
        if (on('cancel')) await sect('cancel', async () => {
            const out = {};
            // the reviewer's list before
            await as('ri1');
            await page.goto(ctxUrl('/dashboard/reviewAssignments')); await idle(page); await page.waitForTimeout(800); await idle(page);
            out.ri1Before = flat((await screen(page)).text && (await screen(page)).text.main, 1500);
            await snap(page, 'cancel-ri1-list-before');
            await as('ed');
            await openWorkflow(wf(sc.X1.id, rkey(sc.X1)), 'cancel-ed-x1-before');
            const p1 = await press('Cancel Review Round', 'cancel-ed-x1');
            if (p1.onWizard) { out.x1 = await walkAndRecord('cancel-ed-x1'); }
            else out.x1Press = p1;
            out.x1After = await readTwice(wf(sc.X1.id), 'cancel-ed-x1-landing');
            out.x1Round = await openWorkflow(wf(sc.X1.id, rkey(sc.X1)), 'cancel-ed-x1-old-round-address');
            out.x1Submission = await openWorkflow(wf(sc.X1.id, 'workflow_1'), 'cancel-ed-x1-submission-entry');
            out.x1Entry = await openWorkflow(wf(sc.X1.id, 'workflow_2'), 'cancel-ed-x1-internal-entry');
            await openWorkflow(wf(sc.X2.id, rkey(sc.X2, 1)), 'cancel-ed-x2-round2-before');
            const p2 = await press('Cancel Review Round', 'cancel-ed-x2');
            if (p2.onWizard) { out.x2 = await walkAndRecord('cancel-ed-x2'); }
            else out.x2Press = p2;
            out.x2After = await readTwice(wf(sc.X2.id), 'cancel-ed-x2-landing');
            out.x2Round1 = await openWorkflow(wf(sc.X2.id, rkey(sc.X2, 0)), 'cancel-ed-x2-round1');
            await asAdmin(); out.x1State = await subState(sc.X1.id); out.x2State = await subState(sc.X2.id);
            await as('ri1');
            await page.goto(ctxUrl('/dashboard/reviewAssignments')); await idle(page); await page.waitForTimeout(800); await idle(page);
            const s = await snap(page, 'cancel-ri1-list-after');
            out.ri1After = flat(s.text && s.text.main, 1500);
            record('cancel-summary', out);
        });

        // ---- RR: Request Revisions (at once), status, author upload, status; Accept (td-carry 1)
        if (on('rr')) await sect('rr', async () => {
            const S = sc.RR; const out = {};
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'rr-ed-before');
            const p = await press('Request Revisions', 'rr-ed-request');
            out.requestWindows = p.windows;
            if (!p.onWizard) throw new Error('Request Revisions did not open the wizard');
            out.request = await walkAndRecord('rr-ed-request');
            out.afterRequest = await readTwice(wf(S.id, rkey(S)), 'rr-ed-requested');
            out.uploaded = await authorUploadRevision(S, 0, 'k3-rr-revision.pdf', 'rr');
            await as('ed');
            out.afterUpload = await readTwice(wf(S.id, rkey(S)), 'rr-ed-revised');
            const a = await press('Accept Submission', 'rr-ed-accept');
            if (!a.onWizard) throw new Error('Accept did not open the wizard');
            out.accept = await walkAndRecord('rr-ed-accept');
            out.afterAccept = await readTwice(wf(S.id), 'rr-ed-accepted-landing');
            out.copyediting = await openWorkflow(wf(S.id, 'workflow_4'), 'rr-ed-copyediting');
            out.draftFiles = await tableRows('Draft Files');
            out.internalRound = await openWorkflow(wf(S.id, rkey(S)), 'rr-ed-internal-round-after-accept');
            out.externalEntry = await openWorkflow(wf(S.id, 'workflow_3'), 'rr-ed-external-entry-after-accept');
            out.internalEntry = await openWorkflow(wf(S.id, 'workflow_2'), 'rr-ed-internal-entry-after-accept');
            await asAdmin(); out.state = await subState(S.id);
            record('rr-summary', {requestWindows: out.requestWindows, requestPages: out.request.pages.map((x) => x.h1 + ' / ' + x.rail.join(',')), statusRequested: out.afterRequest.after.statusBox, statusRequestedReload: out.afterRequest.reload.statusBox, uploaded: out.uploaded, statusRevised: out.afterUpload.after.statusBox, statusRevisedReload: out.afterUpload.reload.statusBox, acceptPages: out.accept.pages, draftFiles: out.draftFiles, internalRoundStatus: out.internalRound.statusBox, internalRoundActions: out.internalRound.actionButtons, externalEntry: out.externalEntry.statusBox || flat(out.externalEntry.primaryText, 300), state: out.state});
        });

        // ---- RN: Request Revisions, upload, Create New Review Round (td-carry 2); R2 revision; Send to External Review (td-files 2)
        if (on('rn')) await sect('rn', async () => {
            const S = sc.RN; const out = {};
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'rn-ed-before');
            let p = await press('Request Revisions', 'rn-ed-request');
            if (!p.onWizard) throw new Error('Request Revisions did not open the wizard');
            await walkAndRecord('rn-ed-request');
            out.uploaded1 = await authorUploadRevision(S, 0, 'k3-rn-round1-revision.pdf', 'rn1');
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'rn-ed-revised');
            p = await press('Create New Review Round', 'rn-ed-newround');
            if (!p.onWizard) throw new Error('Create New Review Round did not open the wizard');
            out.newRound = await walkAndRecord('rn-ed-newround');
            await asAdmin(); out.state1 = await subState(S.id);
            S.rounds = out.state1.reviewRounds.map((r) => ({id: r.id, stageId: r.stageId})); save();
            await as('ed');
            out.round2 = await readTwice(wf(S.id, rkey(S, 1)), 'rn-ed-round2');
            out.round2Files = await tableRows('Files for Review');
            out.round1 = await openWorkflow(wf(S.id, rkey(S, 0)), 'rn-ed-round1-past');
            // round 2: Request Revisions, author upload, then Send to External Review
            await openWorkflow(wf(S.id, rkey(S, 1)), 'rn-ed-round2-before-request');
            p = await press('Request Revisions', 'rn-ed-request2');
            if (p.onWizard) await walkAndRecord('rn-ed-request2');
            out.uploaded2 = await authorUploadRevision(S, 1, 'k3-rn-round2-revision.pdf', 'rn2');
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S, 1)), 'rn-ed-round2-revised');
            p = await press('Send to External Review', 'rn-ed-sendext');
            if (!p.onWizard) throw new Error('Send to External Review did not open the wizard');
            out.sendExt = await walkAndRecord('rn-ed-sendext');
            await asAdmin(); out.state2 = await subState(S.id);
            S.rounds = out.state2.reviewRounds.map((r) => ({id: r.id, stageId: r.stageId})); save();
            await as('ed');
            const ext = S.rounds.findIndex((r) => r.stageId === 3);
            out.ext = await openWorkflow(wf(S.id, rkey(S, ext)), 'rn-ed-external-round1');
            out.extFiles = await tableRows('Files for Review');
            out.extRevisions = await tableRows('Revisions Uploaded');
            record('rn-summary', {newRoundPages: out.newRound.pages, round2Status: out.round2.after.statusBox, round2Reviewers: (out.round2.after.tables || []).find((t) => /Reviewers/.test(t.name || '')), round2Files: out.round2Files, round1Status: out.round1.statusBox, round1Actions: out.round1.actionButtons, sendExtPages: out.sendExt.pages, extFiles: out.extFiles, extRevisions: out.extRevisions, state1: out.state1, state2: out.state2});
        });

        // ---- FS: an editor's revision, Send to External Review (td-files 1)
        if (on('fs')) await sect('fs', async () => {
            const S = sc.FS; const out = {};
            await as('ed');
            out.uploaded = await editorUploadRevision(S, 0, 'k3-fs-editor-revision.pdf', 'fs');
            out.before = await openWorkflow(wf(S.id, rkey(S)), 'fs-ed-before');
            out.beforeFiles = await tableRows('Files for Review'); out.beforeRevisions = await tableRows('Revisions Uploaded');
            const p = await press('Send to External Review', 'fs-ed-sendext');
            if (!p.onWizard) throw new Error('Send to External Review did not open the wizard');
            out.sendExt = await walkAndRecord('fs-ed-sendext');
            out.landing = await readTwice(wf(S.id), 'fs-ed-landing');
            await asAdmin(); out.state = await subState(S.id);
            S.rounds = out.state.reviewRounds.map((r) => ({id: r.id, stageId: r.stageId})); save();
            await as('ed');
            const ext = S.rounds.findIndex((r) => r.stageId === 3);
            out.ext = await readTwice(wf(S.id, rkey(S, ext)), 'fs-ed-external-round1');
            out.extFiles = await tableRows('Files for Review'); out.extRevisions = await tableRows('Revisions Uploaded');
            out.window = await reviewFilesWindow('fs-ed-external-files-window');
            out.internal = await openWorkflow(wf(S.id, rkey(S, 0)), 'fs-ed-internal-round-after');
            record('fs-summary', {beforeFiles: out.beforeFiles, beforeRevisions: out.beforeRevisions, sendExtPages: out.sendExt.pages, extStatus: out.ext.after.statusBox, extFiles: out.extFiles, extRevisions: out.extRevisions, window: out.window, internalStatus: out.internal.statusBox, internalActions: out.internal.actionButtons, state: out.state});
        });

        // ---- NR: Send to External Review with no revision (OMP4)
        if (on('nr')) await sect('nr', async () => {
            const S = sc.NR; const out = {};
            await as('ed');
            await openWorkflow(wf(S.id, rkey(S)), 'nr-ed-before');
            out.beforeFiles = await tableRows('Files for Review');
            const p = await press('Send to External Review', 'nr-ed-sendext');
            if (!p.onWizard) throw new Error('Send to External Review did not open the wizard');
            out.sendExt = await walkAndRecord('nr-ed-sendext');
            await asAdmin(); out.state = await subState(S.id);
            S.rounds = out.state.reviewRounds.map((r) => ({id: r.id, stageId: r.stageId})); save();
            await as('ed');
            const ext = S.rounds.findIndex((r) => r.stageId === 3);
            out.ext = await readTwice(wf(S.id, rkey(S, ext)), 'nr-ed-external-round1');
            out.extFiles = await tableRows('Files for Review');
            out.internal = await openWorkflow(wf(S.id, rkey(S, 0)), 'nr-ed-internal-round-after');
            record('nr-summary', {beforeFiles: out.beforeFiles, sendExtPages: out.sendExt.pages, extStatus: out.ext.after.statusBox, extFiles: out.extFiles, internalStatus: out.internal.statusBox, internalActions: out.internal.actionButtons, state: out.state});
        });

        // ---- EA / EN: the External Review controls for OMP2's first sentence and OMP6's
        if (on('ext')) await sect('ext', async () => {
            const out = {};
            await as('se2');
            out.se2Ext = await openWorkflow(wf(sc.EA.id, rkey(sc.EA)), 'ext-se2-ea-round1-recommendonly');
            for (const [k, decision] of [['EA', 'Accept Submission'], ['EN', 'Create New Review Round']]) {
                const S = sc[k]; const o = {};
                await as('ed');
                await openWorkflow(wf(S.id, rkey(S)), `ext-ed-${k.toLowerCase()}-before`);
                const p = await press('Request Revisions', `ext-ed-${k.toLowerCase()}-request`, {choice: 0});
                o.requestWindows = p.windows;
                if (p.onWizard) await walkAndRecord(`ext-ed-${k.toLowerCase()}-request`);
                o.uploaded = await authorUploadRevision(S, 0, `k3-${k.toLowerCase()}-ext-revision.pdf`, `ext-${k.toLowerCase()}`);
                await as('ed');
                await openWorkflow(wf(S.id, rkey(S)), `ext-ed-${k.toLowerCase()}-revised`);
                const d = await press(decision, `ext-ed-${k.toLowerCase()}-decide`);
                if (!d.onWizard) { o.decidePress = d; out[k] = o; continue; }
                o.decide = await walkAndRecord(`ext-ed-${k.toLowerCase()}-decide`);
                await asAdmin(); o.state = await subState(S.id);
                S.rounds = o.state.reviewRounds.map((r) => ({id: r.id, stageId: r.stageId})); save();
                await as('ed');
                if (k === 'EA') { await openWorkflow(wf(S.id, 'workflow_4'), 'ext-ed-ea-copyediting'); o.draftFiles = await tableRows('Draft Files'); }
                else { await openWorkflow(wf(S.id, rkey(S, 1)), 'ext-ed-en-round2'); o.round2Files = await tableRows('Files for Review'); }
                out[k] = {requestWindows: o.requestWindows, uploaded: o.uploaded, decidePages: o.decide.pages, draftFiles: o.draftFiles, round2Files: o.round2Files, state: o.state};
            }
            record('ext-summary', out);
        });

        // ---- extra: "Recommend Revisions" on an internal round (R) and on an external round (EX, seeded here);
        //      the Copyediting "Draft Files" window of RR (can the internal revision be picked by hand?)
        if (on('extra')) await sect('extra', async () => {
            const out = {};
            if (!sc.EX) {
                const s = await app.api.createSubmission({tag: `${sc.t}ex`, context: sc.t, submitter: u('au'), title: `K3 EX ${sc.t}`, decisions: ['skipInternalReview'], reviewRounds: [{stage: 'external', reviewers: [{username: u('rv1'), status: 'invited'}]}], participants: [{username: u('ed'), role: 'editor'}, {username: u('se2'), role: 'sectionEditor', recommendOnly: true}]});
                sc.EX = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save();
            }
            await as('se2');
            for (const [k, label] of [['R', 'internal'], ['EX', 'external']]) {
                await openWorkflow(wf(sc[k].id, rkey(sc[k])), `extra-se2-${label}-before`);
                const p = await press('Recommend Revisions', `extra-se2-${label}-recommend-revisions`, {stopAtWindow: true});
                out[label] = {windows: p.windows, onWizard: isWizard(page), url: page.url().replace(/^https?:\/\/[^/]+/, '')};
                if (isWizard(page)) { await waitWizard(page); const w = await readWizard(`extra-se2-${label}-recommend-revisions-wizard`); out[label].h1 = w.h1; out[label].rail = (w.rail || []).map((r) => r.text); await cancelWizard(`extra-se2-${label}-recommend-revisions`); }
                else if (p.windows.length) await closeTop(page);
            }
            await as('ed');
            await openWorkflow(wf(sc.RR.id, 'workflow_4'), 'extra-ed-rr-copyediting');
            const container = page.locator('[role="dialog"]:visible').first().locator('div').filter({has: page.getByRole('table', {name: 'Draft Files', exact: true})}).last();
            const btn = container.getByRole('button', {name: 'Upload/Select Files', exact: true});
            out.draftSelect = await btn.count();
            if (out.draftSelect) {
                await btn.click();
                const w = page.getByRole('dialog').filter({has: page.locator('input[name="allStages"]')}).last();
                await w.waitFor({timeout: 30000}).catch(() => {}); await idle(page); await page.waitForTimeout(500);
                const read = () => w.evaluate((d) => ({title: (d.querySelector('h1, h2') || {}).innerText || null, text: d.innerText.replace(/\s+/g, ' ').slice(0, 1500)}));
                out.draftBefore = await read();
                await snap(page, 'extra-ed-rr-draft-window-before', {win: out.draftBefore});
                await w.locator('input[name="allStages"]').check({force: true}).catch(() => {});
                await page.waitForTimeout(800); await idle(page); await page.waitForTimeout(800);
                out.draftAll = await read();
                await snap(page, 'extra-ed-rr-draft-window-allstages', {win: out.draftAll});
                const c = w.getByRole('link', {name: 'Cancel', exact: true}).or(w.getByRole('button', {name: 'Cancel', exact: true})).first();
                await c.click().catch(() => {}); await idle(page);
            }
            record('extra-summary', out);
            log('[extra]', JSON.stringify(out).slice(0, 2500));
        });

        // ---- lean check of OMP4: the Submission stage's "Send to External Review" / "Send to Internal Review" "Select Files" (SS, seeded here)
        if (on('extra2')) await sect('extra2', async () => {
            if (!sc.SS) {
                const s = await app.api.createSubmission({tag: `${sc.t}ss`, context: sc.t, submitter: u('au'), title: `K3 SS ${sc.t}`, files: [{file: 'article.pdf'}], participants: [{username: u('ed'), role: 'editor'}]});
                sc.SS = {id: s.submissionId, stageId: s.stageId}; save();
            }
            const out = {};
            await as('ed');
            for (const name of ['Send to External Review', 'Send to Internal Review']) {
                const lb = `extra2-ed-ss-${name.replace(/\W+/g, '-').toLowerCase()}`;
                await openWorkflow(wf(sc.SS.id, 'workflow_1'), `${lb}-before`);
                const p = await press(name, lb);
                if (!p.onWizard) { out[name] = {press: p}; continue; }
                const pages = await walk(lb);
                out[name] = pages.map((x) => ({h1: x.h1, panels: x.panels}));
                await cancelWizard(lb);
            }
            record('extra2-summary', out);
            log('[extra2]', JSON.stringify(out).slice(0, 1500));
        });
    } finally {
        record('browser-dialogs', dialogsSeen);
        await close();
    }
});
