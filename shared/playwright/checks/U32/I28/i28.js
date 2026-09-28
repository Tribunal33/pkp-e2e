// U32 claim check, chunk I28: the housekeeping session's incidental rows for the copyediting spec.
// Chunk: .reports/hk28/chunks/U32.md (incidentals L62 clause c, L147).
//
// L62c (OJS, OMP): what "OK" in the Copyediting lists' "Upload/Select Files" window reports, against the review
// round's "Review files updated." (U26 Rule 8). A scratch context `f` with ed (Journal/Press editor, manager-level),
// se (Section/Series editor), ce (Copyeditor), au:
//   C1  a submission file; accepted from review (seed); ed, se, ce assigned → as ed: Draft Files tick (a file from
//       the Submission stage) + OK; Draft Files upload + tick + OK; Copyedited Files tick (the draft copy) + OK;
//       Copyedited Files upload + tick + OK. Each: the page notices after OK, the list and the notice box on the
//       same page and after a reload. Sweep: a tick left by "Cancel" (dialogs on the way out).
//   C2  the same seed → as se: Draft Files tick + OK, Copyedited Files tick + OK; as ce: Copyedited upload + OK.
//   R1  a submission file; in review, round 1 with a file (seed) → control: as ed and as se, the round's
//       "Upload/Select Files" tick + OK ("Review files updated.").
// L147 (OMP; OJS control): the Copyediting notice box after "Accept Submission" recorded on screen. A scratch press
// `n` with ed, se, ce, au, ri1 (internal reviewer), rv1 (external reviewer):
//   I1  Internal Review round 1 with a file, ri1 completed; ed, se → "Accept Submission" as ed; Copyediting read by
//       ed and se, on landing and after a reload; sweep (on I1, X1 and J1): "Assign" a Copyeditor with "Request Copyedit" (the notice
//       on the same page and after a reload).
//   I2  seeded sendInternalReview + acceptFromInternal (the seeded end of the axis); ed → Copyediting read.
//   X1  External Review round 1 with a file, rv1 completed; ed, se → control: "Accept Submission"; the notice.
//   OJS J1 review round 1, rv1 completed; ed, se → control: "Accept Submission"; the notice.
//   S1  (both apps) seeded skipExternalReview (A6's path) → the Assign sweep's comparison; the se read after it.
// OPS: the read-only control (a preprint's workflow menu).
//
//   RUN=r1 PROBE_FEATURE=U32 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U32/I28/i28.js
//   RUN=r2 …  (the second, independent run: its own scratch contexts and facts names)
//   PHASES=files,notice,ops (default all)
'use strict';

const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const PDF = fs.readFileSync(path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf'));
const RUN = process.env.RUN || 'r1';
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ['files', 'notice', 'ops'];
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(`[${RUN}]`, ...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const pdfNamed = (name) => ({name, mimeType: 'application/pdf', buffer: PDF});
const facts = {};
const fact = (app, k, v) => { facts[k] = v; log(app.name, k, typeof v === 'string' ? v : JSON.stringify(v)); };

async function sect(name, fn) {
    try { await fn(); } catch (e) { log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); record(`${RUN}-${name}-FAILED`, {error: String(e.stack || e).slice(0, 1500)}); }
}
async function snap(page, name, extra) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
    if (extra) Object.assign(s, extra);
    record(`${RUN}-${name}`, s);
    await shot(page, `${RUN}-${name}`).catch(() => {});
    return s;
}
const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
// The workflow dialog: headings, tables, the notice box, decision buttons.
const wfInfo = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const dlgs = [...document.querySelectorAll('[role=dialog]')].filter(vis);
    const root = dlgs[0] || document.body;
    const hs = [...root.querySelectorAll('h1,h2,h3,h4')].filter(vis);
    const tables = [...root.querySelectorAll('table')].filter(vis).map((t) => ({
        name: (t.getAttribute('aria-labelledby') && document.getElementById(t.getAttribute('aria-labelledby'))?.innerText.trim()) || t.getAttribute('aria-label') || null,
        rows: [...t.querySelectorAll('tbody tr')].filter(vis).map((tr) => tr.innerText.trim().replace(/\s+/g, ' ').slice(0, 220)),
    }));
    const noteH = hs.find((x) => /^Notification$/.test(x.innerText.trim()));
    const text = root.innerText;
    const actionRegion = root.querySelector('[data-cy="workflow-action-items"]');
    return {
        dialogCount: dlgs.length,
        headings: hs.map((h) => h.innerText.trim()).filter(Boolean).slice(0, 40),
        noticeBox: noteH ? (noteH.parentElement.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 300) : null,
        assignCopyeditor: /Assign a copyeditor using the Assign link in the Participants list\./.test(text),
        awaitingCopyedits: /Awaiting Copyedits\./.test(text),
        tables,
        actionButtons: actionRegion ? [...actionRegion.querySelectorAll('button, a')].filter(vis).map((b) => b.innerText.trim().replace(/\s+/g, ' ')) : null,
    };
});
const dialogTexts = (page) => page.locator('[role="dialog"]:visible').evaluateAll((els) =>
    els.map((d) => ({
        name: d.getAttribute('aria-label') || (d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.innerText) || null,
        text: d.innerText.slice(0, 4000),
    }))).catch(() => []);
const topWin = (page) => page.locator('[role="dialog"]:visible').last();
// The legacy select window as data.
const windowGrid = (page) => topWin(page).evaluate((d) => {
    const vis = (e) => e.getClientRects().length > 0;
    const title = [...d.querySelectorAll('h1,h2')].filter(vis).map((h) => h.innerText.trim()).filter(Boolean);
    const rows = [...d.querySelectorAll('table tr')].filter(vis).map((tr) => {
        const cb = tr.querySelector('input[type=checkbox]');
        return `${cb ? (cb.checked ? '[x] ' : '[ ] ') : '# '}${tr.innerText.trim().replace(/\s+/g, ' ').slice(0, 140)}`;
    }).filter((r) => r.length > 3);
    const links = [...d.querySelectorAll('a, button')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 30);
    return {title, rows, links};
}).catch((e) => ({error: String(e.message)}));

forEachApp(async (app) => {
    for (const k of Object.keys(facts)) delete facts[k];
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const ctxUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const wf = (ctx, id, key) => ctxUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const rkey = (r) => `workflow_${r.stageId}_${r.id}`;
    const {page, close} = await launch(app);
    const nativeDialogs = [];
    page.on('dialog', async (d) => { nativeDialogs.push({type: d.type(), message: d.message(), url: page.url()}); await d.accept().catch(() => {}); });
    const signInAs = async (ctx, u) => { await signIn(page, u, {contextPath: ctx}); await idle(page); };

    async function openWorkflow(url, label) {
        await page.goto(url); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(400);
        const s = await snap(page, label);
        const info = await wfInfo(page).catch((e) => ({error: String(e.message)}));
        record(`${RUN}-${label}-info`, info);
        return {info, notices: s.notices};
    }
    async function reloadRead(label) {
        await page.reload(); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(400);
        const s = await snap(page, label);
        const info = await wfInfo(page).catch((e) => ({error: String(e.message)}));
        record(`${RUN}-${label}-info`, info);
        return {info, notices: s.notices};
    }
    const lists = (info) => Object.fromEntries((info.tables || []).map((t) => [t.name, t.rows]));
    const box = (info) => ({noticeBox: info.noticeBox, assignCopyeditor: info.assignCopyeditor, awaitingCopyedits: info.awaitingCopyedits});

    // ---- the select window ----
    async function openSelect(nth, label) {
        const btns = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload/Select Files', exact: true});
        await loc(page, `${label}: "Upload/Select Files" (nth ${nth})`, btns.nth(nth));
        await btns.nth(nth).click(); await idle(page);
        await topWin(page).locator('table').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && !/Loading/.test(d.innerText) && d.innerText.length > 20; }, null, {timeout: 20000}).catch(() => {});
        await idle(page); await page.waitForTimeout(300);
        const names = (await dialogTexts(page)).map((d) => d.name);
        const grid = await windowGrid(page);
        const s = await snap(page, `${label}-window`, {grid, dialogNames: names});
        return {names, grid, notices: s.notices};
    }
    async function showAll(label) {
        const all = topWin(page).getByRole('checkbox', {name: /Show files from all accessible workflow stages/});
        await loc(page, `${label}: "Show files from all accessible workflow stages."`, all);
        if (!(await all.count())) return null;
        await all.check(); await idle(page); await page.waitForTimeout(800); await idle(page);
        const grid = await windowGrid(page);
        await snap(page, `${label}-window-showall`, {grid});
        return grid;
    }
    async function tick(fileText, label, {group} = {}) {
        let rows = topWin(page).locator('tr').filter({hasText: fileText}).filter({has: page.locator('input[type=checkbox]')});
        const n = await rows.count();
        const row = rows.last();
        const cb = row.locator('input[type=checkbox]').first();
        await loc(page, `${label}: the tick box of "${fileText}"`, cb);
        await cb.check({force: true}); await idle(page);
        return {matches: n, checked: await cb.isChecked()};
    }
    // "OK" (or "Cancel") in the select window; the page notices it raised, then the workflow read on the same page.
    async function closeSelect(how, label) {
        const win = topWin(page);
        await snap(page, `${label}-before-${how}`); // resets the page's notice baseline
        const n0 = nativeDialogs.length;
        let ctl = how === 'ok' ? win.getByRole('button', {name: 'OK', exact: true}).last() : win.locator('a:visible, button:visible').filter({hasText: /^\s*Cancel\s*$/}).last();
        await loc(page, `${label}: the window's ${how === 'ok' ? '"OK"' : '"Cancel"'}`, ctl);
        await ctl.click(); await idle(page);
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length <= 1, null, {timeout: 20000}).catch(() => {});
        await page.waitForTimeout(700); await idle(page);
        const toastNow = await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => []);
        const s = await snap(page, `${label}-after-${how}`);
        const info = await wfInfo(page).catch(() => ({}));
        record(`${RUN}-${label}-after-${how}-info`, info);
        return {notices: s.notices, toastNow: toastNow.map((t) => flat(t, 200)), dialogsOnTheWayOut: nativeDialogs.slice(n0), dialogsLeft: (await dialogTexts(page)).length, lists: lists(info), box: box(info)};
    }
    // The window's "Upload File" link → the three-step wizard → back in the window.
    async function uploadInWindow(fname, label) {
        const win = topWin(page);
        const up = win.getByRole('link', {name: /^\s*Upload (File|Review File)\s*$/}).first();
        const upText = flat(await up.innerText().catch(() => null), 60);
        await loc(page, `${label}: the window's upload link ("${upText}")`, up);
        await up.click(); await idle(page);
        const wiz = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
        await wiz.locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000});
        await idle(page);
        const wizTitle = (await dialogTexts(page)).slice(-1)[0];
        const genre = wiz.locator('select[id^="genreId"]');
        if (await genre.count()) {
            const opts = await genre.locator('option').evaluateAll((els) => els.map((o) => [o.value, o.textContent.trim()]));
            const pick = opts.find(([v]) => v);
            if (pick) await genre.selectOption(pick[0]);
        }
        await wiz.locator('input[type="file"]').setInputFiles(pdfNamed(fname));
        await page.waitForFunction(() => { const w = [...document.querySelectorAll('[role=dialog]')].pop(); const b = w && [...w.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Continue'); return b && !b.disabled; }, null, {timeout: 30000}).catch(() => {});
        const cont = wiz.getByRole('button', {name: 'Continue', exact: true});
        await cont.click();
        await wiz.getByRole('tab', {name: /2\. Review Details/}).waitFor({timeout: 30000}).catch(() => {}); await idle(page);
        await cont.click();
        await wiz.getByRole('tab', {name: /3\. Confirm/}).waitFor({timeout: 30000}).catch(() => {}); await idle(page);
        await snap(page, `${label}-wizard-step3`);
        await wiz.getByRole('button', {name: 'Complete', exact: true}).click();
        await wiz.waitFor({state: 'detached', timeout: 30000}).catch(() => {});
        await idle(page);
        await topWin(page).locator('tr').filter({hasText: fname}).first().waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(500);
        const grid = await windowGrid(page);
        const s = await snap(page, `${label}-window-after-upload`, {grid});
        return {upText, wizardTitle: wizTitle && wizTitle.name, notices: s.notices, grid: grid.rows};
    }

    try {
        // ------------------------------------------------------------------ OPS: the read-only control
        if (isOPS) {
            if (!on('ops')) return;
            await sect('ops', async () => {
                const t = tag('u32i28o');
                await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`}, users: [
                    {username: `${t}mgr`, roles: ['manager']}, {username: `${t}au`, roles: ['author']}]});
                const s = await app.api.createSubmission({tag: `${t}p`, context: t, submitter: `${t}au`});
                await signInAs(t, `${t}mgr`);
                await openWorkflow(wf(t, s.submissionId), 'ops-mgr-workflow');
                const menu = await page.locator('[role="dialog"]:visible').first().locator('nav a, nav button').allInnerTexts().catch(() => []);
                const upl = await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload/Select Files', exact: true}).count();
                fact(app, 'ops-workflow', {menu: menu.map((m) => flat(m, 60)).filter(Boolean), uploadSelectButtons: upl});
                await signOut(page);
            });
            return;
        }

        // ------------------------------------------------------------------ L62c: the save notices of the select windows
        if (on('files')) await sect('files', async () => {
            const t = tag('u32i28f');
            const u = (k) => `${t}${k}`;
            await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`}, users: [
                {username: u('ed'), roles: ['editor'], givenName: 'Eda', familyName: 'Editorson'},
                {username: u('se'), roles: ['sectionEditor'], givenName: 'Sean', familyName: 'Sectioned'},
                {username: u('ce'), roles: ['copyeditor'], givenName: 'Cora', familyName: 'Copyeditor'},
                {username: u('au'), roles: ['author'], givenName: 'Alex', familyName: 'Authorson'},
            ]});
            const parts = [{username: u('ed'), role: 'editor'}, {username: u('se'), role: 'sectionEditor'}, {username: u('ce'), role: 'copyeditor'}];
            const send = isOMP ? ['skipInternalReview'] : ['sendExternalReview'];
            const stage = isOMP ? {stage: 'external'} : {};
            const subs = {};
            const seed = async (key, body) => {
                try {
                    const s = await app.api.createSubmission({tag: `${t}${key.toLowerCase()}`, context: t, submitter: u('au'), title: `${key} files ${t}`, files: [{file: 'article.pdf'}], participants: parts, ...body});
                    subs[key] = {id: s.submissionId, rounds: s.reviewRounds, stageId: s.stageId};
                    log(`[seed ${key}] #${s.submissionId} stage ${s.stageId} rounds ${JSON.stringify(s.reviewRounds)}`);
                } catch (e) { fact(app, `seed-${key}-refused`, flat(e.message, 400)); }
            };
            await seed('C1', {decisions: [...send, 'accept'], reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: []}]});
            await seed('C2', {decisions: [...send, 'accept'], reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: []}]});
            await seed('R1', {decisions: send, reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: []}]});
            record(`${RUN}-files-seed`, {t, subs});

            // C1 as ed: the four saves
            if (subs.C1) await sect('C1-ed', async () => {
                const S = subs.C1;
                await signInAs(t, u('ed'));
                const land = await openWorkflow(wf(t, S.id, 'workflow_4'), 'c1-ed-landing');
                fact(app, 'c1-ed-landing', {box: box(land.info), lists: lists(land.info)});
                // 1. Draft Files: tick the Submission stage's file, OK
                const w1 = await openSelect(0, 'c1-ed-draft-tick');
                const sa = await showAll('c1-ed-draft-tick');
                const tk = await tick('article.pdf', 'c1-ed-draft-tick');
                const ok1 = await closeSelect('ok', 'c1-ed-draft-tick');
                fact(app, 'c1-ed-draft-tick-ok', {windowTitle: w1.names, showAll: sa && sa.rows, tick: tk, ...ok1});
                const r1 = await reloadRead('c1-ed-draft-tick-reload');
                fact(app, 'c1-ed-draft-tick-reload', {box: box(r1.info), lists: lists(r1.info)});
                // sweep: a tick left by Cancel
                await openSelect(0, 'c1-ed-draft-cancel');
                await showAll('c1-ed-draft-cancel');
                await tick('notes.md', 'c1-ed-draft-cancel');
                const cx = await closeSelect('cancel', 'c1-ed-draft-cancel');
                fact(app, 'c1-ed-draft-tick-cancel', cx);
                // 2. Draft Files: upload + tick + OK
                const w2 = await openSelect(0, 'c1-ed-draft-upload');
                const up2 = await uploadInWindow(`u32i28-draft-${RUN}.pdf`, 'c1-ed-draft-upload');
                await tick(`u32i28-draft-${RUN}.pdf`, 'c1-ed-draft-upload');
                const ok2 = await closeSelect('ok', 'c1-ed-draft-upload');
                fact(app, 'c1-ed-draft-upload-ok', {windowTitle: w2.names, upload: up2, ...ok2});
                // 3. Copyedited Files: tick the draft copy, OK
                const w3 = await openSelect(1, 'c1-ed-copyed-tick');
                const tk3 = await tick('article.pdf', 'c1-ed-copyed-tick');
                const ok3 = await closeSelect('ok', 'c1-ed-copyed-tick');
                fact(app, 'c1-ed-copyed-tick-ok', {windowTitle: w3.names, grid: w3.grid.rows, tick: tk3, ...ok3});
                const r3 = await reloadRead('c1-ed-copyed-tick-reload');
                fact(app, 'c1-ed-copyed-tick-reload', {box: box(r3.info), lists: lists(r3.info)});
                // 4. Copyedited Files: upload + tick + OK
                const w4 = await openSelect(1, 'c1-ed-copyed-upload');
                const up4 = await uploadInWindow(`u32i28-copyed-${RUN}.pdf`, 'c1-ed-copyed-upload');
                await tick(`u32i28-copyed-${RUN}.pdf`, 'c1-ed-copyed-upload');
                const ok4 = await closeSelect('ok', 'c1-ed-copyed-upload');
                fact(app, 'c1-ed-copyed-upload-ok', {windowTitle: w4.names, upload: up4, ...ok4});
                const r4 = await reloadRead('c1-ed-copyed-upload-reload');
                fact(app, 'c1-ed-copyed-upload-reload', {box: box(r4.info), lists: lists(r4.info)});
                await signOut(page);
            });

            // C2 as se (tick + OK on both lists), then ce (Copyedited upload + OK)
            if (subs.C2) await sect('C2-se', async () => {
                const S = subs.C2;
                await signInAs(t, u('se'));
                const land = await openWorkflow(wf(t, S.id, 'workflow_4'), 'c2-se-landing');
                fact(app, 'c2-se-landing', {box: box(land.info), lists: lists(land.info)});
                await openSelect(0, 'c2-se-draft-tick');
                await showAll('c2-se-draft-tick');
                await tick('article.pdf', 'c2-se-draft-tick');
                fact(app, 'c2-se-draft-tick-ok', await closeSelect('ok', 'c2-se-draft-tick'));
                await openSelect(1, 'c2-se-copyed-tick');
                await tick('article.pdf', 'c2-se-copyed-tick');
                fact(app, 'c2-se-copyed-tick-ok', await closeSelect('ok', 'c2-se-copyed-tick'));
                const r = await reloadRead('c2-se-copyed-tick-reload');
                fact(app, 'c2-se-copyed-tick-reload', {box: box(r.info), lists: lists(r.info)});
                await signOut(page);
            });
            if (subs.C2) await sect('C2-ce', async () => {
                const S = subs.C2;
                await signInAs(t, u('ce'));
                const land = await openWorkflow(wf(t, S.id, 'workflow_4'), 'c2-ce-landing');
                fact(app, 'c2-ce-landing', {box: box(land.info), lists: lists(land.info), uploadSelect: await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Upload/Select Files', exact: true}).count()});
                const w = await openSelect(1, 'c2-ce-copyed-upload');
                const up = await uploadInWindow(`u32i28-ce-${RUN}.pdf`, 'c2-ce-copyed-upload');
                await tick(`u32i28-ce-${RUN}.pdf`, 'c2-ce-copyed-upload');
                fact(app, 'c2-ce-copyed-upload-ok', {windowTitle: w.names, upload: up, ...(await closeSelect('ok', 'c2-ce-copyed-upload'))});
                await signOut(page);
            });

            // R1 control: the review round's window, as ed and as se
            if (subs.R1) for (const who of ['ed', 'se']) await sect(`R1-${who}`, async () => {
                const S = subs.R1;
                const round = S.rounds[S.rounds.length - 1];
                await signInAs(t, u(who));
                await openWorkflow(wf(t, S.id, rkey(round)), `r1-${who}-round`);
                const w = await openSelect(0, `r1-${who}-review`);
                await showAll(`r1-${who}-review`);
                const tk = await tick('article.pdf', `r1-${who}-review`);
                fact(app, `r1-${who}-review-ok`, {windowTitle: w.names, tick: tk, ...(await closeSelect('ok', `r1-${who}-review`))});
                await signOut(page);
            });
        });

        // ------------------------------------------------------------------ L147: the notice after an on-screen accept
        if (on('notice')) await sect('notice', async () => {
            const t = tag('u32i28n');
            const u = (k) => `${t}${k}`;
            const users = [
                {username: u('ed'), roles: ['editor'], givenName: 'Eve', familyName: 'Editorial'},
                {username: u('se'), roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Sectioned'},
                {username: u('ce'), roles: ['copyeditor'], givenName: 'Cato', familyName: 'Copyeditor'},
                {username: u('au'), roles: ['author'], givenName: 'Alex', familyName: 'Authorson'},
                {username: u('rv1'), roles: ['externalReviewer'], givenName: 'Rita', familyName: 'Externalrev'},
            ];
            if (isOMP) users.push({username: u('ri1'), roles: ['internalReviewer'], givenName: 'Ian', familyName: 'Internalrev'});
            await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`}, users});
            const parts = [{username: u('ed'), role: 'editor'}, {username: u('se'), role: 'sectionEditor'}];
            const subs = {};
            const seed = async (key, body) => {
                try {
                    const s = await app.api.createSubmission({tag: `${t}${key.toLowerCase()}`, context: t, submitter: u('au'), title: `${key} notice ${t}`, files: [{file: 'article.pdf'}], participants: parts, ...body});
                    subs[key] = {id: s.submissionId, rounds: s.reviewRounds, stageId: s.stageId};
                    log(`[seed ${key}] #${s.submissionId} stage ${s.stageId} rounds ${JSON.stringify(s.reviewRounds)}`);
                } catch (e) { fact(app, `seed-${key}-refused`, flat(e.message, 400)); }
            };
            if (isOMP) {
                await seed('I1', {decisions: ['sendInternalReview'], reviewRounds: [{stage: 'internal', files: [{file: 'notes.md'}], reviewers: [{username: u('ri1'), status: 'completed'}]}]});
                await seed('I2', {decisions: ['sendInternalReview', 'acceptFromInternal'], reviewRounds: [{stage: 'internal', files: [{file: 'notes.md'}], reviewers: [{username: u('ri1'), status: 'completed'}]}]});
                await seed('X1', {decisions: ['skipInternalReview'], reviewRounds: [{stage: 'external', files: [{file: 'notes.md'}], reviewers: [{username: u('rv1'), status: 'completed'}]}]});
            } else {
                await seed('J1', {decisions: ['sendExternalReview'], reviewRounds: [{files: [{file: 'notes.md'}], reviewers: [{username: u('rv1'), status: 'completed'}]}]});
            }
            // A6's path (accepted without review), for the Assign sweep's comparison
            await seed('S1', {decisions: ['skipExternalReview']});
            record(`${RUN}-notice-seed`, {t, subs});

            // Press a decision button and walk its wizard to "Record Decision".
            async function accept(S, label) {
                const round = S.rounds[S.rounds.length - 1];
                await openWorkflow(wf(t, S.id, rkey(round)), `${label}-round`);
                const btn = page.locator('[role="dialog"]:visible').first().locator('[data-cy="workflow-action-items"]').getByRole('button', {name: 'Accept Submission', exact: true}).first();
                await loc(page, `${label}: "Accept Submission"`, btn);
                if (!(await btn.count())) return {absent: true};
                await btn.click();
                await page.waitForURL(/decision\/record/, {timeout: 30000}).catch(() => {});
                const pages = [];
                for (let n = 1; n < 7; n++) {
                    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                    await idle(page); await page.waitForTimeout(300);
                    const s = await snap(page, `${label}-wizard-p${n}`);
                    pages.push(flat((s.text && (s.text.main || '')) || '', 160));
                    const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
                    if (await rec.isVisible().catch(() => false)) break;
                    const cont = page.getByRole('button', {name: 'Continue', exact: true}).first();
                    if (!(await cont.isVisible().catch(() => false))) break;
                    await cont.click(); await idle(page);
                }
                const rec = page.getByRole('button', {name: 'Record Decision', exact: true}).first();
                await loc(page, `${label}: "Record Decision"`, rec);
                await rec.click(); await idle(page);
                await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog]')].some((e) => e.getClientRects().length), null, {timeout: 30000}).catch(() => {});
                await page.waitForTimeout(800); await idle(page);
                const closing = (await dialogTexts(page)).slice(-1)[0];
                await snap(page, `${label}-recorded`);
                return {pages: pages.length, closing: closing && {name: closing.name, text: flat(closing.text, 300)}};
            }
            async function readCopyediting(S, label) {
                const a = await openWorkflow(wf(t, S.id, 'workflow_4'), `${label}-landing`);
                const b = await reloadRead(`${label}-reload`);
                return {landing: box(a.info), reload: box(b.info), headings: a.info.headings && a.info.headings.slice(0, 12), actions: a.info.actionButtons};
            }

            const keys = isOMP ? ['I1', 'X1'] : ['J1'];
            for (const key of keys) {
                const S = subs[key];
                if (!S) continue;
                await sect(`${key}`, async () => {
                    await signInAs(t, u('ed'));
                    fact(app, `${key}-accept`, await accept(S, `${key.toLowerCase()}-ed-accept`));
                    fact(app, `${key}-ed-copyediting`, await readCopyediting(S, `${key.toLowerCase()}-ed-copyediting`));
                    await signOut(page);
                    await signInAs(t, u('se'));
                    fact(app, `${key}-se-copyediting`, await readCopyediting(S, `${key.toLowerCase()}-se-copyediting`));
                    await signOut(page);
                });
            }
            if (subs.I2) await sect('I2', async () => {
                await signInAs(t, u('ed'));
                fact(app, 'I2-ed-copyediting', await readCopyediting(subs.I2, 'i2-ed-copyediting'));
                await signOut(page);
            });
            // Sweep: "Assign" a Copyeditor with "Request Copyedit" — does "Awaiting Copyedits." come on this path?
            // I1 (internal accept) against the controls X1 (external accept) and J1 (OJS).
            for (const K of (isOMP ? ['I1', 'X1', 'S1'] : ['J1', 'S1'])) if (subs[K]) await sect(`${K}-assign`, async () => {
                const S = subs[K];
                const k = K.toLowerCase();
                await signInAs(t, u('ed'));
                const before = await openWorkflow(wf(t, S.id, 'workflow_4'), `${k}-ed-before-assign`);
                fact(app, `${K}-ed-before-assign`, box(before.info));
                const btn = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Assign', exact: true}).first();
                await loc(page, `${K}: Participants "Assign"`, btn);
                await btn.click(); await idle(page);
                const modal = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
                const groupSel = modal.locator('select[name="filterUserGroupId"]');
                await groupSel.waitFor({timeout: 30000}); await idle(page);
                const opts = await groupSel.locator('option').evaluateAll((els) => els.map((o) => ({text: o.text.trim(), value: o.value})));
                const g = opts.find((o) => /Copyeditor/i.test(o.text));
                if (g) { await groupSel.selectOption(g.value); await idle(page); }
                // the people grid starts empty: "Search User By Name" + "Search" (StageParticipantsPages.search)
                await modal.getByRole('textbox', {name: 'Search User By Name'}).fill('Cato');
                const fetched = page.waitForResponse((r) => r.url().includes('fetch-grid'), {timeout: 30000}).catch(() => null);
                await modal.getByRole('button', {name: 'Search', exact: true}).click();
                await fetched; await idle(page);
                const row = modal.locator('tr').filter({has: page.locator('input[name="userId"]')}).filter({hasText: 'Cato'}).first();
                await row.waitFor({timeout: 20000}).catch(() => {});
                await loc(page, `${K}: the Assign form's person radio (row "Cato")`, row.locator('input[name="userId"]'));
                await row.locator('input[name="userId"]').click().catch(() => {});
                await idle(page);
                const tmplSel = modal.locator('select[name="template"], select[id^="template"]').first();
                const topts = await tmplSel.locator('option').evaluateAll((els) => els.map((o) => ({text: o.text.trim(), value: o.value}))).catch(() => []);
                const tt = topts.find((o) => /^Request Copyedit$/.test(o.text));
                if (tt) {
                    await tmplSel.selectOption(tt.value); await idle(page);
                    await page.waitForFunction(() => { const ta = [...document.querySelectorAll('[role=dialog] textarea[name="message"], [role=dialog] textarea[id^="message"]')].pop(); const ed = ta && window.tinymce && window.tinymce.get(ta.id); return ed && ed.getContent().length > 20; }, null, {timeout: 20000}).catch(() => {});
                    await idle(page);
                }
                await snap(page, `${k}-ed-assign-form-filled`, {groups: opts.map((o) => o.text), templates: topts.map((o) => o.text)});
                await modal.getByRole('button', {name: 'OK', exact: true}).last().click(); await idle(page);
                await modal.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                await page.waitForTimeout(800); await idle(page);
                const same = await wfInfo(page);
                const sameSnap = await snap(page, `${k}-ed-after-assign`);
                const formLeft = (await dialogTexts(page)).length;
                const rl = await reloadRead(`${k}-ed-after-assign-reload`);
                const participants = flat(((await page.locator('[role="dialog"]:visible').first().innerText().catch(() => '')).split(/PARTICIPANTS/i)[1] || ''), 400);
                fact(app, `${K}-ed-after-assign`, {samePage: box(same), notices: sameSnap.notices, dialogsAfterOk: formLeft, reload: box(rl.info), discussions: lists(rl.info)['Copyediting Tasks & Discussions'], participants, template: tt && tt.text, group: g && g.text});
                await signOut(page);
                // the other assigned editor (sub-editor level) after the assignment
                await signInAs(t, u('se'));
                const se = await openWorkflow(wf(t, S.id, 'workflow_4'), `${k}-se-after-assign`);
                fact(app, `${K}-se-after-assign`, box(se.info));
                await signOut(page);
            });
        });

        record(`${RUN}-facts`, facts);
    } finally {
        await close();
    }
});
