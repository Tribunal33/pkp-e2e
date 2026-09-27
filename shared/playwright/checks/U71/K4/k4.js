// U71 claim check, chunk K4: recommendations on an internal round and the settings that bend the stage.
// Spec: docs/specs/U71-internal-review-stage.md lines 201–216 (Rule 14) and 298–344 (Settings that modify
// behavior); footnotes f, st1, st2, r5, st3, st4, b.
//
// OMP, one scratch press per setting so a change never leaks into another drive (tag u71k4…):
//   A  (main)  mgr, ed, ed2 (Press editors), se, se2 (Series editors, deciding), sr1, sr2 (Series editors,
//              recommend-only on their assignments), fc, au, ri1..ri2 (Internal Reviewers), rv1 (External)
//      RA  internal R1, ri1 invited; se, sr1(ro)            → Rule 14 buttons per level, each button's first page
//      RN  internal R1, ri1 invited; sr1(ro) alone          → no deciding editor: the box's sentence
//      RP  internal R1, ri1 invited; se, ed2(ro)            → a manager-level recommending editor
//      RQ  internal R1, ri1 invited; ed2(ro) alone          → the sentence at manager level
//      RW  internal R1, ri1 declined; se, sr1(ro), sr2(ro)  → the status walk, both boxes, "Change decision"
//      RV  internal R1, ri1 invited; se, sr1(ro)            → "Recommend Revisions" recorded: nothing moves
//      RD  internal R1, ri1 invited; se, sr1(ro)            → "Recommend Decline" recorded: nothing moves
//      EX  external R1, rv1 invited; se, sr1(ro)            → External Review control
//      AP  internal R1, ri1 invited; se, ed (no flags)      → "Assignment privileges": default, ticked, per level
//      AU  internal R1, ri1 completed (anonymous default)   → author view without "Reviewers"
//      GA  internal R1, ri1 accepted                        → reviewer wizard without guidelines (default)
//   M  (minimum) mgr, se, au, ri1, ri2, rv1; "Minimum Confirmed Reviews Required" set to 2 on screen
//      G1 internal R1, ri1 invited; se   → status line, the dialog per button
//      G2 internal R1, ri1+ri2 completed, confirmed on screen; se → the minimum met; then Send to External
//      GE external R1, rv1 invited; se   → External Review control
//   R  (review mode) mgr, se, au, ri1, ri2; M0 seeded before "Open", M1/M2 after
//   S  (suggestions) mgr, ed, se, fc, au, ri1, rv1; setting switched on on screen, then S1 (internal) and S2
//      (external) seeded with suggestions
//   G  (guidelines) mgr, se, au, ri1, ri2, rv1; GB/GC seeded, guidelines filled on screen in between reads
//   T  (templates) mgr, se, au, ri1; two templates added on screen; T1 sent on screen; T2 seeded after, two rounds
//   L  (roles) mgr, se, fc, ce, au; L1 internal R1 with fc assigned; Roles "Edit" boxes changed on screen
// OJS (read-only controls): one scratch journal (settings, Roles, recommend buttons, suggestions panel,
// Edit Assignment, templates). OPS (read-only controls): one scratch server.
//
//   PROBE_FEATURE=U71 PROBE_AGENT=ccK4 node bin/probe.js all shared/playwright/checks/U71/K4/k4.js
//   PHASES=seed,settings,rec,walk,moves,priv,min,mode,mode0,sugg,guide,tmpl,roles,verify,ojs,ojs2,ops,ops2 (default all; later
//   phases reuse k4-state-<app>.json in the output folder)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'settings', 'rec', 'walk', 'moves', 'priv', 'min', 'mode', 'mode0', 'sugg', 'guide', 'tmpl', 'roles', 'verify', 'ojs', 'ojs2', 'ops', 'ops2'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const stateFile = (app) => path.join(outDir(), `k4-state-${app.name}.json`);
const slug = (s) => s.replace(/\W+/g, '-').toLowerCase().replace(/^-|-$/g, '');

async function sect(name, fn) {
    try { await fn(); } catch (e) { log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); record(`${name.replace(/[^a-z0-9]+/gi, '-')}-FAILED`, {error: String(e.stack || e).slice(0, 1500)}); }
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
        inputs: [...d.querySelectorAll('input, textarea, select')].map((i) => ({type: i.type, name: i.name || i.id || null, value: String(i.value).slice(0, 200), checked: i.type === 'checkbox' || i.type === 'radio' ? i.checked : undefined, visible: i.getClientRects().length > 0, label: (i.id && document.querySelector(`label[for="${i.id}"]`)?.innerText || i.closest('label')?.innerText || i.getAttribute('aria-label') || '').trim().slice(0, 200)})).slice(0, 60),
    }))).catch(() => []);
// The workflow dialog as data (K3's reader, plus the right-hand column's boxes).
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
    const actionButtons = actionRegion ? [...actionRegion.querySelectorAll('button, a')].filter(vis).map((b) => ({text: b.innerText.trim().replace(/\s+/g, ' '), cls: b.className.slice(0, 200), primary: /\bbg-primary\b|isPrimary/.test(b.className), warn: /negative|warn|isWarnable/i.test(b.className)})) : null;
    const actionText = txt(actionRegion);
    const secondary = region('workflow-secondary-items');
    const primary = region('workflow-primary-items');
    const nav = root.querySelector('nav, [data-cy="workflow-menu"], [role="navigation"]');
    const menu = nav ? [...nav.querySelectorAll('a, button, li > span')].filter(vis).map((a) => ({text: txt(a), current: a.getAttribute('aria-current') || null})).filter((a) => a.text).slice(0, 40) : null;
    const statusH = hs.find((x) => /Status$/i.test(x.innerText.trim()));
    const statusBox = statusH ? {heading: statusH.innerText.trim(), text: txt(statusH.parentElement).slice(0, 600)} : null;
    const lines = (dlgs[0] ? dlgs[0].innerText : '').split('\n').map((l) => l.trim()).filter(Boolean);
    const closeAt = lines.indexOf('Close');
    const header = dlgs[0] ? lines.slice(closeAt >= 0 ? closeAt + 1 : 0, (closeAt >= 0 ? closeAt + 1 : 0) + 8).join(' | ') : null;
    const bubble = (() => { const dot = root.querySelector('span[class*="bg-stage-"]'); return dot && dot.parentElement ? txt(dot.parentElement) : null; })();
    const h2 = (() => { const h = root.querySelector('h2'); return h ? h.textContent.trim().replace(/\s+/g, ' ') : null; })();
    const boxOf = (re) => { const h = [...root.querySelectorAll('h2,h3,h4')].find((x) => re.test(x.textContent.trim())); if (!h) return null; let c = h.parentElement; for (let i = 0; i < 3 && c && txt(c).length < txt(h).length + 3; i++) c = c.parentElement; return {where: secondary && secondary.contains(h) ? 'secondary' : actionRegion && actionRegion.contains(h) ? 'action' : primary && primary.contains(h) ? 'primary' : 'other', text: txt(c).slice(0, 600), buttons: c ? [...c.querySelectorAll('button')].filter(vis).map((b) => b.innerText.trim()) : []}; };
    const allButtons = [...root.querySelectorAll('button, a.pkp_button, a[role=button]')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 100);
    return {dialogCount: dlgs.length, header, h2, bubble, headings, menu, actionButtons, actionText, statusBox, recommendationBox: boxOf(/^Recommendation$/i), participantsBox: boxOf(/^Participants$/i), secondaryText: txt(secondary) && txt(secondary).slice(0, 1500), primaryText: txt(primary) && txt(primary).slice(0, 1800), tables, allButtons, text: root.innerText.replace(/\s+/g, ' ').slice(0, 3500)};
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
    const errors = [...main.querySelectorAll('.pkpFieldError, [role=alert], .pkpNotification')].filter(vis).map((e) => txt(e)).filter(Boolean).slice(0, 12);
    return {url: location.href, title: document.title, h1: txt(h1), rail, headings: hs, buttons: btns, errors, text: main.innerText.slice(0, 5000)};
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

forEachApp(async (app) => {
    const sf = stateFile(app);
    const sc = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(sc, null, 2));
    const isOMP = app.name === 'omp';
    const isOJS = app.name === 'ojs';
    const isOPS = app.name === 'ops';
    const cu = (cp, p) => app.url(`/index.php/${cp}${p}`);
    const wf = (cp, id, key) => cu(cp, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const authorWf = (cp, id, key) => cu(cp, `/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const rkey = (s, n = 0) => (s.rounds && s.rounds[n] ? `workflow_${s.rounds[n].stageId}_${s.rounds[n].id}` : undefined);

    const {page, close} = await launch(app);
    const dialogsSeen = [];
    let dialogAnswer = 'accept';
    page.on('dialog', async (d) => {
        dialogsSeen.push({type: d.type(), message: d.message(), url: page.url(), answer: d.type() === 'beforeunload' ? 'accept' : dialogAnswer});
        log('[browser dialog]', d.type(), flat(d.message(), 120));
        if (d.type() === 'beforeunload' || dialogAnswer === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    // the workflow's own submission GET, as the browser receives it (stage and rounds read off the screen's traffic)
    let lastSubmission = null;
    page.on('response', async (r) => {
        if (r.request().method() !== 'GET' || !/\/api\/v1\/submissions\/\d+(\?|$)/.test(r.url()) || r.status() !== 200) return;
        try { const j = await r.json(); lastSubmission = {id: j.id, stageId: j.stageId, status: j.status, reviewRounds: (j.reviewRounds || []).map((x) => ({id: x.id, stageId: x.stageId, round: x.round, statusId: x.statusId, status: x.status}))}; } catch (e) { /* not JSON */ }
    });
    const as = async (cp, who) => { await signIn(page, who === 'admin' ? 'admin' : `${cp}${who}`, {contextPath: cp}); await idle(page); };

    async function openWorkflow(url, label, extra) {
        lastSubmission = null;
        await page.goto(url); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(400);
        const info = await wfInfo(page).catch((e) => ({error: String(e.message)}));
        info.submission = lastSubmission;
        await snap(page, label, {info, ...(extra || {})});
        log(`[${label}]`, 'h2:', flat(info.h2, 80), '| bubble:', flat(info.bubble, 60), '| status:', flat(info.statusBox && info.statusBox.text, 160), '| actions:', JSON.stringify((info.actionButtons || []).map((b) => b.text)), '| rec:', flat(info.recommendationBox && `${info.recommendationBox.where}: ${info.recommendationBox.text} ${JSON.stringify(info.recommendationBox.buttons)}`, 200));
        return info;
    }
    async function readWizard(label, extra) {
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(300);
        const w = await wizInfo(page).catch((e) => ({error: String(e.message), url: page.url()}));
        await snap(page, label, {wiz: w, ...(extra || {})});
        log(`[${label}]`, 'h1:', flat(w.h1, 90), '| rail:', JSON.stringify((w.rail || []).map((r) => `${r.text}${r.current ? '*' : ''}`)));
        return w;
    }
    const actionBtn = (name) => page.locator('[role="dialog"]:visible').first().locator('[data-cy="workflow-action-items"]').getByRole('button', {name, exact: true}).first();
    // Press a decision/recommend button; record every window before the wizard (stopAtWindow: leave it open).
    async function press(name, label, {stopAtWindow} = {}) {
        const btn = actionBtn(name);
        if (!(await btn.count())) { log(`[${label}] button "${name}" absent`); return {absent: true}; }
        await loc(page, `${label}: "${name}"`, btn);
        const before = page.url();
        await btn.click(); await idle(page);
        const out = {pressed: name, windows: []};
        await page.waitForFunction((b) => location.href !== b || [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length > 1, before, {timeout: 10000}).catch(() => {});
        await page.waitForTimeout(400);
        if (!isWizard(page)) {
            const ds = await dialogTexts(page);
            const top = ds[ds.length - 1];
            if (top && ds.length >= 2) {
                const win = {name: top.name, text: flat(top.text, 900), buttons: top.buttons.map((b) => b.t), inputs: top.inputs.filter((x) => x.type === 'radio' || x.type === 'checkbox')};
                out.windows.push(win);
                await snap(page, `${label}-window1`, {win});
                if (stopAtWindow) return out;
            }
        }
        if (isWizard(page)) await waitWizard(page);
        out.url = page.url().replace(/^https?:\/\/[^/]+/, '');
        out.onWizard = isWizard(page);
        return out;
    }
    async function walk(label) {
        const pages = [];
        for (let n = 1; n < 7; n++) {
            const w = await readWizard(`${label}-p${n}`);
            pages.push({n, h1: w.h1, rail: (w.rail || []).map((r) => `${r.text}${r.current ? '*' : ''}`), headings: (w.headings || []).map((h) => h.text), buttons: (w.buttons || []).map((b) => b.text)});
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
        if (!(await cancel.count())) return null;
        await cancel.click(); await page.waitForTimeout(600); await idle(page);
        const ds = await dialogTexts(page);
        const d = ds[ds.length - 1];
        const out = {dialog: d ? {name: d.name, text: flat(d.text, 400), buttons: d.buttons.map((b) => b.t)} : null};
        const cd = topWin(page).getByRole('button', {name: 'Cancel Decision'}).first();
        if (await cd.count()) { await cd.click(); await idle(page); await page.waitForTimeout(900); await idle(page); }
        out.landed = page.url().replace(/^https?:\/\/[^/]+/, '');
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
        const out = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), dialog: d ? {name: d.name, text: flat(d.text, 600), buttons: d.buttons.map((b) => b.t)} : null, errors: w.errors};
        await snap(page, `${label}-recorded`, {out});
        log(`[${label} recorded]`, JSON.stringify(out).slice(0, 400));
        return out;
    }
    async function walkAndRecord(label) { const pages = await walk(label); const rec = await recordDecision(label); return {pages, rec}; }
    async function readTwice(url, label) {
        const a = await openWorkflow(url, `${label}-after`);
        await page.reload(); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(500);
        const b = await wfInfo(page).catch(() => ({}));
        b.submission = lastSubmission;
        await snap(page, `${label}-reload`, {info: b});
        log(`[${label}-reload]`, 'status:', flat(b.statusBox && b.statusBox.text, 160), '| actions:', JSON.stringify((b.actionButtons || []).map((x) => x.text)), '| rec:', flat(b.recommendationBox && b.recommendationBox.text, 160));
        return {after: a, reload: b};
    }
    const brief = (i) => i && ({h2: i.h2, bubble: i.bubble, status: i.statusBox && i.statusBox.text, actions: (i.actionButtons || []).map((b) => b.text), actionText: i.actionText, rec: i.recommendationBox, stage: i.submission && i.submission.stageId, rounds: i.submission && i.submission.reviewRounds});

    // ---- the Participants panel: row menu › Edit, the "Edit Assignment" window, the "Assign" window
    const column = () => page.locator('[data-cy="workflow-secondary-items"]');
    const partRow = (name) => column().locator('li').filter({has: page.locator('button')}).filter({hasText: name}).first();
    async function participantsLines() {
        return column().locator('li').filter({has: page.locator('button')}).evaluateAll((items) => items.map((li) => li.innerText.split('\n').map((s) => s.trim()).filter((s) => s && !/More Actions$/.test(s)).join(' / '))).catch(() => []);
    }
    async function openEditAssignment(name, label) {
        const btn = partRow(name).locator('button[aria-haspopup="menu"]');
        await loc(page, `Participants row "${name}" More Actions`, btn);
        await btn.click();
        await page.getByRole('menuitem').first().waitFor({timeout: 30000});
        const items = (await page.getByRole('menuitem').allTextContents()).map((t) => flat(t));
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const win = page.getByRole('dialog', {name: 'Edit Assignment', exact: true});
        await win.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: 30000});
        await idle(page); await page.waitForTimeout(300);
        const d = (await dialogTexts(page)).slice(-1)[0];
        const read = {menu: items, name: d && d.name, text: d && flat(d.text, 1200), inputs: d && d.inputs.filter((i) => i.type === 'checkbox'), buttons: d && d.buttons.map((b) => b.t)};
        await snap(page, label, {win: read});
        await loc(page, 'Edit Assignment: "recommendOnly" box', win.locator('input[name="recommendOnly"]'));
        log(`[${label}]`, JSON.stringify(read.inputs), flat(read.text, 300));
        return {win, read};
    }
    async function saveEditAssignment(win, label) {
        const saved = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30000}).catch(() => null);
        await win.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await saved;
        await page.waitForTimeout(700);
        const toasts = await page.locator('[role="status"].app__notifications .pkpNotification, .app__notifications').allInnerTexts().catch(() => []);
        await win.waitFor({state: 'detached', timeout: 30000}).catch(() => {});
        await idle(page);
        const out = {status: r && r.status(), toasts: toasts.map((t) => flat(t, 200)), lines: await participantsLines()};
        await snap(page, `${label}-saved`, {out});
        log(`[${label} saved]`, JSON.stringify(out));
        return out;
    }
    async function assignWindow(label, {chooseRole} = {}) {
        const a = column().locator('button').filter({hasText: /^\s*Assign\s*$/});
        await loc(page, 'Participants "Assign"', a);
        if (!(await a.count())) { record(`${label}-no-assign`, {}); return null; }
        await a.click();
        const win = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
        await win.locator('select[name="filterUserGroupId"]').waitFor({timeout: 30000});
        await idle(page); await page.waitForTimeout(500);
        const roles = await win.locator('select[name="filterUserGroupId"] option').allTextContents();
        const out = {roles: roles.map((r) => flat(r))};
        if (chooseRole) {
            await win.locator('select[name="filterUserGroupId"]').selectOption({label: chooseRole}).catch(() => {});
            await page.waitForTimeout(600); await idle(page);
            out.chosen = chooseRole;
            out.boxes = await win.locator('input[name="recommendOnly"], input[name="canChangeMetadata"]').evaluateAll((els) => els.map((i) => ({name: i.name, checked: i.checked, visible: i.getClientRects().length > 0 && getComputedStyle(i).visibility !== 'hidden'})));
            out.text = flat(await win.innerText().catch(() => ''), 1500);
        }
        await snap(page, label, {assign: out});
        log(`[${label}]`, JSON.stringify(out).slice(0, 600));
        const cancel = win.getByRole('link', {name: 'Cancel', exact: true});
        if (await cancel.count()) await cancel.click().catch(() => {}); else await closeTop(page);
        await win.waitFor({state: 'detached', timeout: 15000}).catch(() => {});
        await page.waitForTimeout(700);
        return out;
    }

    // ---- Settings › Workflow › Review (Setup, Reviewer Guidance) and "Tasks and Discussions"
    const setupPanel = () => page.locator('#reviewSetup');
    async function gotoSetup(cp) {
        await page.goto(cu(cp, '/management/settings/workflow')); await idle(page);
        await page.getByRole('tab', {name: 'Review', exact: true}).click(); await idle(page);
        const side = page.getByRole('tab', {name: 'Setup', exact: true});
        if (await side.count()) await side.first().click();
        await setupPanel().locator('input[name="numWeeksPerResponse"]').waitFor({timeout: 30000});
        await idle(page);
    }
    const readSetup = () => setupPanel().evaluate((root) => {
        const lab = (el) => { const l = el.id ? root.querySelector(`label[for="${el.id}"]`) : null; return (l ? l.innerText : (el.closest('label') || {}).innerText || '').trim(); };
        const text = (n) => { const i = root.querySelector(`input[name="${n}"]`); return i ? i.value : null; };
        const box = (n) => { const i = root.querySelector(`input[name="${n}"]`); return i ? {checked: i.checked, label: lab(i)} : null; };
        const modes = [...root.querySelectorAll('input[name="defaultReviewMode"]')].map((i) => `${lab(i)}${i.checked ? ' [x]' : ''}`);
        const minField = root.querySelector('input[name="numReviewsPerSubmission"]');
        const minLabel = minField ? (root.querySelector(`label[for="${minField.id}"]`) || {}).innerText : null;
        return {numReviewsPerSubmission: text('numReviewsPerSubmission'), minLabel: minLabel && minLabel.trim(), modes, reviewerSuggestionEnabled: box('reviewerSuggestionEnabled'),
            errors: [...root.querySelectorAll('.pkpFieldError')].map((e) => e.innerText.trim()).filter(Boolean)};
    });
    async function saveSetup(cp, label) {
        const st = []; const onR = (r) => { if (/\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET') st.push({m: r.request().method(), s: r.status()}); }; page.on('response', onR);
        await setupPanel().getByRole('button', {name: 'Save', exact: true}).click();
        await page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 30000}).catch(() => {});
        await page.waitForTimeout(600);
        const status = await setupPanel().locator('[role="status"]').allInnerTexts().catch(() => []);
        const same = await readSetup();
        await snap(page, `${label}-saved`, {responses: st, status, form: same});
        page.off('response', onR);
        await page.reload(); await idle(page); await gotoSetup(cp);
        const re = await readSetup();
        await snap(page, `${label}-reloaded`, {form: re});
        log(`[${label}]`, JSON.stringify(st), JSON.stringify(status), 'same page:', JSON.stringify(same), '| reload:', JSON.stringify(re));
        return {responses: st, status, same, reload: re};
    }
    async function gotoGuidance(cp) {
        await page.goto(cu(cp, '/management/settings/workflow')); await idle(page);
        await page.getByRole('tab', {name: 'Review', exact: true}).click(); await idle(page);
        await page.getByRole('tab', {name: 'Reviewer Guidance', exact: true}).click(); await idle(page);
        await page.locator('#reviewerGuidance iframe').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForTimeout(800);
    }
    const readGuidance = () => page.evaluate(() => {
        const out = {};
        const root = document.querySelector('#reviewerGuidance');
        if (!root) return {absent: true};
        out.labels = [...root.querySelectorAll('label, .pkpFormFieldLabel, legend')].map((l) => l.innerText.trim()).filter(Boolean).slice(0, 20);
        out.editors = (window.tinymce ? window.tinymce.get() : []).filter((e) => root.contains(e.getElement())).map((e) => ({id: e.id, content: e.getContent({format: 'text'}).slice(0, 300)}));
        return out;
    });
    async function gotoTemplates(cp) {
        await page.goto(cu(cp, '/management/settings/workflow')); await idle(page);
        await page.getByRole('tab', {name: 'Tasks and Discussions', exact: true}).click(); await idle(page);
        await page.getByRole('tabpanel', {name: 'Tasks and Discussions'}).locator('table').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForTimeout(600); await idle(page);
    }
    const readTemplates = () => page.getByRole('tabpanel', {name: 'Tasks and Discussions'}).evaluate((p) => {
        const out = [];
        let cur = null;
        for (const tr of p.querySelectorAll('tbody tr')) {
            const g = tr.querySelector('th[scope="rowgroup"]');
            if (g) { cur = {group: g.innerText.replace(/\s+/g, ' ').trim(), rows: []}; out.push(cur); continue; }
            if (cur) cur.rows.push({text: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 200), autoAdd: tr.querySelector('input[type=checkbox]') ? tr.querySelector('input[type=checkbox]').checked : null});
        }
        return out;
    }).catch((e) => ({error: String(e.message)}));

    // ---- Users & Roles › Roles
    const grid = () => page.locator('#roleGridContainer');
    async function gotoRoles(cp) {
        await page.goto(cu(cp, '/management/settings/access')); await idle(page);
        await page.locator('#roles-button').first().click();
        await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: 30000});
        await idle(page); await page.waitForTimeout(400);
    }
    const readGrid = () => grid().evaluate((g) => {
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        const cols = [...g.querySelectorAll('thead th')].map((th) => th.innerText.trim());
        const rows = [...g.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => ({
            name: (tr.querySelector('[id$="-name"] .label') || {}).innerText?.trim(),
            level: (tr.querySelector('[id$="-roleId"] .label') || {}).innerText?.trim(),
            boxes: [...tr.querySelectorAll('input[type=checkbox]')].map((i) => `${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}`).join(' '),
            arrow: !!tr.querySelector('a.show_extras, a.hide_extras'),
        }));
        return {cols, rows};
    });
    const roleRow = (name) => grid().locator('tr.gridRow').filter({has: page.locator('[id$="-name"] .label', {hasText: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)})}).first();
    async function openRoleEdit(name) {
        const row = roleRow(name);
        const arrow = row.locator('a.show_extras');
        if (!(await arrow.count())) return {noArrow: true};
        await arrow.click();
        const ctl = row.locator('xpath=following-sibling::tr[1]');
        const links = await ctl.locator('a').allInnerTexts().catch(() => []);
        const edit = ctl.getByRole('link', {name: 'Edit', exact: true});
        if (!(await edit.count())) return {links, noEdit: true};
        await edit.click();
        const form = page.locator('form#userGroupForm');
        await form.waitFor({state: 'visible', timeout: 30000});
        await form.locator('input[name="permitMetadataEdit"]').waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(800);
        return {links, form};
    }
    const readRoleForm = (form) => form.evaluate((el) => {
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        const lab = (i) => { const l = el.querySelector(`label[for="${i.id}"]`) || i.closest('label'); return l ? l.innerText.replace(/\s+/g, ' ').trim() : i.name; };
        return {stages: [...el.querySelectorAll('input[name="assignedStages[]"]')].map((i) => `${lab(i)}:${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}${vis(i) ? '' : 'h'}`),
            options: [...el.querySelectorAll('input[type=checkbox]:not([name="assignedStages[]"])')].map((i) => `${i.name}:${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}`)};
    });
    async function setStageBox(form, stageLabel, want) {
        const idx = await form.locator('input[name="assignedStages[]"]').evaluateAll((els, want) => els.findIndex((i) => {
            const l = document.querySelector(`label[for="${i.id}"]`) || i.closest('label');
            return l && l.innerText.replace(/\s+/g, ' ').trim() === want;
        }), stageLabel);
        const b = form.locator('input[name="assignedStages[]"]').nth(Math.max(idx, 0));
        await loc(page, `Roles › Edit: "Stage Assignment" box "${stageLabel}"`, b);
        if ((await b.isChecked()) !== want) await b.click({force: true});
        return b.isChecked();
    }
    async function roleFormOK(form, label) {
        const w = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: 30000}).catch(() => null);
        await form.getByRole('button', {name: 'OK', exact: true}).click();
        const resp = await w;
        await page.waitForTimeout(800);
        const toasts = await page.locator('.app__notifications, [role=status]').allInnerTexts().catch(() => []);
        await form.waitFor({state: 'detached', timeout: 30000}).catch(() => {});
        await idle(page);
        const same = await readGrid();
        await snap(page, `${label}-same-page`, {grid: same});
        return {status: resp && resp.status(), toasts: toasts.map((t) => flat(t, 200)).filter(Boolean), same};
    }

    // ---- the reviewer's review page
    const wizUrl = (cp, id) => cu(cp, `/reviewer/submission/${id}`);
    const tabsOf = () => page.getByRole('tab').evaluateAll((els) => els.map((e) => `${e.textContent.trim()}:selected=${e.getAttribute('aria-selected')}`));
    async function waitTab(n) {
        await page.waitForFunction((k) => document.querySelector('[role=tab][aria-selected=true]')?.textContent.trim().startsWith(`${k}.`), n, {timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(500);
    }
    async function reviewerSteps(cp, id, label) {
        const out = {};
        await page.goto(wizUrl(cp, id)); await idle(page); await page.waitForTimeout(600);
        out.step1 = {tabs: await tabsOf()};
        const s1 = await snap(page, `${label}-step1`);
        out.step1.text = flat(s1.text && s1.text.main, 800);
        const cont = page.getByRole('button', {name: 'Save and continue'});
        if (await cont.count()) { await cont.click(); await waitTab(2); }
        else { await page.goto(`${wizUrl(cp, id)}?step=2`); await idle(page); await page.waitForTimeout(600); }
        const s2 = await snap(page, `${label}-step2`);
        out.step2 = {tabs: await tabsOf(), text: flat(s2.text && s2.text.main, 1500)};
        const c3 = page.getByRole('button', {name: 'Continue to Step #3'});
        if (await c3.count()) { await c3.click(); await waitTab(3); }
        await page.locator('iframe[id^="comments"]').first().waitFor({timeout: 30000}).catch(() => {});
        const s3 = await snap(page, `${label}-step3`);
        out.step3 = {tabs: await tabsOf(), text: flat(s3.text && s3.text.main, 1500), guidelinesLink: await page.getByRole('link', {name: 'Review Guidelines'}).count()};
        if (out.step3.guidelinesLink) {
            await page.getByRole('link', {name: 'Review Guidelines'}).first().click();
            const dlg = page.getByRole('dialog').filter({hasText: 'Review Guidelines'}).last();
            await dlg.waitFor({timeout: 15000}).catch(() => {});
            await page.waitForTimeout(600);
            out.step3.guidelinesDialog = flat(await dlg.innerText().catch(() => null), 600);
            await snap(page, `${label}-step3-guidelines-dialog`);
            await dlg.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
            await dlg.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
        }
        log(`[${label}]`, 'step2:', flat(out.step2.text, 300), '| step3 link:', out.step3.guidelinesLink, flat(out.step3.guidelinesDialog, 200));
        return out;
    }

    // ---- the Add Reviewer window
    async function addReviewerWindow(label, {closeAfter = true} = {}) {
        const btn = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Add Reviewer', exact: true}).first();
        await loc(page, `${label}: Reviewers "Add Reviewer"`, btn);
        if (!(await btn.count())) { record(`${label}-no-add-reviewer`, {}); return {absent: true}; }
        await btn.click();
        const dlg = page.getByRole('dialog', {name: /Add Reviewer/i}).last();
        await dlg.waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return d && (d.querySelector('.listPanel__item') || /No items|Locate a Reviewer/.test(d.innerText)); }, null, {timeout: 20000}).catch(() => {});
        await idle(page); await page.waitForTimeout(500);
        const info = await dlg.evaluate((root) => {
            const vis = (e) => e.offsetParent !== null;
            return {
                headings: [...root.querySelectorAll('h1,h2,h3,h4,.listPanel__title')].filter(vis).map((e) => e.innerText.trim()).filter(Boolean).slice(0, 30),
                panels: [...root.querySelectorAll('.listPanel')].filter(vis).map((p) => ({title: (p.querySelector('.listPanel__title, h2, h3') || {}).innerText?.trim() || null, items: [...p.querySelectorAll('.listPanel__item')].filter(vis).map((li) => ({lines: li.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8), buttons: [...li.querySelectorAll('button')].filter(vis).map((b) => (b.getAttribute('aria-label') || b.innerText).trim())})).slice(0, 12)})),
                text: root.innerText.slice(0, 4000),
            };
        }).catch((e) => ({error: String(e.message)}));
        await snap(page, label, {window: info});
        log(`[${label}]`, JSON.stringify((info.panels || []).map((p) => `${p.title}: ${p.items.length} [${p.items.map((i) => i.lines[0]).join('; ')}]`)));
        if (closeAfter) { await dlg.getByRole('button', {name: 'Close'}).first().click().catch(() => {}); await page.waitForTimeout(700); await idle(page); }
        return {info, dlg};
    }

    try {
        // ================================================================ seed
        if (on('seed') && !sc.A && isOMP) await sect('seed', async () => {
            const P = (cp, list) => list.map((p) => {
                const [n, ro] = Array.isArray(p) ? p : [p, false];
                const role = {ed: 'editor', ed2: 'editor', se: 'sectionEditor', se2: 'sectionEditor', sr1: 'sectionEditor', sr2: 'sectionEditor', fc: 'funding', ce: 'copyeditor'}[n];
                return {username: `${cp}${n}`, role, ...(ro ? {recommendOnly: true} : {})};
            });
            const person = (cp, n, roles, g, f) => ({username: `${cp}${n}`, roles, givenName: g, familyName: f});
            const mk = async (key, prefix, people, extra) => {
                const t = tag(prefix);
                await app.api.createContext({tag: t, context: {name: `K4 ${key} ${t}`, contactName: `Principal Contact ${t}`, contactEmail: `${t}contact@mail.test`}, users: people(t), ...(extra || {})});
                sc[key] = {t, subs: {}}; save();
                log(`[seed] context ${key} ${t}`);
                return t;
            };
            const sub = async (key, sk, body) => {
                const t = sc[key].t;
                const full = {tag: `${t}${sk.toLowerCase()}`, context: t, submitter: `${t}au`, title: `K4 ${sk} ${t}`, ...body};
                const s = await app.api.createSubmission(full);
                sc[key].subs[sk] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds, title: full.title, reviewAssignments: s.reviewAssignments};
                save();
                log(`[seed] ${key}.${sk} #${s.submissionId} stage ${s.stageId} rounds ${JSON.stringify(s.reviewRounds)}`);
            };
            const ir = (t, reviewers) => ({stage: 'internal', reviewers: reviewers.map(([n, st]) => ({username: `${t}${n}`, status: st}))});
            const er = (t, reviewers) => ({stage: 'external', reviewers: reviewers.map(([n, st]) => ({username: `${t}${n}`, status: st}))});
            const send = ['sendInternalReview'];
            // A (main)
            let t = await mk('A', 'u71k4a', (c) => [
                person(c, 'mgr', ['manager'], 'Maya', 'Managerson'), person(c, 'ed', ['editor'], 'Eve', 'Presseditor'),
                person(c, 'ed2', ['editor'], 'Edna', 'Recommendpress'), person(c, 'se', ['sectionEditor'], 'Sam', 'Decider'),
                person(c, 'se2', ['sectionEditor'], 'Sofia', 'Seconddecider'), person(c, 'sr1', ['sectionEditor'], 'Remy', 'Recommender'),
                person(c, 'sr2', ['sectionEditor'], 'Rosa', 'Recommendtwo'), person(c, 'fc', ['funding'], 'Fran', 'Funder'),
                person(c, 'au', ['author'], 'Alex', 'Authorson'), person(c, 'ri1', ['internalReviewer'], 'Ian', 'Internalone'),
                person(c, 'ri2', ['internalReviewer'], 'Ina', 'Internaltwo'), person(c, 'rv1', ['externalReviewer'], 'Rita', 'Externalrev')]);
            await sub('A', 'RA', {decisions: send, reviewRounds: [ir(t, [['ri1', 'invited']])], participants: P(t, ['se', ['sr1', true]])});
            await sub('A', 'RN', {decisions: send, reviewRounds: [ir(t, [['ri1', 'invited']])], participants: P(t, [['sr1', true]])});
            await sub('A', 'RP', {decisions: send, reviewRounds: [ir(t, [['ri1', 'invited']])], participants: P(t, ['se', ['ed2', true]])});
            await sub('A', 'RQ', {decisions: send, reviewRounds: [ir(t, [['ri1', 'invited']])], participants: P(t, [['ed2', true]])});
            await sub('A', 'RW', {decisions: send, reviewRounds: [ir(t, [['ri1', 'declined']])], participants: P(t, ['se', ['sr1', true], ['sr2', true]])});
            await sub('A', 'RV', {decisions: send, reviewRounds: [ir(t, [['ri1', 'invited']])], participants: P(t, ['se', ['sr1', true]])});
            await sub('A', 'RD', {decisions: send, reviewRounds: [ir(t, [['ri1', 'invited']])], participants: P(t, ['se', ['sr1', true]])});
            await sub('A', 'EX', {decisions: ['skipInternalReview'], reviewRounds: [er(t, [['rv1', 'invited']])], participants: P(t, ['se', ['sr1', true]])});
            await sub('A', 'AP', {decisions: send, reviewRounds: [ir(t, [['ri1', 'invited']])], participants: P(t, ['se', 'ed'])});
            await sub('A', 'AU', {decisions: send, reviewRounds: [ir(t, [['ri1', 'completed']])], participants: P(t, ['se'])});
            await sub('A', 'GA', {decisions: send, reviewRounds: [ir(t, [['ri1', 'accepted']])], participants: P(t, ['se'])});
            // M (minimum): monographs seeded after the on-screen setting (phase min)
            await mk('M', 'u71k4m', (c) => [person(c, 'mgr', ['manager'], 'Maya', 'Managerson'), person(c, 'se', ['sectionEditor'], 'Sam', 'Decider'),
                person(c, 'au', ['author'], 'Alex', 'Authorson'), person(c, 'ri1', ['internalReviewer'], 'Ian', 'Internalone'),
                person(c, 'ri2', ['internalReviewer'], 'Ina', 'Internaltwo'), person(c, 'rv1', ['externalReviewer'], 'Rita', 'Externalrev')]);
            // R (review mode)
            t = await mk('R', 'u71k4r', (c) => [person(c, 'mgr', ['manager'], 'Maya', 'Managerson'), person(c, 'se', ['sectionEditor'], 'Sam', 'Decider'),
                person(c, 'au', ['author'], 'Alex', 'Authorson'), person(c, 'ri1', ['internalReviewer'], 'Ian', 'Internalone'),
                person(c, 'ri2', ['internalReviewer'], 'Ina', 'Internaltwo')]);
            await sub('R', 'M0', {decisions: send, reviewRounds: [ir(t, [['ri1', 'completed']])], participants: P(t, ['se'])});
            // S (suggestions): monographs after the on-screen switch (phase sugg)
            await mk('S', 'u71k4s', (c) => [person(c, 'mgr', ['manager'], 'Maya', 'Managerson'), person(c, 'ed', ['editor'], 'Eve', 'Presseditor'),
                person(c, 'se', ['sectionEditor'], 'Sam', 'Decider'), person(c, 'fc', ['funding'], 'Fran', 'Funder'),
                person(c, 'au', ['author'], 'Alex', 'Authorson'), person(c, 'ri1', ['internalReviewer'], 'Ian', 'Internalone'),
                person(c, 'rv1', ['externalReviewer'], 'Rita', 'Externalrev')]);
            // G (guidelines)
            t = await mk('G', 'u71k4g', (c) => [person(c, 'mgr', ['manager'], 'Maya', 'Managerson'), person(c, 'se', ['sectionEditor'], 'Sam', 'Decider'),
                person(c, 'au', ['author'], 'Alex', 'Authorson'), person(c, 'ri1', ['internalReviewer'], 'Ian', 'Internalone'),
                person(c, 'ri2', ['internalReviewer'], 'Ina', 'Internaltwo'), person(c, 'rv1', ['externalReviewer'], 'Rita', 'Externalrev')]);
            await sub('G', 'GB', {decisions: send, reviewRounds: [ir(t, [['ri1', 'accepted'], ['ri2', 'accepted']])], participants: P(t, ['se'])});
            await sub('G', 'GX', {decisions: ['skipInternalReview'], reviewRounds: [er(t, [['rv1', 'accepted']])], participants: P(t, ['se'])});
            // T (templates): monographs after the on-screen templates (phase tmpl)
            await mk('T', 'u71k4t', (c) => [person(c, 'mgr', ['manager'], 'Maya', 'Managerson'), person(c, 'se', ['sectionEditor'], 'Sam', 'Decider'),
                person(c, 'au', ['author'], 'Alex', 'Authorson'), person(c, 'ri1', ['internalReviewer'], 'Ian', 'Internalone')]);
            // L (roles)
            t = await mk('L', 'u71k4l', (c) => [person(c, 'mgr', ['manager'], 'Maya', 'Managerson'), person(c, 'se', ['sectionEditor'], 'Sam', 'Decider'),
                person(c, 'fc', ['funding'], 'Fran', 'Funder'), person(c, 'ce', ['copyeditor'], 'Cora', 'Copyeditor'),
                person(c, 'au', ['author'], 'Alex', 'Authorson'), person(c, 'ri1', ['internalReviewer'], 'Ian', 'Internalone')]);
            await sub('L', 'L1', {decisions: send, reviewRounds: [ir(t, [['ri1', 'invited']])], participants: P(t, ['se', 'fc'])});
        });
        if (on('seed') && !sc.J && isOJS) await sect('seed-ojs', async () => {
            const t = tag('u71k4j');
            const person = (n, roles, g, f) => ({username: `${t}${n}`, roles, givenName: g, familyName: f});
            await app.api.createContext({tag: t, context: {name: `K4 J ${t}`, contactName: `Principal Contact ${t}`, contactEmail: `${t}contact@mail.test`},
                review: {reviewerSuggestionEnabled: true},
                users: [person('mgr', ['manager'], 'Maya', 'Managerson'), person('se', ['sectionEditor'], 'Sam', 'Decider'), person('sr1', ['sectionEditor'], 'Remy', 'Recommender'),
                    person('au', ['author'], 'Alex', 'Authorson'), person('rv1', ['externalReviewer'], 'Rita', 'Externalrev')]});
            sc.J = {t, subs: {}}; save();
            const s = await app.api.createSubmission({tag: `${t}oi`, context: t, submitter: `${t}au`, title: `K4 OI ${t}`, decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: [{username: `${t}rv1`, status: 'invited'}]}], participants: [{username: `${t}se`, role: 'sectionEditor'}, {username: `${t}sr1`, role: 'sectionEditor', recommendOnly: true}],
                reviewerSuggestions: [{givenName: 'Sugg', familyName: 'Journalperson', email: `${t}sugg@mail.test`}]});
            sc.J.subs.OI = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save();
            log('[seed ojs]', t, JSON.stringify(sc.J.subs));
        });
        if (on('seed') && !sc.P && isOPS) await sect('seed-ops', async () => {
            const t = tag('u71k4p');
            await app.api.createContext({tag: t, context: {name: `K4 P ${t}`, contactName: `Principal Contact ${t}`, contactEmail: `${t}contact@mail.test`},
                users: [{username: `${t}mgr`, roles: ['manager'], givenName: 'Maya', familyName: 'Managerson'}, {username: `${t}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Moderator'},
                    {username: `${t}au`, roles: ['author'], givenName: 'Alex', familyName: 'Authorson'}]});
            sc.P = {t, subs: {}}; save();
            const s = await app.api.createSubmission({tag: `${t}q`, context: t, submitter: `${t}au`, title: `K4 Q ${t}`, participants: [{username: `${t}se`, role: 'sectionEditor'}]});
            sc.P.subs.Q = {id: s.submissionId, stageId: s.stageId}; save();
        });

        // ================================================================ OPS: read-only controls
        if (isOPS) {
            if (on('ops')) await sect('ops', async () => {
                const cp = sc.P.t; const out = {};
                await as(cp, 'mgr');
                await page.goto(cu(cp, '/management/settings/workflow')); await idle(page);
                out.workflowTabs = (await page.locator('main').getByRole('tab').allInnerTexts()).map((x) => flat(x));
                await snap(page, 'ops-mgr-settings-workflow', {tabs: out.workflowTabs});
                await gotoTemplates(cp);
                out.templates = await readTemplates();
                await snap(page, 'ops-mgr-templates', {templates: out.templates});
                await gotoRoles(cp);
                out.roles = await readGrid();
                await snap(page, 'ops-mgr-roles', {grid: out.roles});
                const q = sc.P.subs.Q;
                out.wf = brief(await openWorkflow(wf(cp, q.id), 'ops-mgr-q'));
                out.lines = await participantsLines();
                const ea = await openEditAssignment('Sam Moderator', 'ops-mgr-q-edit-assignment').catch((e) => ({error: String(e.message)}));
                out.editAssignment = ea.read || ea;
                if (ea.win) { await ea.win.getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => {}); await page.waitForTimeout(700); }
                await openWorkflow(wf(cp, q.id), 'ops-mgr-q-before-assign');
                out.assign = await assignWindow('ops-mgr-q-assign', {chooseRole: 'Moderator'});
                record('ops-summary', out);
                log('[ops]', JSON.stringify(out).slice(0, 2500));
            });
            // what "Assignment privileges" does when ticked on a preprint server (the box is offered there too)
            if (on('ops2')) await sect('ops2', async () => {
                const cp = sc.P.t; const q = sc.P.subs.Q; const out = {};
                await as(cp, 'au');
                out.author = brief(await openWorkflow(authorWf(cp, q.id), 'ops2-au-q'));
                await as(cp, 'mgr');
                await openWorkflow(wf(cp, q.id), 'ops2-mgr-q-before');
                const e = await openEditAssignment('Sam Moderator', 'ops2-mgr-q-edit');
                await e.win.locator('input[name="recommendOnly"]').check({force: true});
                out.save = await saveEditAssignment(e.win, 'ops2-mgr-q-edit-tick');
                out.mgr = brief(await openWorkflow(wf(cp, q.id), 'ops2-mgr-q-after'));
                out.lines = await participantsLines();
                await as(cp, 'se');
                const t = await readTwice(wf(cp, q.id), 'ops2-se-q-recommendonly');
                out.se = {after: brief(t.after), reload: brief(t.reload)};
                // what "Post the preprint" leads to, for the recommend-only moderator and for the manager (control)
                const postPage = async (label) => {
                    await openWorkflow(wf(cp, q.id), `${label}-before-post`);
                    const b = actionBtn('Post the preprint');
                    if (!(await b.count())) return {absent: true};
                    await b.click(); await idle(page); await page.waitForTimeout(1500);
                    const buttons = await page.locator('[role="dialog"]:visible').first().locator('button').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean));
                    await snap(page, `${label}-after-post-press`, {buttons});
                    return {url: page.url().split('/index.php')[1], buttons};
                };
                out.sePost = await postPage('ops2-se-q');
                await as(cp, 'mgr');
                out.mgrPost = await postPage('ops2-mgr-q');
                record('ops2-summary', out);
                log('[ops2]', JSON.stringify(out).slice(0, 2500));
            });
            return;
        }
        // ================================================================ OJS: read-only controls
        if (isOJS) {
            if (on('ojs')) await sect('ojs', async () => {
                const cp = sc.J.t; const oi = sc.J.subs.OI; const out = {};
                await as(cp, 'mgr');
                await gotoSetup(cp);
                out.setup = await readSetup();
                await snap(page, 'ojs-mgr-review-setup', {form: out.setup});
                await gotoTemplates(cp);
                out.templates = await readTemplates();
                await snap(page, 'ojs-mgr-templates', {templates: out.templates});
                await gotoRoles(cp);
                out.roles = await readGrid();
                await snap(page, 'ojs-mgr-roles', {grid: out.roles});
                out.mgrRound = brief(await openWorkflow(wf(cp, oi.id, rkey(oi)), 'ojs-mgr-oi-round1'));
                out.mgrAdd = (await addReviewerWindow('ojs-mgr-oi-add-reviewer')).info;
                await openWorkflow(wf(cp, oi.id, rkey(oi)), 'ojs-mgr-oi-round1-again');
                const ea = await openEditAssignment('Sam Decider', 'ojs-mgr-oi-edit-assignment-se').catch((e) => ({error: String(e.message)}));
                out.editAssignment = ea.read || ea;
                if (ea.win) { await ea.win.getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => {}); await page.waitForTimeout(700); }
                await as(cp, 'se');
                out.seRound = brief(await openWorkflow(wf(cp, oi.id, rkey(oi)), 'ojs-se-oi-round1'));
                await as(cp, 'sr1');
                out.sr1Round = brief(await openWorkflow(wf(cp, oi.id, rkey(oi)), 'ojs-sr1-oi-round1'));
                const p = await press('Recommend Revisions', 'ojs-sr1-oi-recommend-revisions', {stopAtWindow: true});
                out.sr1RecommendRevisions = p;
                if (isWizard(page)) await cancelWizard('ojs-sr1-oi-recommend-revisions'); else await closeTop(page);
                record('ojs-summary', out);
                log('[ojs]', JSON.stringify(out).slice(0, 3000));
            });
            // the author's view of a journal round with a completed anonymous review (control for Settings "Default Review Mode")
            if (on('ojs2')) await sect('ojs2', async () => {
                const cp = sc.J.t; const out = {};
                if (!sc.J.subs.OC) {
                    const s = await app.api.createSubmission({tag: `${cp}oc`, context: cp, submitter: `${cp}au`, title: `K4 OC ${cp}`, decisions: ['sendExternalReview'],
                        reviewRounds: [{reviewers: [{username: `${cp}rv1`, status: 'completed'}]}], participants: [{username: `${cp}se`, role: 'sectionEditor'}]});
                    sc.J.subs.OC = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save();
                }
                const oc = sc.J.subs.OC;
                await as(cp, 'au');
                out.author = brief(await openWorkflow(authorWf(cp, oc.id, rkey(oc)), 'ojs2-au-oc-round1'));
                out.authorHeadings = (await wfInfo(page)).headings;
                record('ojs2-summary', out);
                log('[ojs2]', JSON.stringify(out).slice(0, 2000));
            });
            return;
        }

        // ================================================================ OMP
        const A = sc.A && sc.A.t; const As = sc.A && sc.A.subs;

        // ---- settings: the install defaults on screen (main press, as its manager)
        if (on('settings')) await sect('settings', async () => {
            const out = {};
            await as(A, 'mgr');
            await gotoSetup(A);
            out.setup = await readSetup();
            await snap(page, 'set-mgr-review-setup', {form: out.setup});
            await loc(page, 'Review › Setup: "Minimum Confirmed Reviews Required"', setupPanel().locator('input[name="numReviewsPerSubmission"]'));
            await loc(page, 'Review › Setup: "Default Review Mode" radios', setupPanel().locator('input[name="defaultReviewMode"]'));
            await loc(page, 'Review › Setup: "Reviewer Suggestion at Submission" box', setupPanel().locator('input[name="reviewerSuggestionEnabled"]'));
            await gotoGuidance(A);
            out.guidance = await readGuidance();
            await snap(page, 'set-mgr-reviewer-guidance', {guidance: out.guidance});
            await gotoTemplates(A);
            out.templates = await readTemplates();
            await snap(page, 'set-mgr-templates', {templates: out.templates});
            await gotoRoles(A);
            out.roles = await readGrid();
            await snap(page, 'set-mgr-roles', {grid: out.roles});
            const pm = await openRoleEdit('Press manager');
            out.pressManagerRow = {links: pm.links, noEdit: !!pm.noEdit, noArrow: !!pm.noArrow};
            if (pm.form) { out.pressManagerForm = await readRoleForm(pm.form); await page.locator('form#userGroupForm').getByRole('link', {name: 'Cancel'}).click().catch(() => {}); }
            await gotoRoles(A);
            for (const r of ['Series editor', 'Press editor', 'Internal Reviewer', 'Funding coordinator']) {
                const e = await openRoleEdit(r);
                if (e.form) {
                    out[`form ${r}`] = await readRoleForm(e.form);
                    await snap(page, `set-mgr-role-edit-${slug(r)}`, {form: out[`form ${r}`]});
                    await e.form.getByRole('link', {name: 'Cancel', exact: true}).or(e.form.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
                    await e.form.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
                    await page.waitForTimeout(600);
                } else out[`form ${r}`] = e;
                await gotoRoles(A);
            }
            record('set-summary', out);
            log('[settings]', JSON.stringify(out).slice(0, 4000));
        });

        // ---- rec: Rule 14 per level; each recommend button's first page
        if (on('rec')) await sect('rec', async () => {
            const out = {};
            const RA = As.RA;
            for (const who of ['sr1', 'se', 'mgr', 'admin', 'fc', 'se2']) {
                await as(A, who);
                out[`RA ${who}`] = brief(await openWorkflow(wf(A, RA.id, rkey(RA)), `rec-${who}-ra`));
            }
            await as(A, 'sr1');
            out['RN sr1'] = brief(await openWorkflow(wf(A, As.RN.id, rkey(As.RN)), 'rec-sr1-rn'));
            out['EX sr1'] = brief(await openWorkflow(wf(A, As.EX.id, rkey(As.EX)), 'rec-sr1-ex'));
            const pe = await press('Recommend Revisions', 'rec-sr1-ex-recommend-revisions', {stopAtWindow: true});
            out['EX sr1 Recommend Revisions'] = pe;
            if (isWizard(page)) await cancelWizard('rec-sr1-ex-recommend-revisions'); else await closeTop(page);
            // each internal recommend button: its first page, then Cancel
            const opened = {};
            for (const name of ['Recommend Revisions', 'Recommend Accept', 'Recommend Decline', 'Recommend Send to External Review']) {
                await openWorkflow(wf(A, RA.id, rkey(RA)), `rec-sr1-ra-before-${slug(name)}`);
                const p = await press(name, `rec-sr1-ra-${slug(name)}`);
                let pages = null;
                if (p.onWizard) { pages = await walk(`rec-sr1-ra-${slug(name)}`); await cancelWizard(`rec-sr1-ra-${slug(name)}`); }
                opened[name] = {windows: p.windows, onWizard: p.onWizard, url: p.url, pages};
            }
            out.opened = opened;
            await as(A, 'admin');
            out['RN admin'] = brief(await openWorkflow(wf(A, As.RN.id, rkey(As.RN)), 'rec-admin-rn'));
            await as(A, 'mgr');
            out['RN mgr'] = brief(await openWorkflow(wf(A, As.RN.id, rkey(As.RN)), 'rec-mgr-rn'));
            await as(A, 'ed2');
            out['RP ed2'] = brief(await openWorkflow(wf(A, As.RP.id, rkey(As.RP)), 'rec-ed2-rp'));
            out['RQ ed2'] = brief(await openWorkflow(wf(A, As.RQ.id, rkey(As.RQ)), 'rec-ed2-rq'));
            out['RA ed2 (unassigned)'] = brief(await openWorkflow(wf(A, RA.id, rkey(RA)), 'rec-ed2-ra-unassigned'));
            await as(A, 'se');
            out['RP se'] = brief(await openWorkflow(wf(A, As.RP.id, rkey(As.RP)), 'rec-se-rp'));
            record('rec-summary', out);
            log('[rec]', JSON.stringify(out).slice(0, 5000));
        });

        // ---- walk: the round's status sentences, both boxes, "Change decision" (RW)
        if (on('walk')) await sect('walk', async () => {
            const out = {}; const RW = As.RW; const u = wf(A, RW.id, rkey(RW));
            await as(A, 'se'); out.se0 = brief(await openWorkflow(u, 'walk-se-0'));
            await as(A, 'sr1'); out.sr1_0 = brief(await openWorkflow(u, 'walk-sr1-0'));
            let p = await press('Recommend Send to External Review', 'walk-sr1-sendext');
            if (p.onWizard) out.sr1Record = await walkAndRecord('walk-sr1-sendext'); else out.sr1Press = p;
            const t1 = await readTwice(u, 'walk-sr1-1'); out.sr1_1 = {after: brief(t1.after), reload: brief(t1.reload)};
            await as(A, 'se'); const s1 = await readTwice(u, 'walk-se-1'); out.se1 = {after: brief(s1.after), reload: brief(s1.reload)};
            await as(A, 'sr2'); out.sr2_1 = brief(await openWorkflow(u, 'walk-sr2-1'));
            p = await press('Recommend Accept', 'walk-sr2-accept');
            if (p.onWizard) out.sr2Record = await walkAndRecord('walk-sr2-accept'); else out.sr2Press = p;
            const t2 = await readTwice(u, 'walk-sr2-2'); out.sr2_2 = {after: brief(t2.after), reload: brief(t2.reload)};
            for (const who of ['se', 'mgr', 'admin', 'sr1']) { await as(A, who); out[`${who}_2`] = brief(await openWorkflow(u, `walk-${who}-2`)); }
            // sr1: "Change decision"
            await openWorkflow(u, 'walk-sr1-before-change');
            const ch = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Change decision', exact: true}).first();
            await loc(page, 'Recommendation box: "Change decision"', ch);
            out.changeCount = await ch.count();
            if (out.changeCount) {
                await ch.click(); await idle(page); await page.waitForTimeout(800);
                const info = await wfInfo(page); info.submission = lastSubmission;
                await snap(page, 'walk-sr1-after-change-press', {info});
                out.afterChange = {brief: brief(info), dialogs: (await dialogTexts(page)).slice(1).map((d) => ({name: d.name, text: flat(d.text, 400), buttons: d.buttons.map((b) => b.t)})), url: page.url().replace(/^https?:\/\/[^/]+/, '')};
                if (isWizard(page)) { out.afterChange.pages = await walk('walk-sr1-change-wizard'); await cancelWizard('walk-sr1-change-wizard'); }
                else {
                    const d = actionBtn('Recommend Decline');
                    if (await d.count()) { const pd = await press('Recommend Decline', 'walk-sr1-change-decline'); if (pd.onWizard) out.changeRecord = await walkAndRecord('walk-sr1-change-decline'); }
                }
            }
            const t3 = await readTwice(u, 'walk-sr1-3'); out.sr1_3 = {after: brief(t3.after), reload: brief(t3.reload)};
            await as(A, 'se'); out.se_3 = brief(await openWorkflow(u, 'walk-se-3'));
            // the dashboard's list row for the deciding editor (what the list says about the round)
            await page.goto(cu(A, '/dashboard/editorial')); await idle(page); await page.waitForTimeout(800);
            const ds = await snap(page, 'walk-se-dashboard');
            out.dashboardRow = flat((ds.text && ds.text.main || '').split('\n').filter((l) => /K4 RW/.test(l)).join(' | '), 400);
            record('walk-summary', out);
            log('[walk]', JSON.stringify(out).slice(0, 6000));
        });

        // ---- moves: "Recommend Revisions" (RV) and "Recommend Decline" (RD) recorded; nothing moves
        if (on('moves')) await sect('moves', async () => {
            const out = {};
            for (const [k, name] of [['RV', 'Recommend Revisions'], ['RD', 'Recommend Decline']]) {
                const S = As[k]; const u = wf(A, S.id, rkey(S));
                await as(A, 'se'); out[`${k} se before`] = brief(await openWorkflow(u, `moves-se-${k.toLowerCase()}-before`));
                await as(A, 'au'); out[`${k} au before`] = brief(await openWorkflow(authorWf(A, S.id, rkey(S)), `moves-au-${k.toLowerCase()}-before`));
                await as(A, 'sr1');
                await openWorkflow(u, `moves-sr1-${k.toLowerCase()}-before`);
                const p = await press(name, `moves-sr1-${k.toLowerCase()}`);
                if (p.onWizard) out[`${k} record`] = await walkAndRecord(`moves-sr1-${k.toLowerCase()}`); else out[`${k} press`] = p;
                const t = await readTwice(u, `moves-sr1-${k.toLowerCase()}`); out[`${k} sr1 after`] = {after: brief(t.after), reload: brief(t.reload)};
                await as(A, 'se'); const s = await readTwice(u, `moves-se-${k.toLowerCase()}`); out[`${k} se after`] = {after: brief(s.after), reload: brief(s.reload)};
                await as(A, 'au'); out[`${k} au after`] = brief(await openWorkflow(authorWf(A, S.id, rkey(S)), `moves-au-${k.toLowerCase()}-after`));
                out[`${k} au upload button`] = await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload revisions', exact: true}).count();
            }
            record('moves-summary', out);
            log('[moves]', JSON.stringify(out).slice(0, 5000));
        });

        // ---- priv: "Assignment privileges" in "Edit Assignment" (AP)
        if (on('priv')) await sect('priv', async () => {
            const out = {}; const AP = As.AP; const u = wf(A, AP.id, rkey(AP));
            await as(A, 'se'); out.seBefore = brief(await openWorkflow(u, 'priv-se-before'));
            await as(A, 'ed'); out.edBefore = brief(await openWorkflow(u, 'priv-ed-before'));
            await as(A, 'mgr');
            await openWorkflow(u, 'priv-mgr-before');
            out.linesBefore = await participantsLines();
            // the Assign window's boxes for a Series editor (and a Press editor) as it opens
            out.assignSe = await assignWindow('priv-mgr-assign-series-editor', {chooseRole: 'Series editor'});
            await openWorkflow(u, 'priv-mgr-before-assign2');
            out.assignPe = await assignWindow('priv-mgr-assign-press-editor', {chooseRole: 'Press editor'});
            // leave once with a change unsaved: tick, then the window's own Close (and its question)
            await openWorkflow(u, 'priv-mgr-before-unsaved');
            let e = await openEditAssignment('Sam Decider', 'priv-mgr-edit-se-default');
            out.editSeDefault = e.read;
            const box = e.win.locator('input[name="recommendOnly"]');
            if (await box.count()) {
                await box.check({force: true});
                const n0 = dialogsSeen.length;
                dialogAnswer = 'dismiss';
                await e.win.getByRole('button', {name: 'Close', exact: true}).click().catch(() => {});
                await page.waitForTimeout(900);
                out.unsavedCloseDismiss = {browserDialogs: dialogsSeen.slice(n0), stillOpen: await e.win.count()};
                dialogAnswer = 'accept';
                if (await e.win.count()) {
                    const n1 = dialogsSeen.length;
                    await e.win.getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => {});
                    await page.waitForTimeout(900);
                    out.unsavedCancelAccept = {browserDialogs: dialogsSeen.slice(n1), stillOpen: await e.win.count()};
                }
                await snap(page, 'priv-mgr-after-unsaved-leave');
            }
            await openWorkflow(u, 'priv-mgr-after-unsaved-reland');
            e = await openEditAssignment('Sam Decider', 'priv-mgr-edit-se-reopen-after-unsaved');
            out.editSeAfterUnsaved = e.read;
            await e.win.locator('input[name="recommendOnly"]').check({force: true});
            out.saveSe = await saveEditAssignment(e.win, 'priv-mgr-edit-se-tick');
            await openWorkflow(u, 'priv-mgr-reland-after-tick');
            out.linesAfterTick = await participantsLines();
            e = await openEditAssignment('Sam Decider', 'priv-mgr-edit-se-reopen-after-tick');
            out.editSeAfterTick = e.read;
            await e.win.getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => {}); await page.waitForTimeout(700);
            await as(A, 'se'); const s = await readTwice(u, 'priv-se-after-tick'); out.seAfter = {after: brief(s.after), reload: brief(s.reload)};
            // the Press editor (manager level) ticked too
            await as(A, 'mgr');
            await openWorkflow(u, 'priv-mgr-before-ed');
            e = await openEditAssignment('Eve Presseditor', 'priv-mgr-edit-ed-default');
            out.editEdDefault = e.read;
            if (await e.win.locator('input[name="recommendOnly"]').count()) {
                await e.win.locator('input[name="recommendOnly"]').check({force: true});
                out.saveEd = await saveEditAssignment(e.win, 'priv-mgr-edit-ed-tick');
            } else { await e.win.getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => {}); }
            await openWorkflow(u, 'priv-mgr-reland-after-ed');
            out.linesAfterEd = await participantsLines();
            out.mgrAfterBoth = brief(await openWorkflow(u, 'priv-mgr-after-both'));
            await as(A, 'ed'); out.edAfter = brief(await openWorkflow(u, 'priv-ed-after-tick'));
            await as(A, 'se'); out.seAfterBoth = brief(await openWorkflow(u, 'priv-se-after-both'));
            record('priv-summary', out);
            log('[priv]', JSON.stringify(out).slice(0, 6000));
        });

        // ---- min: "Minimum Confirmed Reviews Required" (press M)
        if (on('min')) await sect('min', async () => {
            const M = sc.M.t; const out = sc.minOut || {};
            await as(M, 'mgr');
            if (!sc.M.subs.G1) {
                await gotoSetup(M);
                out.before = await readSetup();
                await snap(page, 'min-mgr-setup-before', {form: out.before});
                const i = setupPanel().locator('input[name="numReviewsPerSubmission"]');
                await loc(page, 'Review › Setup: "Minimum Confirmed Reviews Required" box', i);
                await i.fill(''); await i.fill('2');
                out.save = await saveSetup(M, 'min-mgr-setup-2');
                const ir = (rs) => ({stage: 'internal', reviewers: rs.map(([n, st]) => ({username: `${M}${n}`, status: st}))});
                const mk = async (sk, body) => { const s = await app.api.createSubmission({tag: `${M}${sk.toLowerCase()}`, context: M, submitter: `${M}au`, title: `K4 ${sk} ${M}`, participants: [{username: `${M}se`, role: 'sectionEditor'}], ...body}); sc.M.subs[sk] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save(); log(`[seed] M.${sk} #${s.submissionId}`); };
                await mk('G1', {decisions: ['sendInternalReview'], reviewRounds: [ir([['ri1', 'invited']])]});
                await mk('G2', {decisions: ['sendInternalReview'], reviewRounds: [ir([['ri1', 'completed'], ['ri2', 'completed']])]});
                await mk('G0', {decisions: ['sendInternalReview'], reviewRounds: [ir([])]});
                await mk('GE', {decisions: ['skipInternalReview'], reviewRounds: [{stage: 'external', reviewers: [{username: `${M}rv1`, status: 'invited'}]}]});
            }
            const G = sc.M.subs;
            // G1: each button with fewer confirmed reviews than the minimum
            await as(M, 'se');
            out.g1 = brief(await openWorkflow(wf(M, G.G1.id, rkey(G.G1)), 'min-se-g1'));
            out.g1Buttons = {};
            for (const name of ['Accept Submission', 'Request Revisions', 'Create New Review Round', 'Send to External Review', 'Decline Submission', 'Cancel Review Round']) {
                await openWorkflow(wf(M, G.G1.id, rkey(G.G1)), `min-se-g1-before-${slug(name)}`);
                const p = await press(name, `min-se-g1-${slug(name)}`, {stopAtWindow: true});
                const r = {windows: p.windows, onWizard: isWizard(page), absent: p.absent};
                if (p.windows.length) {
                    const t = topWin(page);
                    r.buttons = p.windows[0].buttons;
                    // the first time: the way out ("Cancel"); for Accept also the way through
                    if (name === 'Accept Submission') {
                        const cancel = t.getByRole('button', {name: /^(Cancel|No)$/}).first();
                        if (await cancel.count()) { await cancel.click(); await page.waitForTimeout(600); r.afterCancel = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), dialogs: (await dialogTexts(page)).length}; await snap(page, `min-se-g1-${slug(name)}-after-cancel`); }
                        await openWorkflow(wf(M, G.G1.id, rkey(G.G1)), `min-se-g1-before-${slug(name)}-2`);
                        await press(name, `min-se-g1-${slug(name)}-2`, {stopAtWindow: true});
                        const through = topWin(page).getByRole('button', {name: /Proceed|Yes|Continue|OK/}).first();
                        r.throughName = await through.innerText().catch(() => null);
                        if (await through.count()) { await through.click(); await waitWizard(page); r.through = {onWizard: isWizard(page), url: page.url().replace(/^https?:\/\/[^/]+/, '')}; if (isWizard(page)) { const w = await readWizard(`min-se-g1-${slug(name)}-through-wizard`); r.through.h1 = w.h1; await cancelWizard(`min-se-g1-${slug(name)}-through`); } }
                    } else {
                        const cancel = t.getByRole('button', {name: /^(Cancel|No)$/}).first();
                        if (await cancel.count()) { await cancel.click(); await page.waitForTimeout(600); } else await closeTop(page);
                    }
                } else if (isWizard(page)) {
                    const w = await readWizard(`min-se-g1-${slug(name)}-wizard`); r.h1 = w.h1;
                    await cancelWizard(`min-se-g1-${slug(name)}`);
                }
                out.g1Buttons[name] = r;
                log(`[min g1 ${name}]`, JSON.stringify(r).slice(0, 500));
            }
            sc.minOut = out; save();
            // G0: no reviewer at all
            out.g0 = brief(await openWorkflow(wf(M, G.G0.id, rkey(G.G0)), 'min-se-g0'));
            // GE: External Review, the same setting
            out.ge = brief(await openWorkflow(wf(M, G.GE.id, rkey(G.GE)), 'min-se-ge'));
            const pe = await press('Accept Submission', 'min-se-ge-accept', {stopAtWindow: true});
            out.geAccept = {windows: pe.windows, onWizard: isWizard(page)};
            if (pe.windows.length) await topWin(page).getByRole('button', {name: /^(Cancel|No)$/}).first().click().catch(() => {}); else if (isWizard(page)) await cancelWizard('min-se-ge-accept');
            // G2: confirm both submitted reviews on screen, then the minimum is met
            out.g2Before = brief(await openWorkflow(wf(M, G.G2.id, rkey(G.G2)), 'min-se-g2-before'));
            if (!sc.minG2Confirmed) {
                const dlg = page.locator('[role="dialog"]:visible').first();
                for (let n = 0; n < 2; n++) {
                    const rows = dlg.getByRole('table', {name: /Reviewers/}).locator('tbody tr').filter({hasText: 'Review Submitted'});
                    if (!(await rows.count())) break;
                    await rows.first().getByRole('button', {name: 'Read Review', exact: true}).click(); await idle(page);
                    const modal = page.getByRole('dialog', {name: /Review Details/}).last();
                    await modal.waitFor({timeout: 30000});
                    await page.waitForFunction(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => x.innerText.trim() === 'Modify Review'); return b && !b.disabled; }, null, {timeout: 30000}).catch(() => {});
                    await idle(page);
                    const mark = modal.getByRole('button', {name: 'Mark as Complete', exact: true});
                    await loc(page, 'Review Details: "Mark as Complete"', mark);
                    await mark.click(); await idle(page);
                    const confirm = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'});
                    await confirm.waitFor({timeout: 30000});
                    await confirm.getByRole('button', {name: 'Mark as Complete', exact: true}).click(); await idle(page);
                    await page.getByText('The review has been marked as complete.').first().waitFor({timeout: 30000}).catch(() => {});
                    await page.waitForTimeout(500);
                    const closeBtn = modal.locator('button:visible, a:visible').filter({hasText: /^\s*(Cancel|Close)\s*$/}).last();
                    if (await closeBtn.count()) { await closeBtn.click().catch(() => {}); await idle(page); }
                    await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length <= 1, null, {timeout: 15000}).catch(() => {});
                    await page.waitForTimeout(800); await idle(page);
                }
                sc.minG2Confirmed = true; save();
            }
            out.g2Confirmed = brief(await openWorkflow(wf(M, G.G2.id, rkey(G.G2)), 'min-se-g2-confirmed'));
            const pa = await press('Accept Submission', 'min-se-g2-accept', {stopAtWindow: true});
            out.g2Accept = {windows: pa.windows, onWizard: isWizard(page)};
            if (pa.windows.length) await topWin(page).getByRole('button', {name: /^(Cancel|No)$/}).first().click().catch(() => {}); else if (isWizard(page)) await cancelWizard('min-se-g2-accept');
            // the minimum met on Internal Review, then sent to External Review on screen: does its minimum count the internal reviews?
            if (!sc.minG2Sent) {
                await openWorkflow(wf(M, G.G2.id, rkey(G.G2)), 'min-se-g2-before-send');
                const ps = await press('Send to External Review', 'min-se-g2-send');
                if (ps.onWizard) { out.g2Send = await walkAndRecord('min-se-g2-send'); sc.minG2Sent = true; save(); }
            }
            const ext = await openWorkflow(wf(M, G.G2.id), 'min-se-g2-after-send');
            const extRound = (lastSubmission && lastSubmission.reviewRounds || []).find((r) => r.stageId === 3);
            if (extRound) {
                out.g2Ext = brief(await openWorkflow(wf(M, G.G2.id, `workflow_3_${extRound.id}`), 'min-se-g2-external-round1'));
                const px = await press('Accept Submission', 'min-se-g2-external-accept', {stopAtWindow: true});
                out.g2ExtAccept = {windows: px.windows, onWizard: isWizard(page)};
                if (px.windows.length) await topWin(page).getByRole('button', {name: /^(Cancel|No)$/}).first().click().catch(() => {}); else if (isWizard(page)) await cancelWizard('min-se-g2-external-accept');
            } else out.g2Ext = {noExternalRound: true, after: brief(ext)};
            // the default end on the main press (minimum 0): RA as se, "Accept Submission" pressed
            await as(A, 'se');
            out.a0 = brief(await openWorkflow(wf(A, As.RA.id, rkey(As.RA)), 'min-a-se-ra'));
            const p0 = await press('Accept Submission', 'min-a-se-ra-accept', {stopAtWindow: true});
            out.a0Accept = {windows: p0.windows, onWizard: isWizard(page)};
            if (p0.windows.length) await topWin(page).getByRole('button', {name: /^(Cancel|No)$/}).first().click().catch(() => {}); else if (isWizard(page)) await cancelWizard('min-a-se-ra-accept');
            sc.minOut = out; save();
            record('min-summary', out);
            log('[min]', JSON.stringify(out).slice(0, 6000));
        });

        // ---- mode: "Default Review Mode" (press R)
        if (on('mode')) await sect('mode', async () => {
            const R = sc.R.t; const out = {};
            const Rs = sc.R.subs;
            await as(R, 'au');
            out.m0AuthorBefore = brief(await openWorkflow(authorWf(R, Rs.M0.id, rkey(Rs.M0)), 'mode-au-m0-before'));
            await as(R, 'se');
            out.m0SeBefore = brief(await openWorkflow(wf(R, Rs.M0.id, rkey(Rs.M0)), 'mode-se-m0-before'));
            await as(R, 'mgr');
            if (!Rs.M1) {
                await gotoSetup(R);
                out.before = await readSetup();
                await snap(page, 'mode-mgr-setup-before', {form: out.before});
                await setupPanel().getByRole('radio', {name: 'Open', exact: true}).check();
                out.save = await saveSetup(R, 'mode-mgr-setup-open');
                const ir = (rs) => ({stage: 'internal', reviewers: rs.map(([n, st]) => ({username: `${R}${n}`, status: st}))});
                const mk = async (sk, body) => { const s = await app.api.createSubmission({tag: `${R}${sk.toLowerCase()}`, context: R, submitter: `${R}au`, title: `K4 ${sk} ${R}`, participants: [{username: `${R}se`, role: 'sectionEditor'}], ...body}); Rs[sk] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save(); };
                await mk('M1', {decisions: ['sendInternalReview'], reviewRounds: [ir([['ri1', 'completed']])]});
                await mk('M2', {decisions: ['sendInternalReview'], reviewRounds: [ir([])]});
            }
            // the Add Reviewer form's review type, as it opens, on M2 (a request made on screen after "Open")
            await as(R, 'se');
            await openWorkflow(wf(R, Rs.M2.id, rkey(Rs.M2)), 'mode-se-m2-before-add');
            const {info, dlg} = await addReviewerWindow('mode-se-m2-add-reviewer', {closeAfter: false});
            out.addWindow = info && info.panels;
            if (dlg) {
                const entry = dlg.locator('.listPanel__item').filter({hasText: 'Ian Internalone'}).first();
                await page.waitForFunction(() => { const ta = document.querySelector('textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 30000}).catch(() => {});
                if (await entry.count()) {
                    await entry.getByRole('button', {name: /Select/}).first().click(); await idle(page);
                    const formEl = dlg.locator('#regularReviewerForm');
                    await formEl.waitFor({state: 'visible', timeout: 30000}).catch(() => {});
                    await page.waitForTimeout(600);
                    out.reviewMethod = await formEl.locator('input[name="reviewMethod"]').evaluateAll((els) => els.map((i) => { const l = document.querySelector(`label[for="${i.id}"]`) || i.closest('label'); return `${l ? l.innerText.trim() : i.value}${i.checked ? ' [x]' : ''}`; })).catch(() => null);
                    await snap(page, 'mode-se-m2-add-reviewer-form', {reviewMethod: out.reviewMethod});
                    await loc(page, 'Add Reviewer form: "reviewMethod" radios', formEl.locator('input[name="reviewMethod"]'));
                    await page.waitForFunction(() => { const ta = document.querySelector('#regularReviewerForm textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 30000}).catch(() => {});
                    await formEl.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
                    await formEl.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                    await idle(page); await page.waitForTimeout(800);
                    out.m2After = brief(await openWorkflow(wf(R, Rs.M2.id, rkey(Rs.M2)), 'mode-se-m2-after-add'));
                } else { out.noEntry = true; await dlg.getByRole('button', {name: 'Close'}).first().click().catch(() => {}); }
            }
            // the author's view: M0 (seeded before "Open"), M1 (after, completed), M2 (after, invited on screen)
            await as(R, 'au');
            out.m0Author = brief(await openWorkflow(authorWf(R, Rs.M0.id, rkey(Rs.M0)), 'mode-au-m0-after'));
            out.m1Author = brief(await openWorkflow(authorWf(R, Rs.M1.id, rkey(Rs.M1)), 'mode-au-m1'));
            const rr = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Read Review', exact: true}).first();
            await loc(page, 'author view: Reviewers "Read Review"', rr);
            out.m1ReadReview = await rr.count();
            out.m2Author = brief(await openWorkflow(authorWf(R, Rs.M2.id, rkey(Rs.M2)), 'mode-au-m2'));
            record('mode-summary', out);
            log('[mode]', JSON.stringify(out).slice(0, 5000));
        });

        // ---- mode0: the default end of "Default Review Mode": the Add Reviewer form's review type on the main press (AP), not submitted
        if (on('mode0')) await sect('mode0', async () => {
            const out = {};
            await as(A, 'se');
            await openWorkflow(wf(A, As.AP.id, rkey(As.AP)), 'mode0-se-ap-before-add');
            const {dlg} = await addReviewerWindow('mode0-se-ap-add-reviewer', {closeAfter: false});
            if (dlg) {
                await page.waitForFunction(() => { const ta = document.querySelector('textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 30000}).catch(() => {});
                const entry = dlg.locator('.listPanel__item').filter({hasText: 'Ina Internaltwo'}).first();
                if (await entry.count()) {
                    await entry.getByRole('button', {name: /Select/}).first().click(); await idle(page);
                    const formEl = dlg.locator('#regularReviewerForm');
                    await formEl.waitFor({state: 'visible', timeout: 30000}).catch(() => {});
                    await page.waitForTimeout(600);
                    out.reviewMethod = await formEl.locator('input[name="reviewMethod"]').evaluateAll((els) => els.map((i) => { const l = document.querySelector(`label[for="${i.id}"]`) || i.closest('label'); return `${l ? l.innerText.trim() : i.value}${i.checked ? ' [x]' : ''}`; })).catch(() => null);
                    await snap(page, 'mode0-se-ap-add-reviewer-form', {reviewMethod: out.reviewMethod});
                }
                const n0 = dialogsSeen.length;
                await dlg.getByRole('button', {name: 'Close'}).first().click().catch(() => {});
                await page.waitForTimeout(900);
                out.closeDialogs = dialogsSeen.slice(n0);
                out.after = brief(await openWorkflow(wf(A, As.AP.id, rkey(As.AP)), 'mode0-se-ap-after-close'));
            }
            record('mode0-summary', out);
            log('[mode0]', JSON.stringify(out).slice(0, 1500));
        });

        // ---- sugg: "Reviewer Suggestion at Submission" (press S)
        if (on('sugg')) await sect('sugg', async () => {
            const S = sc.S.t; const Ss = sc.S.subs; const out = {};
            if (!Ss.S1) {
                await as(S, 'mgr');
                await gotoSetup(S);
                out.before = await readSetup();
                await snap(page, 'sugg-mgr-setup-before', {form: out.before});
                const b = setupPanel().locator('input[name="reviewerSuggestionEnabled"]');
                if (!(await b.isChecked())) await b.click();
                out.save = await saveSetup(S, 'sugg-mgr-setup-on');
                const sug = (n) => [{givenName: 'Xavier', familyName: `Suggested${n}`, email: `${S}x${n}@mail.test`}, {givenName: 'Ian', familyName: 'Internalone', email: `${S}ri1@mail.test`}];
                const mk = async (sk, body) => { const s = await app.api.createSubmission({tag: `${S}${sk.toLowerCase()}`, context: S, submitter: `${S}au`, title: `K4 ${sk} ${S}`, participants: [{username: `${S}se`, role: 'sectionEditor'}, {username: `${S}fc`, role: 'funding'}], ...body}); Ss[sk] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save(); };
                await mk('S1', {decisions: ['sendInternalReview'], reviewRounds: [{stage: 'internal', reviewers: []}], reviewerSuggestions: sug(1)});
                await mk('S2', {decisions: ['skipInternalReview'], reviewRounds: [{stage: 'external', reviewers: []}], reviewerSuggestions: sug(2)});
            }
            for (const who of ['mgr', 'ed', 'se', 'fc', 'admin']) {
                await as(S, who);
                out[`S1 ${who}`] = brief(await openWorkflow(wf(S, Ss.S1.id, rkey(Ss.S1)), `sugg-${who}-s1`));
                out[`S1 ${who} headings`] = (await wfInfo(page)).headings;
                const w = await addReviewerWindow(`sugg-${who}-s1-add-reviewer`);
                out[`S1 ${who} add`] = w.info && (w.info.panels || []).map((p) => ({title: p.title, items: p.items.map((i) => i.lines.slice(0, 3).join(' / ')), buttons: p.items.map((i) => i.buttons)}));
                if (w.absent) out[`S1 ${who} add`] = 'no Add Reviewer';
            }
            await as(S, 'mgr');
            out['S2 mgr'] = brief(await openWorkflow(wf(S, Ss.S2.id, rkey(Ss.S2)), 'sugg-mgr-s2'));
            out['S2 mgr headings'] = (await wfInfo(page)).headings;
            const w2 = await addReviewerWindow('sugg-mgr-s2-add-reviewer');
            out['S2 mgr add'] = w2.info && (w2.info.panels || []).map((p) => ({title: p.title, items: p.items.map((i) => i.lines.slice(0, 3).join(' / '))}));
            // the default end: the main press (setting off), RA, Add Reviewer as se
            await as(A, 'se');
            await openWorkflow(wf(A, As.RA.id, rkey(As.RA)), 'sugg-a-se-ra');
            const w0 = await addReviewerWindow('sugg-a-se-ra-add-reviewer');
            out['A RA se add'] = w0.info && (w0.info.panels || []).map((p) => ({title: p.title, items: p.items.length}));
            // the suggestion's own control in the internal window (what it does), as mgr on S1
            await as(S, 'mgr');
            await openWorkflow(wf(S, Ss.S1.id, rkey(Ss.S1)), 'sugg-mgr-s1-before-select');
            const w3 = await addReviewerWindow('sugg-mgr-s1-add-reviewer-2', {closeAfter: false});
            if (w3.dlg) {
                const panel = w3.dlg.locator('.listPanel').filter({hasText: 'Select a Reviewer from Reviewer Suggestions'}).first();
                const item = panel.locator('.listPanel__item').filter({hasText: 'Ian Internalone'}).first();
                const b = item.locator('button').first();
                out.suggItemButton = await b.innerText().catch(() => null);
                if (await b.count()) {
                    await loc(page, 'Add Reviewer: a suggestion row button (Internal Review)', b);
                    await b.click(); await idle(page); await page.waitForTimeout(800);
                    const d = (await dialogTexts(page)).slice(-1)[0];
                    out.afterSuggButton = d && {name: d.name, text: flat(d.text, 1500), buttons: d.buttons.map((x) => x.t).slice(0, 30)};
                    await snap(page, 'sugg-mgr-s1-after-suggestion-button', {win: out.afterSuggButton});
                }
                await w3.dlg.getByRole('button', {name: 'Close'}).first().click().catch(() => {});
            }
            record('sugg-summary', out);
            log('[sugg]', JSON.stringify(out).slice(0, 6000));
        });

        // ---- guide: "Internal Review Guidelines" (press G)
        if (on('guide')) await sect('guide', async () => {
            const G = sc.G.t; const Gs = sc.G.subs; const out = {};
            await as(G, 'se');
            out.seBefore = brief(await openWorkflow(wf(G, Gs.GB.id, rkey(Gs.GB)), 'guide-se-gb-before'));
            await as(G, 'ri1');
            out.ri1Before = await reviewerSteps(G, Gs.GB.id, 'guide-ri1-before');
            await as(G, 'mgr');
            await gotoGuidance(G);
            out.guidanceBefore = await readGuidance();
            await snap(page, 'guide-mgr-guidance-before', {g: out.guidanceBefore});
            const body = page.frameLocator('iframe[id^="reviewerGuidance-internalReviewGuidelines-control"]').first().locator('body');
            await loc(page, 'Reviewer Guidance: "Internal Review Guidelines" editor', page.locator('iframe[id^="reviewerGuidance-internalReviewGuidelines-control"]'));
            await body.click(); await body.fill(`K4 INTERNAL guidelines ${G}`);
            await page.locator('#reviewerGuidance').getByRole('button', {name: 'Save', exact: true}).click();
            await page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 30000}).catch(() => {});
            await page.waitForTimeout(800);
            out.saveStatus = await page.locator('#reviewerGuidance [role="status"]').allInnerTexts().catch(() => []);
            await snap(page, 'guide-mgr-guidance-saved');
            await page.reload(); await gotoGuidance(G);
            out.guidanceAfter = await readGuidance();
            await snap(page, 'guide-mgr-guidance-reloaded', {g: out.guidanceAfter});
            await as(G, 'se');
            out.seAfter = brief(await openWorkflow(wf(G, Gs.GB.id, rkey(Gs.GB)), 'guide-se-gb-after'));
            out.seSame = JSON.stringify(out.seBefore) === JSON.stringify(out.seAfter);
            await as(G, 'ri1');
            out.ri1After = await reviewerSteps(G, Gs.GB.id, 'guide-ri1-after');
            await as(G, 'ri2');
            out.ri2After = await reviewerSteps(G, Gs.GB.id, 'guide-ri2-after');
            await as(G, 'rv1');
            out.rv1After = await reviewerSteps(G, Gs.GX.id, 'guide-rv1-external');
            await as(G, 'au');
            out.auAfter = brief(await openWorkflow(authorWf(G, Gs.GB.id, rkey(Gs.GB)), 'guide-au-gb-after'));
            // the default end on the main press (empty): ri1 on GA
            await as(A, 'ri1');
            out.aRi1 = await reviewerSteps(A, As.GA.id, 'guide-a-ri1-default');
            record('guide-summary', out);
            log('[guide]', JSON.stringify(out).slice(0, 6000));
        });

        // ---- tmpl: "Internal Review Stage" templates (press T)
        if (on('tmpl')) await sect('tmpl', async () => {
            const T = sc.T.t; const Ts = sc.T.subs; const out = sc.tmplOut || {};
            await as(T, 'mgr');
            if (!sc.T.templatesAdded) {
                await gotoTemplates(T);
                out.before = await readTemplates();
                await snap(page, 'tmpl-mgr-before', {templates: out.before});
                const {TaskTemplatesTab} = require('../../../pages/TasksDiscussionsPages.js');
                const tab = new TaskTemplatesTab(page, T);
                out.groups = await tab.groupLabels().catch(() => null);
                const stage = (out.groups || []).find((g) => /Internal Review/i.test(g)) || 'Internal Review Stage';
                for (const [name, auto] of [['K4 auto internal', true], ['K4 manual internal', false]]) {
                    const win = await tab.openAdd(stage);
                    await win.nameField().fill(name);
                    await win.typeMessage(`K4 template text ${name}`);
                    if (auto) { await loc(page, 'Template window: auto-add box', win.autoAddBox()); await win.autoAddBox().check({force: true}); }
                    const d = (await dialogTexts(page)).slice(-1)[0];
                    await snap(page, `tmpl-mgr-add-${slug(name)}`, {win: d && {text: flat(d.text, 1200), inputs: d.inputs}});
                    await win.saveExpectClosed().catch((e) => log('[tmpl save]', String(e.message).slice(0, 200)));
                    await page.waitForTimeout(800);
                }
                await gotoTemplates(T);
                out.after = await readTemplates();
                await snap(page, 'tmpl-mgr-after', {templates: out.after});
                sc.T.templatesAdded = true; save();
            }
            if (!Ts.T1) {
                const mk = async (sk, body) => { const s = await app.api.createSubmission({tag: `${T}${sk.toLowerCase()}`, context: T, submitter: `${T}au`, title: `K4 ${sk} ${T}`, participants: [{username: `${T}se`, role: 'sectionEditor'}], ...body}); Ts[sk] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save(); };
                await mk('T1', {files: [{file: 'article.pdf'}]});
                await mk('T2', {decisions: ['sendInternalReview', 'newInternalReviewRound'], reviewRounds: [{stage: 'internal', reviewers: [{username: `${T}ri1`, status: 'completed'}]}]});
            }
            const panelOf = async () => page.locator('[role="dialog"]:visible').first().locator('[data-cy="discussion-manager"]').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 800))).catch(() => []);
            await as(T, 'se');
            out.t1Sub = brief(await openWorkflow(wf(T, Ts.T1.id, 'workflow_1'), 'tmpl-se-t1-submission'));
            out.t1SubPanel = await panelOf();
            if (!sc.T.t1Sent) {
                const p = await press('Send to Internal Review', 'tmpl-se-t1-send');
                if (p.onWizard) { out.t1Send = await walkAndRecord('tmpl-se-t1-send'); sc.T.t1Sent = true; save(); } else out.t1SendPress = p;
            }
            await openWorkflow(wf(T, Ts.T1.id), 'tmpl-se-t1-after-send');
            const r1 = (lastSubmission && lastSubmission.reviewRounds || []).find((r) => r.stageId === 2);
            if (r1) { Ts.T1.rounds = [{id: r1.id, stageId: 2, round: 1}]; save(); }
            out.t1Round = brief(await openWorkflow(wf(T, Ts.T1.id, rkey(Ts.T1)), 'tmpl-se-t1-round1'));
            out.t1Panel = await panelOf();
            await page.reload(); await idle(page); await page.waitForTimeout(800);
            out.t1PanelReload = await panelOf();
            await as(T, 'mgr');
            await openWorkflow(wf(T, Ts.T1.id, rkey(Ts.T1)), 'tmpl-mgr-t1-round1');
            out.t1PanelMgr = await panelOf();
            // T2: seeded after the templates, two internal rounds
            await as(T, 'se');
            out.t2Round1 = brief(await openWorkflow(wf(T, Ts.T2.id, rkey(Ts.T2, 0)), 'tmpl-se-t2-round1'));
            out.t2Round1Panel = await panelOf();
            out.t2Round2 = brief(await openWorkflow(wf(T, Ts.T2.id, rkey(Ts.T2, 1)), 'tmpl-se-t2-round2'));
            out.t2Round2Panel = await panelOf();
            await as(T, 'mgr');
            await openWorkflow(wf(T, Ts.T2.id, rkey(Ts.T2, 1)), 'tmpl-mgr-t2-round2');
            out.t2Round2PanelMgr = await panelOf();
            if (!sc.T.t2Cancelled) {
                const p = await press('Cancel Review Round', 'tmpl-mgr-t2-cancel-round');
                if (p.onWizard) { out.t2Cancel = await walkAndRecord('tmpl-mgr-t2-cancel-round'); sc.T.t2Cancelled = true; save(); } else out.t2CancelPress = p;
            }
            out.t2AfterCancel = brief(await openWorkflow(wf(T, Ts.T2.id), 'tmpl-mgr-t2-after-cancel'));
            out.t2AfterCancelPanel = await panelOf();
            out.t2AfterCancelRound1 = brief(await openWorkflow(wf(T, Ts.T2.id, rkey(Ts.T2, 0)), 'tmpl-mgr-t2-after-cancel-round1'));
            out.t2AfterCancelRound1Panel = await panelOf();
            // the default end: the main press (no template), AU round 1
            await as(A, 'mgr');
            await openWorkflow(wf(A, As.AU.id, rkey(As.AU)), 'tmpl-a-mgr-au-round1');
            out.aPanel = await panelOf();
            sc.tmplOut = out; save();
            record('tmpl-summary', out);
            log('[tmpl]', JSON.stringify(out).slice(0, 6000));
        });

        // ---- roles: the "Stage Assignment" boxes and the stage's "Assign" (press L)
        if (on('roles')) await sect('roles', async () => {
            const L = sc.L.t; const L1 = sc.L.subs.L1; const out = sc.rolesOut || {};
            const u = wf(L, L1.id, rkey(L1));
            await as(L, 'mgr');
            await gotoRoles(L);
            out.gridBefore = await readGrid();
            await snap(page, 'roles-mgr-grid-before', {grid: out.gridBefore});
            await openWorkflow(u, 'roles-mgr-l1-before');
            out.assignBefore = await assignWindow('roles-mgr-l1-assign-before');
            await openWorkflow(wf(L, L1.id, 'workflow_1'), 'roles-mgr-l1-submission-before');
            out.assignSubmissionBefore = await assignWindow('roles-mgr-l1-submission-assign-before');
            if (!sc.L.changed) {
                await gotoRoles(L);
                let e = await openRoleEdit('Funding coordinator');
                out.fcFormBefore = await readRoleForm(e.form);
                out.fcBox = await setStageBox(e.form, 'Internal Review', false);
                out.fcSave = await roleFormOK(e.form, 'roles-mgr-fc-untick');
                await gotoRoles(L);
                e = await openRoleEdit('Copyeditor');
                out.ceFormBefore = await readRoleForm(e.form);
                out.ceBox = await setStageBox(e.form, 'Internal Review', true);
                out.ceSave = await roleFormOK(e.form, 'roles-mgr-ce-tick');
                sc.L.changed = true; save();
            }
            await gotoRoles(L);
            out.gridAfter = await readGrid();
            await snap(page, 'roles-mgr-grid-after', {grid: out.gridAfter});
            for (const r of ['Funding coordinator', 'Copyeditor']) {
                const e = await openRoleEdit(r);
                if (e.form) { out[`form after ${r}`] = await readRoleForm(e.form); await e.form.getByRole('link', {name: 'Cancel', exact: true}).or(e.form.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {}); await page.waitForTimeout(700); }
                await gotoRoles(L);
            }
            await openWorkflow(u, 'roles-mgr-l1-after');
            out.linesAfter = await participantsLines();
            out.assignAfter = await assignWindow('roles-mgr-l1-assign-after');
            await openWorkflow(wf(L, L1.id, 'workflow_1'), 'roles-mgr-l1-submission-after');
            out.assignSubmissionAfter = await assignWindow('roles-mgr-l1-submission-assign-after');
            // the Funding coordinator already assigned on L1, after the untick
            await as(L, 'fc');
            out.fcView = brief(await openWorkflow(u, 'roles-fc-l1-after'));
            out.fcSubmissionView = brief(await openWorkflow(wf(L, L1.id, 'workflow_1'), 'roles-fc-l1-submission-after'));
            sc.rolesOut = out; save();
            record('roles-summary', out);
            log('[roles]', JSON.stringify(out).slice(0, 6000));
        });

        // ---- verify: a second, fresh run of the facts that correct the spec (press V), plus the unsaved exits
        if (on('verify')) await sect('verify', async () => {
            const out = sc.verifyOut || {};
            if (!sc.V) {
                const t = tag('u71k4v');
                const person = (n, roles, g, f) => ({username: `${t}${n}`, roles, givenName: g, familyName: f});
                await app.api.createContext({tag: t, context: {name: `K4 V ${t}`, contactName: `Principal Contact ${t}`, contactEmail: `${t}contact@mail.test`},
                    users: [person('mgr', ['manager'], 'Maya', 'Managerson'), person('se', ['sectionEditor'], 'Sam', 'Decider'), person('sr1', ['sectionEditor'], 'Remy', 'Recommender'),
                        person('fc', ['funding'], 'Fran', 'Funder'), person('au', ['author'], 'Alex', 'Authorson'), person('ri1', ['internalReviewer'], 'Ian', 'Internalone')]});
                sc.V = {t, subs: {}}; save();
                const mk = async (sk, body) => { const s = await app.api.createSubmission({tag: `${t}${sk.toLowerCase()}`, context: t, submitter: `${t}au`, title: `K4 ${sk} ${t}`, ...body}); sc.V.subs[sk] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save(); };
                const ir = {stage: 'internal', reviewers: [{username: `${t}ri1`, status: 'invited'}]};
                await mk('V1', {decisions: ['sendInternalReview'], reviewRounds: [ir], participants: [{username: `${t}se`, role: 'sectionEditor'}, {username: `${t}sr1`, role: 'sectionEditor', recommendOnly: true}]});
                await mk('V3', {decisions: ['sendInternalReview'], reviewRounds: [ir], participants: [{username: `${t}se`, role: 'sectionEditor'}, {username: `${t}fc`, role: 'funding'}]});
            }
            const V = sc.V.t; const Vs = sc.V.subs;
            // 1. a recommendation recorded while a reviewer is still invited
            const u1 = wf(V, Vs.V1.id, rkey(Vs.V1));
            await as(V, 'au'); out.v1AuBefore = brief(await openWorkflow(authorWf(V, Vs.V1.id, rkey(Vs.V1)), 'verify-au-v1-before'));
            await as(V, 'sr1'); out.v1Sr1Before = brief(await openWorkflow(u1, 'verify-sr1-v1-before'));
            if (!sc.V.recorded) {
                const p = await press('Recommend Accept', 'verify-sr1-v1-accept');
                if (p.onWizard) { out.v1Record = await walkAndRecord('verify-sr1-v1-accept'); sc.V.recorded = true; save(); }
            }
            const a = await readTwice(u1, 'verify-sr1-v1'); out.v1Sr1 = {after: brief(a.after), reload: brief(a.reload)};
            await as(V, 'se'); const b = await readTwice(u1, 'verify-se-v1'); out.v1Se = {after: brief(b.after), reload: brief(b.reload)};
            await as(V, 'au'); out.v1Au = brief(await openWorkflow(authorWf(V, Vs.V1.id, rkey(Vs.V1)), 'verify-au-v1-after'));
            await as(V, 'ri1');
            await page.goto(cu(V, '/dashboard/reviewAssignments')); await idle(page); await page.waitForTimeout(600);
            const rs = await snap(page, 'verify-ri1-assignments');
            out.ri1List = flat(rs.text && rs.text.main, 600);
            // 2. the stage's "Assign" and the Funding coordinator's box, untick then tick again
            await as(V, 'mgr');
            const u3 = wf(V, Vs.V3.id, rkey(Vs.V3));
            await openWorkflow(u3, 'verify-mgr-v3-before');
            out.v3LinesBefore = await participantsLines();
            out.v3Assign = await assignWindow('verify-mgr-v3-assign');
            await as(V, 'fc'); out.v3FcBefore = brief(await openWorkflow(u3, 'verify-fc-v3-before'));
            await as(V, 'mgr');
            for (const [step, want] of [['untick', false], ['retick', true]]) {
                await gotoRoles(V);
                const e = await openRoleEdit('Funding coordinator');
                out[`fc ${step} box`] = await setStageBox(e.form, 'Internal Review', want);
                out[`fc ${step} save`] = (({status, toasts}) => ({status, toasts}))(await roleFormOK(e.form, `verify-mgr-fc-${step}`));
                await openWorkflow(u3, `verify-mgr-v3-after-${step}`);
                out[`v3 lines after ${step}`] = await participantsLines();
                await as(V, 'fc'); out[`v3 fc after ${step}`] = brief(await openWorkflow(u3, `verify-fc-v3-after-${step}`));
                out[`v3 fc after ${step} text`] = flat((await wfInfo(page)).text, 300);
                await as(V, 'mgr');
            }
            // 3. unsaved exits: Settings › Workflow › Review (tabs), and a role's "Edit" window
            await gotoSetup(V);
            const minBox = setupPanel().locator('input[name="numReviewsPerSubmission"]');
            await minBox.fill('3');
            const n0 = dialogsSeen.length;
            await page.getByRole('tab', {name: 'Reviewer Guidance', exact: true}).click(); await idle(page); await page.waitForTimeout(500);
            out.tabSwitchDialogs = dialogsSeen.slice(n0);
            await page.getByRole('tab', {name: 'Setup', exact: true}).first().click(); await idle(page); await page.waitForTimeout(500);
            out.valueAfterTabs = await minBox.inputValue();
            await snap(page, 'verify-mgr-setup-unsaved-after-tabs', {value: out.valueAfterTabs});
            const n1 = dialogsSeen.length;
            await page.goto(cu(V, '/dashboard/editorial')); await idle(page);
            out.leaveDialogs = dialogsSeen.slice(n1);
            await gotoSetup(V);
            out.valueAfterLeave = await minBox.inputValue();
            await snap(page, 'verify-mgr-setup-after-leave', {value: out.valueAfterLeave});
            await gotoRoles(V);
            const e = await openRoleEdit('Series editor');
            await setStageBox(e.form, 'Production', false);
            const n2 = dialogsSeen.length;
            await e.form.getByRole('link', {name: 'Cancel', exact: true}).or(e.form.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
            await page.waitForTimeout(900);
            out.roleCancelDialogs = dialogsSeen.slice(n2);
            out.roleFormOpenAfterCancel = await page.locator('form#userGroupForm').count();
            await gotoRoles(V);
            out.seriesRowAfter = (await readGrid()).rows.find((r) => r.name === 'Series editor');
            await snap(page, 'verify-mgr-roles-after-cancel', {row: out.seriesRowAfter});
            // 4. an auto-added template, a second time: who sees the item; "Cancel Review Round" on round 2
            const panelOf = async () => page.locator('[role="dialog"]:visible').first().locator('[data-cy="discussion-manager"]').evaluateAll((els) => els.map((x) => x.innerText.replace(/\s+/g, ' ').trim().slice(0, 600))).catch(() => []);
            if (!sc.V.template) {
                await gotoTemplates(V);
                const {TaskTemplatesTab} = require('../../../pages/TasksDiscussionsPages.js');
                const tab = new TaskTemplatesTab(page, V);
                const win = await tab.openAdd('Internal Review Stage');
                await win.nameField().fill('K4 verify auto');
                await win.typeMessage('K4 verify template text');
                await win.autoAddBox().check({force: true});
                await win.saveExpectClosed().catch((err) => log('[verify tmpl save]', String(err.message).slice(0, 200)));
                await gotoTemplates(V);
                out.templates = await readTemplates();
                sc.V.template = true; save();
                const mk = async (sk, body) => { const s = await app.api.createSubmission({tag: `${V}${sk.toLowerCase()}`, context: V, submitter: `${V}au`, title: `K4 ${sk} ${V}`, participants: [{username: `${V}se`, role: 'sectionEditor'}], ...body}); Vs[sk] = {id: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save(); };
                await mk('V5', {decisions: ['sendInternalReview', 'newInternalReviewRound'], reviewRounds: [{stage: 'internal', reviewers: [{username: `${V}ri1`, status: 'completed'}]}]});
                await mk('V6', {files: [{file: 'article.pdf'}]});
            }
            await as(V, 'se');
            if (!sc.V.v6Sent) {
                await openWorkflow(wf(V, Vs.V6.id, 'workflow_1'), 'verify-se-v6-submission');
                const p = await press('Send to Internal Review', 'verify-se-v6-send');
                if (p.onWizard) { await walkAndRecord('verify-se-v6-send'); sc.V.v6Sent = true; save(); }
            }
            out.v6Se = brief(await openWorkflow(wf(V, Vs.V6.id), 'verify-se-v6-internal'));
            out.v6SePanel = await panelOf();
            await as(V, 'mgr');
            out.v6Mgr = brief(await openWorkflow(wf(V, Vs.V6.id), 'verify-mgr-v6-internal'));
            out.v6MgrPanel = await panelOf();
            out.v5MgrBefore = await (async () => { await openWorkflow(wf(V, Vs.V5.id, rkey(Vs.V5, 1)), 'verify-mgr-v5-round2'); return panelOf(); })();
            if (!sc.V.v5Cancelled) {
                const p = await press('Cancel Review Round', 'verify-mgr-v5-cancel');
                if (p.onWizard) { await walkAndRecord('verify-mgr-v5-cancel'); sc.V.v5Cancelled = true; save(); }
            }
            out.v5MgrAfter = await (async () => { await openWorkflow(wf(V, Vs.V5.id), 'verify-mgr-v5-after-cancel'); return panelOf(); })();
            sc.verifyOut = out; save();
            record('verify-summary', out);
            log('[verify]', JSON.stringify(out).slice(0, 6000));
        });
    } finally {
        record('browser-dialogs', dialogsSeen);
        await close();
    }
});
