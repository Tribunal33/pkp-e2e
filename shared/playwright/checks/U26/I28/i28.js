// U26 claim check, chunk I28: the housekeeping session's incidental rows for the review-stage spec.
// Chunk: .reports/hk28/chunks/U26.md (incidentals L29c and L55).
//
// L29c (OJS, OMP): a file uploaded from the "Files for Review" panel's selection dialog ("Current
// Review Files For Round {N}"): ticked or not when it arrives (Rule 8, register A7). A scratch
// context `f` with ed (Journal/Press editor, manager-level), se (Section/Series editor), au, rv1:
//   R1   round 1: a submission file + "Send for Review" seed; a seeded round file   → the control
//   R2   a submission file; two reviewRounds entries (round 1: a file, rv1 completed) → round 2
//   R2d  decisions send + requestRevisions + newExternalReviewRound                  → round 2 (the row's path)
//   R2s  as R2, driven by se (the other permission level)
// On each: the dialog as it opens; "Upload Review File" through the three-step wizard; the dialog
// read right after (the new row's box, untouched); "OK"; the panel; the dialog reopened; the page
// reloaded and the dialog reopened again. Sweep: the uploaded row's box flipped and the dialog left
// by "Cancel", then reopened; "Show files from all accessible workflow stages." ticked.
//
// L55 (OJS, OMP): the "Round 1 Status" box on a journal/press whose "Minimum Confirmed Reviews
// Required" is 2. A scratch context `m` (review.numReviewsPerSubmission = 2) with ed, se, au,
// rv1..rv3:
//   M1  rv1 completed (submitted, not confirmed)      → the box; "Mark as Complete"; the box (same page, reload)
//   M2  rv1, rv2 completed (the U34 K4 shape)          → the box; confirm one; the box; confirm the other; the box
//   M3  rv3 accepted; the review submitted on screen  → the box before, after, and after "Mark as Complete"
// M1 is also read as se and as au (the author view). A control context `z` (install default 0):
//   Z1  rv1 completed → the box; "Mark as Complete"; the box
// OPS: the read-only control (no review stage, no Review settings tab).
//
//   RUN=r1 PROBE_FEATURE=U26 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U26/I28/i28.js
//   RUN=r2 …  (the second, independent run: its own scratch contexts and facts names)
//   PHASES=files,min,ops,rowctl (default files,min,ops; rowctl is the dialog's row-control sweep, run with RUN=r1 and r2)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const PDF = fs.readFileSync(path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf'));
const RUN = process.env.RUN || 'r1';
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ['files', 'min', 'ops'];
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(`[${RUN}]`, ...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const pdfNamed = (name) => ({name, mimeType: 'application/pdf', buffer: PDF});
const facts = {};
const fact = (app, k, v) => { facts[k] = v; log(app.name, k, typeof v === 'string' ? v : JSON.stringify(v)); };

async function sect(name, fn) {
    try { await fn(); } catch (e) { log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); record(`${RUN}-${name}-FAILED`, {error: String(e.stack || e).slice(0, 1200)}); }
}
async function snap(page, name, extra) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
    if (extra) Object.assign(s, extra);
    record(`${RUN}-${name}`, s);
    await shot(page, `${RUN}-${name}`).catch(() => {});
    return s;
}
// The workflow dialog: its status box (heading + each <p>), its tables, its action buttons.
const wfInfo = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const dlgs = [...document.querySelectorAll('[role=dialog]')].filter(vis);
    const root = dlgs[0] || document.body;
    const hs = [...root.querySelectorAll('h1,h2,h3,h4')].filter(vis);
    const statusH = hs.find((x) => /Status$/.test(x.innerText.trim()));
    const box = statusH ? statusH.closest('div.border') || statusH.parentElement : null;
    const tables = [...root.querySelectorAll('table')].filter(vis).map((t) => ({
        name: (t.getAttribute('aria-labelledby') && document.getElementById(t.getAttribute('aria-labelledby'))?.innerText.trim()) || t.getAttribute('aria-label') || null,
        rows: [...t.querySelectorAll('tbody tr')].filter(vis).map((tr) => tr.innerText.trim().replace(/\s+/g, ' ').slice(0, 220)),
    }));
    const actionRegion = root.querySelector('[data-cy="workflow-action-items"]');
    return {
        dialogCount: dlgs.length,
        status: box ? {heading: statusH.innerText.trim(), lines: [...box.querySelectorAll('p')].map((p) => p.innerText.trim())} : null,
        tables,
        actionButtons: actionRegion ? [...actionRegion.querySelectorAll('button, a')].filter(vis).map((b) => b.innerText.trim().replace(/\s+/g, ' ')) : null,
        menu: [...root.querySelectorAll('nav a, nav button, [role=navigation] a, [role=navigation] button')].filter(vis).map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 30),
    };
});
// The review-files dialog as data: its title, every row's file name and box, the "show all" box, links, buttons.
const filesDlg = (page) => page.getByRole('dialog').filter({hasText: /Current Review Files For Round/});
const filesInfo = (page) => filesDlg(page).last().evaluate((d) => {
    const vis = (e) => e.getClientRects().length > 0;
    const boxes = [...d.querySelectorAll('input[type=checkbox]')];
    return {
        title: [...d.querySelectorAll('h1,h2,h3')].filter(vis).map((h) => h.innerText.trim()).filter(Boolean),
        rows: boxes.filter((b) => b.name && b.name.startsWith('selectedFiles')).map((b) => ({checked: b.checked, visible: vis(b), row: (b.closest('tr')?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 160)})),
        showAll: boxes.filter((b) => !(b.name || '').startsWith('selectedFiles')).map((b) => ({name: b.name, checked: b.checked, label: (b.closest('label') || b.parentElement)?.innerText.trim().slice(0, 120)})),
        emptyRows: [...d.querySelectorAll('tbody.empty, tr.empty, .empty')].filter(vis).map((e) => e.innerText.trim()).filter(Boolean),
        links: [...d.querySelectorAll('a')].filter(vis).map((a) => a.innerText.trim()).filter(Boolean).slice(0, 20),
        buttons: [...d.querySelectorAll('button, input[type=submit]')].filter(vis).map((b) => (b.innerText || b.value || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 20),
        text: d.innerText.slice(0, 2500),
    };
});

forEachApp(async (app) => {
    for (const k of Object.keys(facts)) delete facts[k];
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const ctxUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const workflowUrl = (ctx, id, round) => ctxUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${round ? `&workflowMenuKey=workflow_${round.stageId}_${round.id}` : ''}`);
    const authorUrl = (ctx, id) => ctxUrl(ctx, `/dashboard/mySubmissions?workflowSubmissionId=${id}`);
    const send = isOMP ? ['skipInternalReview'] : ['sendExternalReview'];
    const stage = isOMP ? {stage: 'external'} : {};
    const {page, close} = await launch(app);
    const nativeDialogs = [];
    page.on('dialog', async (d) => { nativeDialogs.push({at: Date.now(), type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
    const signInAs = async (ctx, u) => { await signIn(page, u, {contextPath: ctx}); await idle(page); };

    async function openWorkflow(url, label) {
        await page.goto(url); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => { const d = document.querySelector('[role=dialog]'); return d && /Status/.test(d.innerText); }, null, {timeout: 20000}).catch(() => {});
        await idle(page);
        const s = await snap(page, label);
        const info = await wfInfo(page).catch((e) => ({error: String(e.message)}));
        record(`${RUN}-${label}-info`, info);
        return info;
    }

    try {
        // ------------------------------------------------------------------ OPS: the read-only control
        if (isOPS) {
            if (!on('ops')) return;
            await sect('ops', async () => {
                const t = tag('u26i28o');
                await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`}, users: [
                    {username: `${t}mgr`, roles: ['manager']}, {username: `${t}au`, roles: ['author']}]});
                let refused = null;
                try { await app.api.createContext({tag: `${t}x`, review: {numReviewsPerSubmission: 2}}); } catch (e) { refused = flat(e.message, 300); }
                fact(app, 'ops-review-key', refused || 'accepted');
                const s = await app.api.createSubmission({tag: `${t}p`, context: t, submitter: `${t}au`});
                await signInAs(t, `${t}mgr`);
                const info = await openWorkflow(workflowUrl(t, s.submissionId), 'ops-mgr-workflow');
                fact(app, 'ops-workflow', {status: info.status, menu: info.menu, actions: info.actionButtons});
                await page.goto(ctxUrl(t, '/management/settings/workflow')); await idle(page);
                const st = await snap(page, 'ops-mgr-settings-workflow');
                fact(app, 'ops-settings-workflow-tabs', await page.locator('[role="tab"]').allInnerTexts().then((a) => a.map((x) => x.trim()).filter(Boolean)));
                await signOut(page);
            });
            return;
        }

        // ------------------------------------------------------------------ L29c: the review-files dialog's upload
        if (on('files')) await sect('files', async () => {
            const t = tag('u26i28f');
            const u = (k) => `${t}${k}`;
            await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`}, users: [
                {username: u('ed'), roles: ['editor'], givenName: 'Eda', familyName: 'Editorson'},
                {username: u('se'), roles: ['sectionEditor'], givenName: 'Sean', familyName: 'Sectioned'},
                {username: u('au'), roles: ['author'], givenName: 'Alex', familyName: 'Authorson'},
                {username: u('rv1'), roles: ['externalReviewer'], givenName: 'Rita', familyName: 'Reviewerone'},
            ]});
            const parts = (who) => who.map(([k, role]) => ({username: u(k), role}));
            const subs = {};
            const seed = async (key, body) => {
                try {
                    const s = await app.api.createSubmission({tag: `${t}${key}`, context: t, submitter: u('au'), title: `${key} files ${t}`, ...body});
                    subs[key] = {id: s.submissionId, rounds: s.reviewRounds, title: `${key} files ${t}`};
                    log(`[seed ${key}] #${s.submissionId} rounds ${JSON.stringify(s.reviewRounds)}`);
                } catch (e) { fact(app, `seed-${key}-refused`, flat(e.message, 400)); }
            };
            await seed('R1', {files: [{file: 'article.pdf'}], decisions: send, reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: []}], participants: parts([['ed', 'editor']])});
            await seed('R2', {files: [{file: 'article.pdf'}], decisions: send, reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [{username: u('rv1'), status: 'completed'}]}, {...stage, reviewers: []}], participants: parts([['ed', 'editor']])});
            await seed('R2d', {files: [{file: 'article.pdf'}], decisions: [...send, 'requestRevisions', 'newExternalReviewRound'], reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [{username: u('rv1'), status: 'completed'}]}], participants: parts([['ed', 'editor']])});
            await seed('R2s', {files: [{file: 'article.pdf'}], decisions: send, reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: []}, {...stage, reviewers: []}], participants: parts([['ed', 'editor'], ['se', 'sectionEditor']])});

            async function openFiles(label) {
                await page.getByRole('button', {name: 'Upload/Select Files', exact: true}).first().click();
                const d = filesDlg(page).last();
                await d.getByRole('link', {name: 'Upload Review File'}).waitFor({timeout: 30000});
                await idle(page);
                await page.waitForTimeout(300);
                await snap(page, label);
                const info = await filesInfo(page);
                record(`${RUN}-${label}-info`, info);
                return info;
            }
            async function closeFiles(how = 'Cancel') {
                const d = filesDlg(page).last();
                const c = how === 'OK' ? d.getByRole('button', {name: 'OK', exact: true}) : d.locator('a:visible, button:visible').filter({hasText: /^\s*Cancel\s*$/}).last();
                await c.click();
                await d.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                await idle(page);
                await page.waitForTimeout(600); // the side-modal close window (patterns pitfall 4)
            }
            async function driveOne(key, user) {
                const sub = subs[key];
                if (!sub) return;
                const round = sub.rounds[sub.rounds.length - 1];
                const lab = `files-${key}`;
                const fname = `u26i28-${key}-${RUN}.pdf`;
                await signInAs(t, u(user));
                const before = await openWorkflow(workflowUrl(t, sub.id, round), `${lab}-round`);
                fact(app, `${key}-round-page`, {status: before.status, tables: before.tables});
                // the dialog as it opens
                const opened = await openFiles(`${lab}-dialog-open`);
                fact(app, `${key}-dialog-open`, {title: opened.title, rows: opened.rows, showAll: opened.showAll, empty: opened.emptyRows});
                // upload through "Upload Review File"
                const d = filesDlg(page).last();
                await loc(page, `${key}: "Upload Review File" link in the review-files dialog`, d.getByRole('link', {name: 'Upload Review File'}));
                await d.getByRole('link', {name: 'Upload Review File'}).click();
                const wiz = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
                await wiz.locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000});
                await idle(page);
                const genre = wiz.locator('select[id^="genreId"]');
                if (await genre.count()) {
                    const opts = await genre.locator('option').evaluateAll((els) => els.map((o) => [o.value, o.textContent.trim()]));
                    const pick = opts.find(([v]) => v);
                    if (pick) await genre.selectOption(pick[0]);
                    fact(app, `${key}-wizard-genre`, pick ? pick[1] : null);
                }
                await snap(page, `${lab}-wizard-step1`);
                await wiz.locator('input[type="file"]').setInputFiles(pdfNamed(fname));
                const cont = wiz.getByRole('button', {name: 'Continue', exact: true});
                await page.waitForFunction(() => { const w = [...document.querySelectorAll('[role=dialog]')].pop(); const b = w && [...w.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Continue'); return b && !b.disabled; }, null, {timeout: 30000}).catch(() => {});
                await cont.click();
                await wiz.getByRole('tab', {name: /2\. Review Details/}).waitFor({timeout: 30000}).catch(() => {}); await idle(page);
                await cont.click();
                await wiz.getByRole('tab', {name: /3\. Confirm/}).waitFor({timeout: 30000}).catch(() => {}); await idle(page);
                await snap(page, `${lab}-wizard-step3`);
                await wiz.getByRole('button', {name: 'Complete', exact: true}).click();
                await wiz.waitFor({state: 'detached', timeout: 30000}).catch(() => {});
                await idle(page);
                await filesDlg(page).last().getByRole('row').filter({hasText: fname}).first().waitFor({timeout: 30000}).catch(() => {});
                await idle(page); await page.waitForTimeout(500);
                const afterUp = await filesInfo(page);
                await snap(page, `${lab}-dialog-after-upload`);
                record(`${RUN}-${lab}-dialog-after-upload-info`, afterUp);
                const mine = (info) => (info.rows || []).filter((r) => r.row.includes(fname)).map((r) => r.checked);
                fact(app, `${key}-uploaded-box-right-after`, {uploaded: mine(afterUp), all: afterUp.rows.map((r) => `${r.checked ? '[x]' : '[ ]'} ${flat(r.row, 60)}`)});
                await loc(page, `${key}: the uploaded file's checkbox (row filtered by name)`, filesDlg(page).last().getByRole('row').filter({hasText: fname}).getByRole('checkbox'));
                // OK without touching anything
                await closeFiles('OK');
                const okNotices = (await screen(page)).notices;
                const afterOk = await wfInfo(page);
                await snap(page, `${lab}-after-ok`);
                fact(app, `${key}-after-ok`, {notices: okNotices, filesPanel: afterOk.tables.filter((x) => /Files for Review/.test(x.name || '')).map((x) => x.rows)});
                // reopen on the same page
                const re1 = await openFiles(`${lab}-dialog-reopened`);
                fact(app, `${key}-uploaded-box-reopened`, {uploaded: mine(re1), all: re1.rows.map((r) => `${r.checked ? '[x]' : '[ ]'} ${flat(r.row, 60)}`)});
                // sweep: flip the uploaded row's box and leave by Cancel
                const box = filesDlg(page).last().getByRole('row').filter({hasText: fname}).getByRole('checkbox');
                if (await box.count()) {
                    const was = await box.first().isChecked();
                    await box.first().click();
                    const n0 = nativeDialogs.length;
                    await closeFiles('Cancel');
                    fact(app, `${key}-flip-then-cancel`, {was, nativeDialogsOnTheWayOut: nativeDialogs.slice(n0)});
                    const re2 = await openFiles(`${lab}-dialog-after-cancel`);
                    fact(app, `${key}-uploaded-box-after-cancel`, {uploaded: mine(re2)});
                    // sweep: the "show all" box
                    const all = filesDlg(page).last().getByRole('checkbox', {name: /Show files from all accessible workflow stages/});
                    if (await all.count()) {
                        await all.check(); await idle(page); await page.waitForTimeout(800); await idle(page);
                        const sa = await filesInfo(page);
                        await snap(page, `${lab}-dialog-show-all`);
                        fact(app, `${key}-show-all`, sa.rows.map((r) => `${r.checked ? '[x]' : '[ ]'} ${flat(r.row, 70)}`));
                    }
                    await closeFiles('Cancel');
                }
                // after a reload
                await openWorkflow(workflowUrl(t, sub.id, round), `${lab}-round-reloaded`);
                const re3 = await openFiles(`${lab}-dialog-after-reload`);
                fact(app, `${key}-uploaded-box-after-reload`, {uploaded: mine(re3), all: re3.rows.map((r) => `${r.checked ? '[x]' : '[ ]'} ${flat(r.row, 60)}`)});
                await closeFiles('Cancel');
                await signOut(page);
            }
            await sect('R1', () => driveOne('R1', 'ed'));
            await sect('R2', () => driveOne('R2', 'ed'));
            await sect('R2d', () => driveOne('R2d', 'ed'));
            await sect('R2s', () => driveOne('R2s', 'se'));
        });

        // ------------------------------------------------------------------ sweep: the dialog's row controls
        if (on('rowctl')) await sect('rowctl', async () => {
            const t = tag('u26i28c');
            await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`}, users: [
                {username: `${t}ed`, roles: ['editor']}, {username: `${t}au`, roles: ['author']}]});
            const s = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, files: [{file: 'article.pdf'}], decisions: send,
                reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: []}], participants: [{username: `${t}ed`, role: 'editor'}]});
            await signInAs(t, `${t}ed`);
            await openWorkflow(workflowUrl(t, s.submissionId, s.reviewRounds[0]), 'rowctl-round');
            await page.getByRole('button', {name: 'Upload/Select Files', exact: true}).first().click();
            const d = filesDlg(page).last();
            await d.getByRole('link', {name: 'Upload Review File'}).waitFor({timeout: 30000}); await idle(page);
            const row = d.getByRole('row').filter({hasText: 'notes.md'}).first();
            await loc(page, 'rowctl: the row\'s "Settings" link in the review-files dialog', row.getByRole('link', {name: 'Settings', exact: true}));
            await row.getByRole('link', {name: 'Settings', exact: true}).click(); await idle(page); await page.waitForTimeout(500);
            await snap(page, 'rowctl-after-settings');
            const after = await d.evaluate((el) => {
                const vis = (e) => e.getClientRects().length > 0;
                return {rows: [...el.querySelectorAll('tbody tr')].filter(vis).map((tr) => tr.innerText.trim().replace(/\s+/g, ' ')), links: [...el.querySelectorAll('tbody a')].filter(vis).map((a) => a.innerText.trim() + (a.className ? ` .${a.className.split(' ').join('.')}` : ''))};
            });
            fact(app, 'rowctl-settings-pressed', after);
            // the file name link: a download or not
            const dl = page.waitForEvent('download', {timeout: 15000}).then((x) => x.suggestedFilename()).catch(() => null);
            await row.getByRole('link', {name: 'notes.md', exact: true}).click().catch(() => {});
            fact(app, 'rowctl-name-link', {download: await dl, dialogs: await page.locator('[role=dialog]:visible').count()});
            await snap(page, 'rowctl-after-name-link');
            await signOut(page);
        });

        // ------------------------------------------------------------------ L55: the minimum line
        if (on('min')) await sect('min', async () => {
            const mk = async (prefix, review) => {
                const t = tag(prefix);
                const body = {tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`}, users: [
                    {username: `${t}ed`, roles: ['editor'], givenName: 'Eda', familyName: 'Editorson'},
                    {username: `${t}se`, roles: ['sectionEditor'], givenName: 'Sean', familyName: 'Sectioned'},
                    {username: `${t}au`, roles: ['author'], givenName: 'Alex', familyName: 'Authorson'},
                    {username: `${t}rv1`, roles: ['externalReviewer'], givenName: 'Rita', familyName: 'Reviewerone'},
                    {username: `${t}rv2`, roles: ['externalReviewer'], givenName: 'Rob', familyName: 'Reviewertwo'},
                    {username: `${t}rv3`, roles: ['externalReviewer'], givenName: 'Rae', familyName: 'Reviewerthree'},
                ]};
                if (review) body.review = {numReviewsPerSubmission: review};
                await app.api.createContext(body);
                return t;
            };
            const m = await mk('u26i28m', 2);
            const z = await mk('u26i28z', null);
            const seedSub = async (t, key, reviewers, extraParts = []) => {
                const s = await app.api.createSubmission({tag: `${t}${key.toLowerCase()}`, context: t, submitter: `${t}au`, title: `${key} minimum ${t}`,
                    decisions: send, reviewRounds: [{...stage, reviewers: reviewers.map(([k, st]) => ({username: `${t}${k}`, status: st}))}],
                    participants: [{username: `${t}ed`, role: 'editor'}, ...extraParts.map(([k, r]) => ({username: `${t}${k}`, role: r}))]});
                log(`[seed ${key}] #${s.submissionId}`);
                return {id: s.submissionId, round: s.reviewRounds[0], t};
            };
            const M1 = await seedSub(m, 'M1', [['rv1', 'completed']], [['se', 'sectionEditor']]);
            const M2 = await seedSub(m, 'M2', [['rv1', 'completed'], ['rv2', 'completed']]);
            const M3 = await seedSub(m, 'M3', [['rv3', 'accepted']]);
            const Z1 = await seedSub(z, 'Z1', [['rv1', 'completed']]);

            const readBox = async (sub, label) => {
                const info = await openWorkflow(workflowUrl(sub.t, sub.id, sub.round), label);
                const rev = info.tables ? info.tables.filter((x) => /Reviewer/.test(x.name || '')).map((x) => x.rows) : null;
                fact(app, label, {status: info.status, reviewers: rev});
                return info;
            };
            async function markComplete(label) {
                const dlg = page.locator('[role="dialog"]:visible').first();
                const rows = dlg.getByRole('table', {name: /Reviewers/}).locator('tbody tr').filter({hasText: 'Review Submitted'});
                const row = rows.first();
                const read = row.getByRole('button', {name: 'Read Review', exact: true});
                await loc(page, `${label}: "Read Review"`, read);
                await read.click(); await idle(page);
                const modal = page.getByRole('dialog', {name: /Review Details/}).last();
                await modal.waitFor({timeout: 30000});
                await page.waitForFunction(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => x.innerText.trim() === 'Mark as Complete'); return b && !b.disabled; }, null, {timeout: 30000}).catch(() => {});
                await idle(page);
                await snap(page, `${label}-review-details`);
                await modal.getByRole('button', {name: 'Mark as Complete', exact: true}).click(); await idle(page);
                const confirm = page.locator('[data-cy="dialog"], [role="dialog"]').filter({hasText: 'Mark this review as complete?'}).last();
                await confirm.waitFor({timeout: 30000});
                await snap(page, `${label}-confirm`);
                await confirm.getByRole('button', {name: 'Mark as Complete', exact: true}).click(); await idle(page);
                await page.getByText('The review has been marked as complete.').first().waitFor({timeout: 30000}).catch(() => {});
                const n = (await screen(page)).notices;
                await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length <= 1, null, {timeout: 15000}).catch(() => {});
                if ((await page.locator('[role=dialog]:visible').count()) > 1) {
                    const c = page.getByRole('dialog', {name: /Review Details/}).last().locator('button:visible, a:visible').filter({hasText: /^\s*(Cancel|Close)\s*$/}).last();
                    if (await c.count()) { await c.click().catch(() => {}); await idle(page); }
                }
                await page.waitForTimeout(800); await idle(page);
                // the workflow header shows "Refreshing data" while it refetches the submission; read after it
                await page.waitForFunction(() => { const d = document.querySelector('[role=dialog]'); return d && !/Refreshing data/.test(d.innerText); }, null, {timeout: 20000}).catch(() => {});
                await idle(page);
                const info = await wfInfo(page);
                await snap(page, `${label}-same-page`);
                fact(app, `${label}-same-page`, {notices: n, status: info.status, reviewers: info.tables.filter((x) => /Reviewer/.test(x.name || '')).map((x) => x.rows)});
            }

            // M1: one submitted, not confirmed; the editor, the section editor, the author
            await signInAs(m, `${m}ed`);
            await sect('M1', async () => {
                await readBox(M1, 'min-M1-ed-submitted');
                await markComplete('min-M1-ed-confirm');
                await readBox(M1, 'min-M1-ed-confirmed-reloaded');
            });
            // M2: two submitted (the U34 K4 shape), confirmed one at a time
            await sect('M2', async () => {
                await readBox(M2, 'min-M2-ed-two-submitted');
                await markComplete('min-M2-ed-confirm-1');
                await readBox(M2, 'min-M2-ed-one-confirmed-reloaded');
                await markComplete('min-M2-ed-confirm-2');
                await readBox(M2, 'min-M2-ed-two-confirmed-reloaded');
            });
            await sect('M3-before', () => readBox(M3, 'min-M3-ed-accepted'));
            await signOut(page);
            // M1 as the section editor (assigned) and as the author (before any confirm on M1? M1 is confirmed now: read anyway)
            await sect('M1-se', async () => { await signInAs(m, `${m}se`); await readBox(M1, 'min-M1-se-confirmed'); await signOut(page); });
            // M3: the review submitted on the reviewer's own page
            await sect('M3-review', async () => {
                await signInAs(m, `${m}rv3`);
                await page.goto(ctxUrl(m, `/reviewer/submission/${M3.id}`)); await idle(page);
                await snap(page, 'min-M3-rv3-step');
                const vis = (l) => l.filter({visible: true});
                const acceptBtn = vis(page.getByRole('button', {name: /Accept Review, Continue to Step #2/}));
                const saveBtn = vis(page.getByRole('button', {name: 'Save and continue', exact: true}));
                const privacy = vis(page.locator('input[name="privacyConsent"]'));
                if (await privacy.count()) await privacy.first().check();
                if (await acceptBtn.count()) await acceptBtn.first().click(); else if (await saveBtn.count()) await saveBtn.first().click();
                await idle(page);
                const s3 = vis(page.getByRole('button', {name: 'Continue to Step #3'}));
                await s3.first().waitFor({timeout: 30000}).catch(() => {});
                if (await s3.count()) { await s3.first().click(); await idle(page); }
                const submitBtn = vis(page.getByRole('button', {name: 'Submit Review', exact: true}));
                await submitBtn.first().waitFor({timeout: 30000});
                await page.waitForFunction(() => { const e = window.tinymce && window.tinymce.get().find((x) => /^comments/.test(x.id) && !/Private/.test(x.id)); return e && e.initialized; }, null, {timeout: 30000}).catch(() => {});
                const body = page.frameLocator('iframe[id^="comments"]:not([id^="commentsPrivate"])').first().locator('body');
                await body.click(); await body.pressSequentially('Review typed on screen for U26 I28.');
                const rec = vis(page.locator('select[name="reviewerRecommendationId"]'));
                if (await rec.count()) { const o = await rec.first().locator('option').evaluateAll((els) => els.map((x) => x.value).filter(Boolean)); await rec.first().selectOption(o[0]); }
                await snap(page, 'min-M3-rv3-step3-filled');
                await submitBtn.first().click();
                const ok = page.getByRole('button', {name: 'OK', exact: true}).filter({visible: true});
                await ok.first().waitFor({timeout: 15000}).catch(() => {});
                if (await ok.count()) await ok.first().click();
                await page.getByText('Review Submitted').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(page);
                await snap(page, 'min-M3-rv3-submitted');
                await signOut(page);
            });
            await sect('M3-after', async () => {
                await signInAs(m, `${m}ed`);
                await readBox(M3, 'min-M3-ed-submitted');
                await markComplete('min-M3-ed-confirm');
                await readBox(M3, 'min-M3-ed-confirmed-reloaded');
                await signOut(page);
            });
            // the author view of M2 (two confirmed) and M3
            await sect('author', async () => {
                await signInAs(m, `${m}au`);
                for (const [k, s] of [['M3', M3], ['M2', M2]]) {
                    await page.goto(authorUrl(m, s.id)); await idle(page);
                    await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
                    await idle(page);
                    await snap(page, `min-${k}-au-view`);
                    const info = await wfInfo(page);
                    fact(app, `min-${k}-au-view`, {status: info.status});
                }
                await signOut(page);
            });
            // Z1: the control journal (minimum 0)
            await sect('Z1', async () => {
                await signInAs(z, `${z}ed`);
                await readBox(Z1, 'min-Z1-ed-submitted');
                await markComplete('min-Z1-ed-confirm');
                await readBox(Z1, 'min-Z1-ed-confirmed-reloaded');
                await signOut(page);
            });
        });
    } finally {
        record(`${RUN}-facts`, {...facts, nativeDialogs});
        await close();
    }
});
