// U38 claim check, chunk Ks27 — Rule 6 (file lines), 6a ("Download"), 6b (a
// revision keeps its line), 6c (a cancelled revision) and register A6 of
// docs/specs/U38-submission-activity-log-and-notes.md, re-checked after
// pkp/pkp-lib#13288 (issue #13286, merge f38c4a4a10): the cancelled revision's
// log lines are deleted and `EventLogGridRow` hides "Download" for a version
// that is no longer a revision. The U36 Ks27 script
// (shared/playwright/checks/U36/Ks27/ks27.js) drives the cancel matrix with
// the Activity Log read after each cancel; this one drives the rest of Rule 6.
//
// Per app one scratch context (users mg [Journal Manager], se [Section
// editor / Series editor / Moderator], au [Author], OJS/OMP ed [Journal
// editor]):
//   F  {OJS OMP} Copyediting, au's article.pdf + notes.md on "Submission
//      Files", se assigned: a new file, a copy into "Draft Files", a revision
//      (PNG) completed, then a revision cancelled at "2. Review Details", a
//      rename, a deletion; each line's "Download"; the file's own "History".
//   D  every app: submitted, ed (OPS se) assigned: a discussion with a file,
//      then the discussion deleted.
//   G  {OPS} an unposted preprint: a galley added through the wizard, its
//      "Change File" completed, then "Change File" cancelled at step 2, then
//      the galley deleted.
//
//   PROBE_FEATURE=U36 PROBE_AGENT=ccRevs27 node bin/probe.js all shared/playwright/checks/U38/Ks27/ks27.js
//   PHASES=seed,files,disc,galley (default all); REUSE=1 reuses the last seed (u38-state-<app>.json).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, idle, tag, outDir} = require('../../../probe');

const PHASES = (process.env.PHASES || 'seed,files,disc,galley').split(',');
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const fixture = (app, f) => path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/fixtures/files/${f}`);

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const log = (...a) => console.log(`[${app.name}]`, ...a);
    const stateFile = path.join(outDir(), `u38-state-${app.name}.json`);
    const factsFile = path.join(outDir(), `u38-facts-${app.name}.json`);
    const facts = fs.existsSync(factsFile) ? JSON.parse(fs.readFileSync(factsFile, 'utf8')) : {};
    const fact = (k, v) => { facts[k] = v; fs.writeFileSync(factsFile, JSON.stringify(facts, null, 1)); log(k, JSON.stringify(v).slice(0, 3000)); };

    // ---- seed ---------------------------------------------------------------
    let S;
    if ((process.env.REUSE || !on('seed')) && fs.existsSync(stateFile)) {
        S = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } else {
        const t = tag('u36rev38');
        const u = (s) => `${t}${s}`;
        const users = [
            {username: u('mg'), roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: u('se'), roles: ['sectionEditor'], givenName: 'Sean', familyName: 'Section'},
            {username: u('au'), roles: ['author'], givenName: 'Ava', familyName: 'Author'},
        ];
        if (!isOPS) users.push({username: u('ed'), roles: ['editor'], givenName: 'Eddie', familyName: 'Editor'});
        const C = await app.api.createContext({tag: t, users});
        S = {t, path: C.path, users: Object.fromEntries(C.users.map((x) => [x.username.slice(t.length), x.username]))};
        const base = {context: C.path, submitter: u('au')};
        const edKey = isOPS ? 'se' : 'ed';
        S.edKey = edKey;
        const mk = async (k, spec) => { const r = await app.api.createSubmission({...base, tag: `${t}${k.toLowerCase()}`, title: `Ks27 ${k} ${t}`, ...spec}); S[k] = {id: r.submissionId, publicationId: r.publicationId}; };
        if (!isOPS) await mk('F', {files: [{file: 'article.pdf'}, {file: 'notes.md'}], decisions: ['skipExternalReview'], participants: [{username: u('se'), role: 'sectionEditor'}]});
        await mk('D', {participants: [{username: u(edKey), role: isOPS ? 'sectionEditor' : 'editor'}]});
        if (isOPS) await mk('G', {participants: [{username: u('se'), role: 'sectionEditor'}]});
        fs.writeFileSync(stateFile, JSON.stringify(S, null, 1));
        log('seeded', JSON.stringify(S));
    }
    const U = (k) => S.users[k];
    const CP = S.path;
    const wfUrl = (id, key) => app.url(`/index.php/${CP}/en/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    // ---- helpers ------------------------------------------------------------
    const H = (page) => {
        const h = {};
        h.snap = async (name, extra) => { let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message)}; } record(name, extra ? {...s, extra} : s); await shot(page, name).catch(() => {}); return s; };
        h.as = async (k) => { await signIn(page, U(k), {contextPath: CP}); await idle(page); };
        h.wf = () => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
        h.open = async (id, key, label) => {
            await page.goto(wfUrl(id, key));
            await h.wf().locator('[data-cy="sidemodal-header"]').waitFor({timeout: 30000}).catch(() => log('no workflow header', id, key));
            await page.waitForFunction(() => !/Loading|Refreshing data/.test((document.querySelector('[data-cy="sidemodal-header"]') || {}).innerText || ''), null, {timeout: 15000}).catch(() => {});
            await idle(page);
            if (label) await h.snap(label);
        };
        h.reland = async () => { await page.goto(page.url()); await h.wf().locator('[data-cy="sidemodal-header"]').waitFor({timeout: 30000}).catch(() => {}); await idle(page); };
        h.logDialog = () => page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'}).last();
        h.openLog = async () => {
            const btn = h.wf().locator('[data-cy="sidemodal-header"]').getByRole('button', {name: 'Activity Log', exact: true}).first();
            if (!(await btn.count())) { log('no Activity Log button'); return null; }
            await btn.click();
            const d = h.logDialog();
            await d.locator('tr.gridRow, td:has-text("No Items")').first().waitFor({timeout: 45000}).catch(() => log('History grid did not fill'));
            await idle(page);
            return d;
        };
        h.gridRows = (scope) => scope.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr, i) => {
            const tds = [...tr.querySelectorAll('td')];
            const txt = (td) => (td ? td.innerText.replace(/\s+/g, ' ').trim() : '');
            return {i, date: txt(tds[0]).replace(/^Settings\s*/, ''), user: txt(tds[1]), event: txt(tds[2]), arrow: !!tr.querySelector('a.show_extras, a.hide_extras')};
        })).catch(() => []);
        h.readLog = async (label) => {
            const d = await h.openLog();
            if (!d) return [];
            const rows = await h.gridRows(d);
            await h.snap(label, {rows});
            return rows;
        };
        h.closeLog = async () => {
            const d = h.logDialog();
            await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await d.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
            await h.reland();
        };
        // Press a row's arrow and its "Download"; the response and the file.
        h.downloadIn = async (scope, i, label) => {
            const tr = scope.locator('tr.gridRow').nth(i);
            const a = tr.locator('a.show_extras').first();
            if (!(await a.count())) return {noArrow: true};
            await a.click(); await sleep(300);
            const strip = tr.locator('xpath=following-sibling::tr[1]');
            const links = await strip.locator('a').evaluateAll((as) => as.map((x) => x.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            const link = strip.getByRole('link', {name: /Download/}).first();
            if (!(await link.count())) return {links, noDownload: true};
            await loc(page, `${label}: a History line's "Download"`, link);
            const got = [];
            const onD = (d) => got.push(d);
            const onP = (p) => p.on('download', onD);
            page.on('download', onD); page.context().on('page', onP);
            const resp = page.context().waitForEvent('response', {predicate: (r) => /download-file/.test(r.url()), timeout: 15000}).catch(() => null);
            const before = page.url();
            await link.click().catch(() => {});
            const r = await resp;
            for (let k = 0; k < 30 && !got.length; k++) await sleep(250);
            page.off('download', onD); page.context().off('page', onP);
            const out = {status: r ? r.status() : null, url: r ? r.url().replace(/^.*index\.php/, '').slice(0, 240) : null};
            if (got.length) {
                const d = got[0];
                const file = await d.path().catch(() => null);
                const buf = file ? fs.readFileSync(file) : Buffer.alloc(0);
                Object.assign(out, {name: d.suggestedFilename(), size: buf.length, head: buf.subarray(0, 8).toString('latin1').replace(/[^\x20-\x7e]/g, '.')});
            } else {
                out.noDownloadEvent = true; out.landed = page.url().replace(/^.*index\.php/, '');
                if (page.url() !== before) { const s = await h.snap(`${label}-landed`); out.landedText = flat(s.text && s.text.main, 300); await page.goto(before); await idle(page); }
            }
            for (const p of page.context().pages()) if (p !== page) await p.close().catch(() => {});
            return out;
        };
        return h;
    };
    const newLines = (before, after) => {
        const left = (before || []).map((r) => `${r.user}\u0001${r.event}`);
        const out = [];
        for (const r of after || []) { const k = `${r.user}\u0001${r.event}`; const at = left.indexOf(k); if (at >= 0) left.splice(at, 1); else out.push(r); }
        return out;
    };
    const brief = (rows) => (rows || []).map((r) => `${r.date} | ${r.user} | ${r.event}${r.arrow ? ' [>]' : ''}`);
    const sect = async (name, fn) => {
        const {page, close} = await launch(app);
        page.on('dialog', (d) => { log('browser dialog', d.type(), d.message()); d.accept().catch(() => {}); });
        try { await fn(page, H(page)); } catch (e) { log(`[${name} FAILED]`, String(e.stack || e).slice(0, 1500)); await shot(page, `u38-${name}-failure`).catch(() => {}); } finally { await close(); }
    };

    // =====================================================================
    // files {OJS OMP}: Rules 6, 6a, 6b, 6c
    if (on('files') && !isOPS && S.F) await sect('files', async (page, h) => {
        const P = require('../../../pages/SubmissionFilesPages.js');
        const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
        const frame = new WorkflowPage(page, CP);
        const SUP = isOJS ? 'Research Instrument' : 'Prospectus';
        const id = S.F.id;
        const out = {};
        const step = async (name, fn) => { try { await fn(); } catch (e) { out[`${name}.error`] = String(e.message).split('\n')[0].slice(0, 300); log(name, 'ERROR', out[`${name}.error`]); await shot(page, `u38-files-${name}-error`).catch(() => {}); } };
        const history = async (label) => { const r = await h.readLog(label); await h.closeLog(); return r || []; };
        // every arrowed file line: its "Download"
        const downloads = async (label, re) => {
            const d = await h.openLog();
            const rows = await h.gridRows(d);
            const res = {};
            for (const r of rows) {
                if (!re.test(r.event)) continue;
                if (!r.arrow) { res[`${r.i} ${r.event}`] = 'no arrow'; continue; }
                if (!(await h.logDialog().isVisible().catch(() => false))) await h.openLog();
                res[`${r.i} ${r.event}`] = await h.downloadIn(h.logDialog(), r.i, `u38-${label}-${r.i}`);
            }
            await h.snap(`u38-${label}-downloads`);
            await h.closeLog();
            return res;
        };
        await h.as('mg');
        await h.open(id, 'workflow_1', 'u38-files-00-submission-stage');
        const list = new P.FileList(page, frame, 'Submission Files');
        let before = await history('u38-files-01-history');
        // (a) a new file through the wizard
        await step('upload', async () => {
            await list.uploadButton().click();
            const w = new P.UploadWizard(page, 'Upload Submission File');
            await w.expectOpen();
            await w.chooseComponent(SUP);
            await w.attach(fixture(app, 'not-an-image.txt'), 'not-an-image.txt');
            await w.continueTo(P.WIZARD_STEPS[1]);
            await w.continueTo(P.WIZARD_STEPS[2]);
            await w.complete();
            await h.reland();
            out.listAfterUpload = await list.names().catch(() => null);
        });
        let after = await history('u38-files-02-after-upload');
        out.upload = brief(newLines(before, after)); before = after;
        // (b) a copy into "Draft Files" through "Upload/Select Files"
        await step('copy', async () => {
            await h.open(id, 'workflow_4', 'u38-files-03-copyediting');
            const drafts = new P.FileList(page, frame, 'Draft Files');
            const sel = await new P.SelectFilesWindow(page).openFrom(drafts);
            await sel.showAllStages();
            await h.snap('u38-files-04-select-window');
            await sel.tick('not-an-image.txt', 'Submission');
            await sel.ok();
            await h.reland();
            out.draftsAfterCopy = await drafts.names().catch(() => null);
        });
        after = await history('u38-files-05-after-copy');
        out.copy = brief(newLines(before, after)); before = after;
        // (c) a revision of article.pdf (a PNG), completed
        await h.open(id, 'workflow_1');
        await step('revise', async () => {
            await list.uploadButton().click();
            const w = new P.UploadWizard(page, 'Upload Submission File');
            await w.expectOpen();
            await w.chooseRevision('article.pdf');
            await w.attach(fixture(app, 'profile-image-400.png'), 'profile-image-400.png');
            await w.continueTo(P.WIZARD_STEPS[1]);
            await w.continueTo(P.WIZARD_STEPS[2]);
            await w.complete();
            await h.reland();
            out.listAfterRevise = await list.names().catch(() => null);
        });
        after = await history('u38-files-06-after-revise');
        out.revise = brief(newLines(before, after)); before = after;
        out.reviseDownloads = await downloads('files-07-revise', /article\.pdf|profile-image|not-an-image/);
        // 6b: the file's own "History"
        await step('file-history', async () => {
            await list.choose(list.row('profile-image-400.png'), 'More Information');
            const info = new P.InformationCenter(page, 'profile-image-400.png');
            await info.expectOpen();
            await info.expectHistoryLoaded();
            const d = page.getByRole('dialog').filter({hasText: /Information Center/}).last();
            const rows = await h.gridRows(d);
            out.fileHistory = brief(rows);
            await h.snap('u38-files-08-file-history', {rows});
            out.fileHistoryDownloads = {};
            for (const r of rows) if (r.arrow) out.fileHistoryDownloads[`${r.i} ${r.event}`] = await h.downloadIn(d, r.i, `u38-files-08-fh-${r.i}`);
            await info.close();
            await h.reland();
        });
        // 6c: another revision of the same file, "Cancel" on "2. Review Details"
        await step('revise-cancel', async () => {
            await list.uploadButton().click();
            const w = new P.UploadWizard(page, 'Upload Submission File');
            await w.expectOpen();
            await w.chooseRevision('profile-image-400.png');
            await w.attach(fixture(app, 'notes.md'), 'notes.md');
            await w.continueTo(P.WIZARD_STEPS[1]);
            await h.snap('u38-files-09-revise-step2-before-cancel');
            const answer = page.waitForResponse((r) => r.url().includes('cancel-file-upload'), {timeout: 30000});
            await w.cancelLink().click();
            const a = await answer;
            out.cancelAnswer = `${a.status()} ${flat(await a.text().catch(() => ''), 200)}`;
            await w.expectClosed().catch((e) => { out.cancelStillOpen = String(e.message).split('\n')[0]; });
            out.listAfterCancelSamePage = await list.names().catch(() => null);
            await h.snap('u38-files-10-list-after-cancel');
            await h.reland();
            out.listAfterCancel = await list.names().catch(() => null);
        });
        after = await history('u38-files-11-after-revise-cancel');
        out.reviseCancel = brief(newLines(before, after)); before = after;
        out.cancelDownloads = await downloads('files-12-cancel', /profile-image|notes\.md|file revision/);
        await step('file-history-after-cancel', async () => {
            await list.choose(list.row('profile-image-400.png'), 'More Information');
            const info = new P.InformationCenter(page, 'profile-image-400.png');
            await info.expectOpen();
            await info.expectHistoryLoaded();
            const d = page.getByRole('dialog').filter({hasText: /Information Center/}).last();
            out.fileHistoryAfterCancel = brief(await h.gridRows(d));
            await h.snap('u38-files-13-file-history-after-cancel');
            await info.close();
            await h.reland();
        });
        // (d) a rename of notes.md; the first line's Download keeps the old name
        await step('rename', async () => {
            await list.choose(list.row('notes.md'), 'Update File Details');
            const e = new P.EditFileWindow(page);
            await e.expectOpen();
            await e.nameBox().fill('Renamed notes');
            await e.save();
            await h.reland();
        });
        after = await history('u38-files-14-after-rename');
        out.rename = brief(newLines(before, after)); before = after;
        out.renameDownloads = await downloads('files-15-rename', /notes\.md|Renamed notes/);
        // (e) the deletion; the file's lines after it
        await step('delete', async () => {
            await list.choose(list.row('Renamed notes'), 'Delete');
            const d = new P.DeleteFileDialog(page);
            out.deleteAnswer = (await d.confirm()).status();
            await h.reland();
        });
        after = await history('u38-files-16-after-delete');
        out.delete = brief(newLines(before, after));
        out.notesLinesAfterDelete = brief(after.filter((r) => /notes\.md|Renamed notes/.test(r.event)));
        out.finalHistory = brief(after);
        fact('files', out);
    });

    // =====================================================================
    // dlseq {OJS OMP} (sweep): several "Download"s pressed one after another in one open
    // History, at a person's pace; the page script errors seen after each press.
    if (on('dlseq') && !isOPS && S.F) await sect('dlseq', async (page, h) => {
        const errs = [];
        page.on('pageerror', (e) => errs.push({at: Date.now(), text: String(e.message).slice(0, 200)}));
        const out = {runs: []};
        await h.as('mg');
        for (const order of ['down', 'up', 'single']) {
            await h.open(S.F.id, 'workflow_1');
            const d = await h.openLog();
            const rows = (await h.gridRows(d)).filter((r) => r.arrow && /uploaded/.test(r.event));
            const pick = order === 'down' ? rows : order === 'up' ? [...rows].reverse() : rows.slice(0, 1);
            const run = {order, presses: []};
            for (const r of pick) {
                const n0 = errs.length;
                const tr = d.locator('tr.gridRow').nth(r.i);
                const toggle = tr.locator('a.show_extras').first();
                const hadToggle = await toggle.count();
                if (hadToggle) { await toggle.click(); await sleep(1000); }
                const link = tr.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: /Download/}).first();
                const dl = page.waitForEvent('download', {timeout: 10000}).catch(() => null);
                await link.click({timeout: 5000}).catch((e) => run.presses.push({event: r.event, clickError: String(e.message).split('\n')[0]}));
                const got = await dl;
                await sleep(2000);
                run.presses.push({event: r.event, hadToggle, file: got && got.suggestedFilename(), errorsAfter: errs.slice(n0).map((x) => x.text)});
            }
            await h.snap(`u38-dlseq-${order}`);
            await h.closeLog();
            out.runs.push(run);
        }
        out.totalErrors = errs.length;
        fact('dlseq', out);
    });

    // =====================================================================
    // disc: a discussion with a file (Rule 6's attached file), then deleted (6a)
    const PANEL = isOPS ? 'Production Tasks & Discussions' : 'Desk Review Tasks & Discussions';
    const DKEY = isOPS ? 'workflow_5' : 'workflow_1';
    const discName = `Ks27 disc ${S.t}`;
    if (on('disc') && S.D) await sect('disc', async (page, h) => {
        const T = require('../../../pages/TasksDiscussionsPages.js');
        const panel = new T.TasksDiscussionsPanel(page, CP, {title: PANEL});
        const out = {};
        const id = S.D.id;
        await h.as(S.edKey);
        await h.open(id, DKEY, 'u38-disc-00-stage');
        const before = await h.readLog('u38-disc-01-history'); await h.closeLog();
        try {
            await panel.expectSettled();
            const add = await panel.openAdd();
            await add.nameField().fill(discName);
            await add.tick(U('au'));
            await add.typeMessage('Ks27 discussion message with a file.');
            const att = await add.openAttachFiles();
            await att.upload(fixture(app, 'not-an-image.txt'));
            await h.snap('u38-disc-02-window-filled');
            await add.saveExpectClosed();
            await panel.reland();
        } catch (e) { out.createError = String(e.message).split('\n')[0]; }
        const r1 = await h.readLog('u38-disc-03-after-create');
        out.create = brief(newLines(before, r1));
        const line = r1.find((x) => /not-an-image\.txt/.test(x.event));
        out.line = line || null;
        if (line) out.download = await h.downloadIn(h.logDialog(), line.i, 'u38-disc-04-dl');
        await h.closeLog();
        try {
            await panel.expectSettled();
            const dlg = await panel.openDelete(discName);
            await dlg.answer('OK').catch(async () => { await dlg.answer('Yes'); });
            await panel.reland();
        } catch (e) { out.deleteError = String(e.message).split('\n')[0]; }
        const r2 = await h.readLog('u38-disc-05-after-delete');
        out.afterDelete = brief(newLines(r1, r2));
        out.lineAfterDelete = r2.find((x) => /not-an-image\.txt/.test(x.event)) || null;
        await h.closeLog();
        fact('disc', out);
    });

    // =====================================================================
    // galley {OPS}: a galley's file — new, revision ("Change File" completed), cancelled revision, deletion
    if (on('galley') && isOPS && S.G) await sect('galley', async (page, h) => {
        const P = require('../../../pages/SubmissionFilesPages.js');
        const out = {};
        const id = S.G.id;
        const key = `publication_${S.G.publicationId}_galleys`;
        const W = 'Upload a File Ready for Publication';
        const history = async (label) => { const r = await h.readLog(label); await h.closeLog(); return r || []; };
        const galleyMenu = async (item) => {
            const r = h.wf().locator('tbody tr').filter({hasText: 'PDF'}).first();
            await r.waitFor({timeout: 20000});
            await r.locator('button').last().click(); await sleep(300);
            out.menu = await page.getByRole('menuitem').allInnerTexts().catch(() => []);
            await page.getByRole('menuitem', {name: item}).first().click();
        };
        await h.as('se');
        await h.open(id, key, 'u38-galley-00-page');
        let before = await history('u38-galley-01-history');
        try {
            await h.wf().getByRole('button', {name: /^Add galley$/i}).first().click();
            const form = page.locator('[role="dialog"]:visible').last();
            await form.locator('input[name="label"]').waitFor({timeout: 30000});
            await idle(page);
            await form.locator('input[name="label"]').fill('PDF');
            await form.getByRole('button', {name: /^(Save|OK)$/}).last().click();
            await idle(page);
            const w = new P.UploadWizard(page, W);
            await w.dialog().waitFor({timeout: 30000});
            await w.fileInput().waitFor({state: 'attached', timeout: 30000});
            await idle(page);
            const g = w.componentSelect();
            if (await g.count() && await g.isEnabled()) await g.selectOption({index: 1});
            await w.attach(fixture(app, 'preprint.pdf'), 'preprint.pdf');
            await w.continueTo(P.WIZARD_STEPS[1]);
            await w.continueTo(P.WIZARD_STEPS[2]);
            await w.complete();
            await h.reland();
        } catch (e) { out.addError = String(e.message).split('\n')[0]; }
        let after = await history('u38-galley-02-after-add');
        out.add = brief(newLines(before, after)); before = after;
        // "Change File" completed: a revision
        try {
            await galleyMenu('Change File');
            const w = new P.UploadWizard(page, W);
            await w.dialog().waitFor({timeout: 30000});
            await w.fileInput().waitFor({state: 'attached', timeout: 30000});
            await idle(page);
            await w.attach(fixture(app, 'replacement.pdf'), 'replacement.pdf');
            await w.continueTo(P.WIZARD_STEPS[1]);
            await w.continueTo(P.WIZARD_STEPS[2]);
            await w.complete();
            await h.reland();
        } catch (e) { out.changeError = String(e.message).split('\n')[0]; }
        after = await history('u38-galley-03-after-change');
        out.change = brief(newLines(before, after)); before = after;
        // downloads of the file lines
        {
            const d = await h.openLog();
            const rows = await h.gridRows(d);
            out.changeDownloads = {};
            for (const r of rows) if (r.arrow && /preprint\.pdf|replacement\.pdf/.test(r.event)) {
                if (!(await h.logDialog().isVisible().catch(() => false))) await h.openLog();
                out.changeDownloads[`${r.i} ${r.event}`] = await h.downloadIn(h.logDialog(), r.i, `u38-galley-04-dl-${r.i}`);
            }
            await h.closeLog();
        }
        // the galley's own "History" (6b)
        try {
            await galleyMenu('More Information');
            const info = page.getByRole('dialog').filter({hasText: /Information Center/}).last();
            await info.waitFor({timeout: 30000});
            await info.locator('tr.gridRow, td:has-text("No Items")').first().waitFor({timeout: 30000}).catch(() => {});
            await idle(page);
            out.galleyHistory = brief(await h.gridRows(info));
            await h.snap('u38-galley-05-more-information');
            await info.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await h.reland();
        } catch (e) { out.infoError = String(e.message).split('\n')[0]; }
        // "Change File" cancelled at step 2 (6c's path on a galley)
        try {
            await galleyMenu('Change File');
            const w = new P.UploadWizard(page, W);
            await w.dialog().waitFor({timeout: 30000});
            await w.fileInput().waitFor({state: 'attached', timeout: 30000});
            await idle(page);
            await w.attach(fixture(app, 'figure.png'), 'figure.png');
            await w.continueTo(P.WIZARD_STEPS[1]);
            await h.snap('u38-galley-06-change-step2-before-cancel');
            const answer = page.waitForResponse((r) => r.url().includes('cancel-file-upload'), {timeout: 30000});
            await w.cancelLink().click();
            const a = await answer;
            out.cancelAnswer = `${a.status()} ${flat(await a.text().catch(() => ''), 200)}`;
            await w.expectClosed().catch((e) => { out.cancelStillOpen = String(e.message).split('\n')[0]; });
            await h.reland();
        } catch (e) { out.cancelError = String(e.message).split('\n')[0]; }
        after = await history('u38-galley-07-after-cancel');
        out.cancel = brief(newLines(before, after)); before = after;
        // delete the galley
        try {
            await galleyMenu('Delete');
            const d = page.getByRole('dialog', {name: 'Delete'}).last();
            await d.getByRole('button', {name: 'OK', exact: true}).click();
            await sleep(1500);
            await h.reland();
        } catch (e) { out.delError = String(e.message).split('\n')[0]; }
        after = await history('u38-galley-08-after-delete');
        out.del = brief(newLines(before, after));
        out.fileLinesAfter = brief(after.filter((x) => /preprint\.pdf|replacement\.pdf|figure\.png/.test(x.event)));
        fact('galley', out);
    });
});
