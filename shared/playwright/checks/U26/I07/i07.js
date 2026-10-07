// U26 claim check, chunk I07: the housekeeping session's incidental rows for the review-stage spec.
// Chunk: .reports/hk07/chunks/U26.md (incidentals rows 53 and 54).
//
// Row 53 (OJS, OMP): the author's "Read Review" window (Rule 15, register OJS1, scenario "Read
// Review" bullets). A scratch context `t` (default review mode "Open", one review form with a
// question "Included in message to author" and one not) with ed (Journal/Press editor), au (the
// submitter), au2 (a second author on the stage), rv1..rv7. Submissions:
//   P  rv1 invited, rv2 accepted (open, nothing completed)       → the author's screen: no reviewers list
//   C  rv1 completed (seeded "For author and editor" text), rv2 completes on screen with one remark
//      for author and editor and one for the editor only, rv3 and rv4 completed then made anonymous
//      by the editor's "Edit" (double / single), rv5 completes a review form on screen, rv6 declined,
//      rv7 invited                                                → the author's list and each "Read Review"
// Row 54 (OJS, OMP): note m / Side effects "Request Revisions decision" / OMP3. On C the editor
// records "Request Revisions" (no new round; the letter's text read on each wizard step), then the
// author's and au2's Tasks panel and stored task rows after each of: the decision; the author's
// first revised file; a second one; the editor's file through the "Revisions Uploaded" panel; the
// three deleted (editor, then author, the author's last); a later author file.
//   N  rv1 completed; seeded "Resubmit for Review"               → Tasks before and after an upload
//   S  one author on the stage (no au2), rv1 completed: "Request Revisions" on screen; the author's Tasks
//      after the decision, an upload, its delete, a later upload (the ordinary single-author case)
//   L  rv1 completed (seeded), rv2 types a shared and an editor-only remark: "Request Revisions", the
//      "Notify Authors" and "Notify Reviewers" letters read whole, the wizard left by "Cancel" unrecorded
// OPS: the read-only control (no review stage).
//
//   PROBE_RUN=r1 PROBE_FEATURE=U26 PROBE_AGENT=ccI07 node bin/probe.js all shared/playwright/checks/U26/I07/i07.js
//   PROBE_RUN=r2 …  (the second, independent run: its own scratch context)
//   2026-10-07 runs: r1, r2 with PHASES=read,tasks,resubmit,ops (all); s1, s2 with PHASES=single,letter on ojs,omp
//   PHASES=read,tasks,resubmit,single,letter,ops (default all; single: one author on the stage, the decision, an upload, its delete, a later upload; letter: the Request Revisions letter's reviewer part, wizard left unrecorded)
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag, sql, settled} =
    require('../../../probe');

const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ['read', 'tasks', 'resubmit', 'single', 'letter', 'ops'];
const on = (p) => PHASES.includes(p);
const RUN = process.env.PROBE_RUN || 'r0';
const T = 60_000;
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 600));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[i07 ${RUN}]`, ...a);

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const facts = {app: app.name, run: RUN};
    const fact = (k, v) => { facts[k] = v; log(app.name, k, JSON.stringify(v).slice(0, 1200)); };
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => { (facts.nativeDialogs = facts.nativeDialogs || []).push({type: d.type(), message: flat(d.message(), 200)}); await d.accept().catch(() => {}); });
    let n = 0;
    const snap = async (label) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        const id = `i07-${String(++n).padStart(2, '0')}-${label}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    const sect = async (name, fn) => {
        try { await fn(); } catch (e) { fact(`${name}-FAILED`, flat(e.stack || e.message, 1200)); await snap(`${name}-failed`).catch(() => {}); }
    };

    try {
        const t = tag('u26i07');
        const u = (k) => `${t}${k}`;
        const appx = {...app, contextPath: t};
        // the issue walks' helpers, which read app.contextPath
        const H = require('../../issues/internal-revisions-request-gives-author-no-task/lib.js');
        const A = require('../../issues/author-revisions-upload-offered-then-refused/lib.js');
        const L = require('../../issues/author-update-file-details-offered-then-refused/lib.js');
        const W = require('../../issues/change-file-keeps-first-upload/lib.js');
        const D = require('../../issues/deleted-revision-no-task-back/lib.js');
        const R = require('../../issues/emptied-review-text-kept-after-save/lib.js');
        const RR = require('../../issues/author-read-review-no-text/lib.js');
        const signInAs = async (k) => { await signIn(page, u(k), {contextPath: t}); await idle(page); };

        if (isOPS) {
            if (!on('ops')) return;
            await sect('ops', async () => {
                await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`}, users: [
                    {username: u('mgr'), roles: ['manager']}, {username: u('au'), roles: ['author']}]});
                let refused = null;
                try { await app.api.createSubmission({tag: `${t}x`, context: t, submitter: u('au'), reviewRounds: [{reviewers: []}]}); } catch (e) { refused = flat(e.message, 300); }
                fact('ops-reviewRounds-key', refused || 'accepted');
                const s = await app.api.createSubmission({tag: `${t}p`, context: t, submitter: u('au'), title: `OPS control ${t}`});
                await signInAs('au');
                await page.goto(app.url(`/index.php/${t}/en/dashboard/mySubmissions?workflowSubmissionId=${s.submissionId}`));
                await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: T});
                await idle(page);
                const a = await snap('ops-author-workflow');
                fact('ops-author', {readReview: await page.getByRole('button', {name: 'Read Review'}).count(), reviewerManager: await page.locator('[data-cy="reviewer-manager"]').count(), uploadRevisions: await page.getByRole('button', {name: /^Upload revisions$/i}).count(), dialog: flat(a.text && a.text.dialog, 1200)});
                await signInAs('mgr');
                await page.goto(app.url(`/index.php/${t}/en/dashboard/editorial?workflowSubmissionId=${s.submissionId}`));
                await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: T});
                await idle(page);
                const m = await snap('ops-manager-workflow');
                fact('ops-manager', {requestRevisions: await page.getByRole('button', {name: 'Request Revisions'}).count(), dialog: flat(m.text && m.text.dialog, 1200)});
                await signOut(page);
            });
            return;
        }

        // ------------------------------------------------------------------ seed
        const reviewers = ['rv1', 'rv2', 'rv3', 'rv4', 'rv5', 'rv6', 'rv7'];
        const names = {rv1: 'Rhea Oneview', rv2: 'Remy Twoview', rv3: 'Rosa Threeview', rv4: 'Ravi Fourview', rv5: 'Rina Fiveview', rv6: 'Rolf Sixview', rv7: 'Ruth Sevenview'};
        const FORM = `Form ${t}`;
        await app.api.createContext({
            tag: t,
            context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`},
            review: {defaultReviewMode: 'open'},
            reviewForms: [{title: {en: FORM}, elements: [
                {question: {en: 'u26i07 shown question'}, type: 'smalltextfield', included: true},
                {question: {en: 'u26i07 hidden question'}, type: 'smalltextfield', included: false},
            ]}],
            users: [
                {username: u('ed'), roles: ['editor'], givenName: 'Eda', familyName: 'Editorson'},
                {username: u('au'), roles: ['author'], givenName: 'Alex', familyName: 'Authorson'},
                {username: u('au2'), roles: ['author'], givenName: 'Bea', familyName: 'Coauthor'},
                ...reviewers.map((k) => ({username: u(k), roles: ['externalReviewer'], givenName: names[k].split(' ')[0], familyName: names[k].split(' ')[1]})),
            ],
        });
        const send = isOMP ? ['skipInternalReview'] : ['sendExternalReview'];
        const stage = isOMP ? {stage: 'external'} : {};
        const comp = isOMP ? 'Book Manuscript' : 'Article Text';
        const rv = (k, status, extra = {}) => ({username: u(k), status, ...extra});
        const TXT = {
            rv1: `u26i07 seeded shared remark ${t}`, rv3: `u26i07 seeded shared remark three ${t}`, rv4: `u26i07 seeded shared remark four ${t}`,
            rv2shared: `u26i07 typed shared remark ${t}`, rv2private: `u26i07 typed editor-only remark ${t}`,
            rv5shown: `u26i07 shown answer ${t}`, rv5hidden: `u26i07 hidden answer ${t}`,
        };
        const subs = {};
        const seed = async (key, body) => {
            try {
                const s = await app.api.createSubmission({tag: `${t}${key.toLowerCase()}`, context: t, submitter: u('au'), title: `${key} review ${t}`, files: [{file: 'article.pdf'}], ...body});
                subs[key] = {id: s.submissionId, rounds: s.reviewRounds, title: `${key} review ${t}`};
                log(app.name, `seed ${key} #${s.submissionId}`, JSON.stringify(s.reviewRounds));
            } catch (e) { fact(`seed-${key}-refused`, flat(e.message, 600)); }
        };
        const parts = [{username: u('ed'), role: 'editor'}, {username: u('au2'), role: 'author'}];
        if (on('read') || on('tasks')) await seed('P', {decisions: send, reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [rv('rv1', 'invited'), rv('rv2', 'accepted')]}], participants: parts});
        if (on('read') || on('tasks')) await seed('C', {decisions: send, reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [
            rv('rv1', 'completed', {comments: TXT.rv1}), rv('rv2', 'invited'), rv('rv3', 'completed', {comments: TXT.rv3}),
            rv('rv4', 'completed', {comments: TXT.rv4}), rv('rv5', 'invited', {reviewForm: FORM}), rv('rv6', 'declined'), rv('rv7', 'invited'),
        ]}], participants: parts});
        if (on('resubmit')) {
            await seed('N', {decisions: [...send, 'resubmit'], reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [rv('rv1', 'completed', {comments: TXT.rv1})]}], participants: parts});
        }
        fact('subs', subs);
        const C = subs.C;

        const openAuthor = async (id) => {
            await page.goto('about:blank');
            await page.goto(app.url(`/index.php/${t}/en/dashboard/mySubmissions?workflowSubmissionId=${id}`));
            await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: T});
            await idle(page);
            await page.waitForFunction(() => { const d = document.querySelector('[role=dialog]'); return d && /Status/.test(d.innerText); }, null, {timeout: 20000}).catch(() => {});
            await idle(page);
        };
        const openEditor = async (id, round) => {
            await page.goto('about:blank');
            await page.goto(app.url(`/index.php/${t}/en/dashboard/editorial?workflowSubmissionId=${id}${round ? `&workflowMenuKey=workflow_${round.stageId}_${round.id}` : ''}`));
            await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: T});
            await idle(page);
            await page.waitForFunction(() => { const d = document.querySelector('[role=dialog]'); return d && /Status/.test(d.innerText); }, null, {timeout: 20000}).catch(() => {});
            await idle(page);
        };
        const reviewerRows = async () => (await page.locator('[data-cy="reviewer-manager"]').getByRole('row').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
        const tasks = async (who, id, label) => {
            await signInAs(who);
            const out = await H.authorSees(page, appx, id);
            await snap(`${label}-${who}-tasks`);
            out.stored = H.stored(app, u(who), id);
            return out;
        };

        // ------------------------------------------------------------------ row 53: Read Review
        if (on('read') && subs.P && C) await sect('read', async () => {
            // P: the author's screen while no open review is completed; the editor's control
            await signInAs('au');
            await openAuthor(subs.P.id);
            const pa = await snap('P-author-review');
            fact('P-author', {reviewerManager: await page.locator('[data-cy="reviewer-manager"]').count(), readReview: await page.getByRole('button', {name: 'Read Review'}).count(), rows: await reviewerRows(), dialog: flat(pa.text && pa.text.dialog, 1500)});
            await signInAs('ed');
            await openEditor(subs.P.id);
            await snap('P-editor-review');
            fact('P-editor', {rows: await reviewerRows()});

            // C: rv2 types a shared and an editor-only remark; rv5 answers the review form
            const recOptions = async () => (await page.locator('#reviewStep3Form select[name="reviewerRecommendationId"] option').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
            await signInAs('rv2');
            const o2 = await R.openStep3(page, appx, C.id, {accept: true});
            await R.typeBoxes(page, appx, {author: TXT.rv2shared, editor: TXT.rv2private});
            const opts = await recOptions();
            await snap('C-rv2-step3');
            const sub2 = await R.submitReview(page, appx, isOMP ? null : 'Revisions Required');
            fact('C-rv2-review', {open: o2, recommendationOptions: opts, submit: sub2});

            await signInAs('rv5');
            const w = new (require('../../../pages/ReviewerPages.js').ReviewWizardPage)(page, t);
            await page.goto(app.url(`/index.php/${t}/en/reviewer/submission/${C.id}`));
            await w.expectOpen();
            await w.accept();
            await w.continueToStep3();
            await idle(page);
            const inputs = w.step3Form.locator('input[type="text"][name^="reviewFormResponses"]');
            const formView = {inputs: await inputs.count(), commentsBoxes: await w.step3Form.locator('textarea[name="comments"], textarea[name="commentsPrivate"]').count(), text: flat(await w.step3Form.innerText(), 1200)};
            await inputs.nth(0).fill(TXT.rv5shown);
            await inputs.nth(1).fill(TXT.rv5hidden);
            await snap('C-rv5-step3-form');
            const sub5 = await R.submitReview(page, appx, isOMP ? null : 'Accept Submission');
            fact('C-rv5-review', {formView, submit: sub5});

            // the editor makes rv3 and rv4 anonymous through the row's "Edit"
            await signInAs('ed');
            await openEditor(C.id);
            await snap('C-editor-before-edit');
            fact('C-editor-rows-before', await reviewerRows());
            fact('C-rv3-type', await RR.setReviewType(page, names.rv3, 'Anonymous Reviewer/Anonymous Author').catch((e) => ({error: flat(e.message, 300)})));
            await sleep(700);
            fact('C-rv4-type', await RR.setReviewType(page, names.rv4, 'Anonymous Reviewer/Disclosed Author').catch((e) => ({error: flat(e.message, 300)})));
            await sleep(700);
            await openEditor(C.id);
            await snap('C-editor-after-edit');
            fact('C-editor-rows-after', await reviewerRows());
            try { fact('C-stored-methods', sql(app, `select u.username, ra.review_method, ra.date_completed is not null, ra.declined, ra.review_form_id from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${C.id} order by u.username`)); } catch (e) { fact('C-stored-methods', flat(e.message, 200)); }

            // the author: which reviews are listed, and each "Read Review" window
            for (const who of ['au', 'au2']) {
                await signInAs(who);
                await openAuthor(C.id);
                const s = await snap(`C-${who}-review`);
                const rows = await reviewerRows();
                fact(`C-${who}-list`, {rows, readReviewButtons: await page.getByRole('button', {name: 'Read Review', exact: true}).count(), headers: (await page.locator('[data-cy="reviewer-manager"]').getByRole('columnheader').allInnerTexts().catch(() => [])).map((x) => flat(x, 60))});
                if (who === 'au') await loc(page, 'author view: a reviewer row\'s "Read Review"', page.locator('[data-cy="reviewer-manager"]').getByRole('button', {name: 'Read Review', exact: true}));
                if (who === 'au2') continue;
                for (const k of ['rv1', 'rv2', 'rv5', 'rv3', 'rv4', 'rv6', 'rv7']) {
                    const row = RR.reviewerRow(page, names[k]);
                    if (!(await row.count())) { fact(`C-read-${k}`, {listed: false}); continue; }
                    const answer = page.waitForResponse((r) => /read-review|readReview/i.test(r.url()), {timeout: T}).catch(() => null);
                    await row.getByRole('button', {name: 'Read Review', exact: true}).click();
                    const res = await answer;
                    const win = page.getByRole('dialog').filter({has: page.locator('form#readReviewForm')});
                    await win.waitFor({timeout: T});
                    await win.locator('[id^="reviewAssignment-"]').first().waitFor({timeout: T});
                    await idle(page);
                    const ws = await snap(`C-au-read-${k}`);
                    const part = flat(await win.locator('[id^="reviewAssignment-"]').first().innerText().catch(() => null), 2500);
                    // a form-based review shows each answer as a read-only box, whose value innerText leaves out
                    const answers = await win.locator('[id^="reviewAssignment-"] input, [id^="reviewAssignment-"] textarea, [id^="reviewAssignment-"] select').evaluateAll((es) => es.map((e) => ({name: e.name, value: e.value, readOnly: e.readOnly, disabled: e.disabled}))).catch(() => []);
                    const all = Object.values(TXT);
                    fact(`C-read-${k}`, {
                        listed: true,
                        request: res ? {status: res.status()} : null,
                        title: flat(await win.locator('h1, h2').first().innerText().catch(() => null), 160),
                        part,
                        headings: (await win.getByRole('heading').allInnerTexts()).map((x) => flat(x, 100)),
                        buttons: (await win.getByRole('button').allInnerTexts()).map((x) => flat(x, 60)).filter(Boolean),
                        textsShown: Object.fromEntries(Object.entries(TXT).filter(([, v]) => (ws.text && ws.text.dialog || '').includes(v)).map(([kk]) => [kk, true])),
                        answers,
                        answerShown: answers.some((a) => (a.value || '').includes('u26i07 shown answer')),
                        hiddenAnswerShown: answers.some((a) => (a.value || '').includes('u26i07 hidden answer')),
                        hiddenQuestionShown: (ws.text && ws.text.dialog || '').includes('u26i07 hidden question'),
                        shownQuestionShown: (ws.text && ws.text.dialog || '').includes('u26i07 shown question'),
                        totalTexts: all.length,
                    });
                    await RR.closeWindow(page, win);
                    await sleep(600);
                }
            }
        });

        // ------------------------------------------------------------------ row 54: the revisions task
        if (on('tasks') && C) await sect('tasks', async () => {
            const round = C.rounds[C.rounds.length - 1];
            await signInAs('ed');
            await H.openEditorial(page, appx, C.id, 'Request Revisions');
            // the decision, with each wizard step's letter read
            const steps = [];
            const onResponse = (r) => { if (/\/decisions(\?|$)/.test(r.url()) && r.request().method() === 'POST') steps.push({decisionPost: r.status()}); };
            page.on('response', onResponse);
            await H.decisionButton(page, 'Request Revisions').first().click();
            const entry = page.getByRole('dialog').filter({hasText: 'Require New Review Round'});
            await entry.first().waitFor({timeout: T});
            const entryText = flat(await entry.first().innerText(), 400);
            const preselected = flat(await entry.first().locator('input[type=radio]:checked').evaluate((e) => (e.closest('label') || e.parentElement).innerText).catch(() => null), 200);
            await snap('C-decision-entry');
            await entry.getByRole('button', {name: 'Next'}).click();
            const heading = page.locator('h1').filter({hasText: 'Request Revisions'});
            await heading.first().waitFor({timeout: T});
            const done = page.getByText('View Submission Summary');
            for (let i = 0; i < 8 && !(await done.count()); i++) {
                await idle(page);
                const step = {h: null, letter: null};
                if (await page.getByText('Email Templates').count()) {
                    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
                    await settled(page, page.frameLocator('iframe.tox-edit-area__iframe').first().locator('body'));
                    // the shown editor's whole text (the box scrolls; a screenshot cuts it)
                    step.letter = flat(await page.evaluate(() => {
                        const mce = window.tinymce || window.tinyMCE;
                        const shown = (mce ? mce.get() : []).filter((e) => e.getContainer && e.getContainer() && e.getContainer().getClientRects().length > 0);
                        return shown.map((e) => e.getContent({format: 'text'})).join(' || ');
                    }).catch((e) => `read failed ${e.message}`), 6000);
                }
                step.h = flat(await page.locator('main h2, [role=dialog] h2').filter({visible: true}).allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 200);
                await snap(`C-decision-step-${i + 1}`);
                steps.push(step);
                const rec = page.getByRole('button', {name: /^Record (Editorial )?Decision$/});
                if (await rec.count()) { await rec.first().click(); await done.first().waitFor({timeout: T}); break; }
                await page.getByRole('button', {name: 'Continue', exact: true}).click();
                await sleep(400);
            }
            page.off('response', onResponse);
            await idle(page);
            fact('C-decision', {entryText, preselected, steps, decisions: H.decisions(app, C.id)});
            await openEditor(C.id, round);
            await snap('C-editor-after-decision');
            fact('C-round-after-decision', await D.round(page));

            const state = {};
            const read = async (label) => {
                state[label] = {au: await tasks('au', C.id, label), au2: await tasks('au2', C.id, label)};
                fact(`C-tasks-${label}`, state[label]);
            };
            await read('decision');
            // the author's screen after the decision
            await signInAs('au');
            await openAuthor(C.id);
            await snap('C-author-after-decision');
            fact('C-author-offers', {uploadRevisions: await A.uploadRevisionsButton(page).first().isVisible().catch(() => false), round: await D.round(page)});
            await loc(page, 'author view: the bottom "Upload revisions" button', A.uploadRevisionsButton(page));

            // first revised file
            const f1 = L.smallFile(`u26i07-${RUN}-r1.txt`);
            fact('C-upload-1', await D.authorUpload(page, comp, f1));
            await snap('C-author-after-upload-1');
            await read('upload1');
            // a second revised file while the decision stands
            await signInAs('au');
            await openAuthor(C.id);
            const via2 = (await A.uploadRevisionsButton(page).first().isVisible().catch(() => false)) ? 'Upload revisions' : 'panel Upload';
            const f2 = L.smallFile(`u26i07-${RUN}-r2.txt`);
            const up2 = via2 === 'Upload revisions' ? await D.authorUpload(page, comp, f2) : {...(await A.uploadThrough(page, A.uploadButton(page), comp, f2)), after: await D.round(page)};
            fact('C-upload-2', {via: via2, ...up2});
            await snap('C-author-after-upload-2');
            await read('upload2');
            // the editor files a third through the panel's own "Upload"
            await signInAs('ed');
            await openEditor(C.id, round);
            const fe = L.smallFile(`u26i07-${RUN}-e1.txt`);
            fact('C-upload-editor', await L.editorUpload(page, 'Revisions Uploaded', comp, fe).catch((e) => ({error: flat(e.message, 300)})));
            await idle(page);
            await snap('C-editor-after-upload');
            fact('C-round-after-editor-upload', await D.round(page));
            await read('uploadEditor');
            // all three deleted: the editor's, then the author's two (the last one the only file left)
            await signInAs('ed');
            await openEditor(C.id, round);
            fact('C-delete-editor', await D.deleteFrom(page, D.LIST, fe.name).catch((e) => ({error: flat(e.message, 300)})));
            await signInAs('au');
            await openAuthor(C.id);
            fact('C-delete-r2', await D.deleteFrom(page, D.LIST, f2.name).catch((e) => ({error: flat(e.message, 300)})));
            await openAuthor(C.id);
            fact('C-delete-r1', await D.deleteFrom(page, D.LIST, f1.name).catch((e) => ({error: flat(e.message, 300)})));
            await openAuthor(C.id);
            await snap('C-author-after-deletes');
            fact('C-round-after-deletes', await D.round(page));
            await read('deleted');
            // a later file while the decision stands
            await signInAs('au');
            await openAuthor(C.id);
            const via3 = (await A.uploadRevisionsButton(page).first().isVisible().catch(() => false)) ? 'Upload revisions' : 'panel Upload';
            const f3 = L.smallFile(`u26i07-${RUN}-r3.txt`);
            const up3 = via3 === 'Upload revisions' ? await D.authorUpload(page, comp, f3) : {...(await A.uploadThrough(page, A.uploadButton(page), comp, f3)), after: await D.round(page)};
            fact('C-upload-3', {via: via3, ...up3});
            await snap('C-author-after-upload-3');
            await read('upload3');
            // the page left with something unsaved: an upload window opened and its first step filled, then a reload
            await openAuthor(C.id);
            await A.uploadRevisionsButton(page).first().click().catch(() => {});
            await W.uploadBox(page).waitFor({state: 'attached', timeout: 20_000}).catch(() => {});
            await W.wizard(page).locator('select[id^="genreId"]').selectOption({label: comp}).catch(() => {});
            await page.goto(app.url(`/index.php/${t}/en/dashboard/mySubmissions`)).catch((e) => fact('C-leave-error', flat(e.message, 200)));
            await idle(page);
            await snap('C-author-left-upload-window');
            fact('C-after-leave', {rows: (await W.listRows(page, D.LIST).catch(() => null)), url: page.url()});
            await signInAs('au');
            await openAuthor(C.id);
            fact('C-round-after-leave', await D.round(page));
        });

        // ------------------------------------------------------------------ one author on the stage (the ordinary case)
        if (on('single')) await sect('single', async () => {
            await seed('S', {decisions: send, reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [rv('rv1', 'completed', {comments: TXT.rv1})]}], participants: [{username: u('ed'), role: 'editor'}]});
            const S = subs.S;
            await signInAs('ed');
            await H.openEditorial(page, appx, S.id, 'Request Revisions');
            fact('S-decision', await H.recordDecision(page, 'Request Revisions'));
            const read = async (label) => { const out = await tasks('au', S.id, `S-${label}`); fact(`S-tasks-${label}`, out); return out; };
            await read('decision');
            await signInAs('au');
            await openAuthor(S.id);
            const f1 = L.smallFile(`u26i07-${RUN}-s1.txt`);
            fact('S-upload-1', await D.authorUpload(page, comp, f1));
            await read('upload1');
            await signInAs('au');
            await openAuthor(S.id);
            fact('S-delete-1', await D.deleteFrom(page, D.LIST, f1.name).catch((e) => ({error: flat(e.message, 300)})));
            await openAuthor(S.id);
            await snap('S-author-after-delete');
            fact('S-round-after-delete', await D.round(page));
            await read('deleted');
            await signInAs('au');
            await openAuthor(S.id);
            const f2 = L.smallFile(`u26i07-${RUN}-s2.txt`);
            fact('S-upload-2', await D.authorUpload(page, comp, f2));
            await read('upload2');
        });

        // ------------------------------------------------------------------ the decision letter's reviewer part (OJS1's second half)
        if (on('letter')) await sect('letter', async () => {
            await seed('L', {decisions: send, reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [rv('rv1', 'completed', {comments: TXT.rv1}), rv('rv2', 'invited')]}], participants: parts});
            const Lid = subs.L.id;
            await signInAs('rv2');
            await R.openStep3(page, appx, Lid, {accept: true});
            await R.typeBoxes(page, appx, {author: TXT.rv2shared, editor: TXT.rv2private});
            fact('L-rv2-review', await R.submitReview(page, appx, isOMP ? null : 'Revisions Required'));
            await signInAs('ed');
            await H.openEditorial(page, appx, Lid, 'Request Revisions');
            await H.decisionButton(page, 'Request Revisions').first().click();
            const entry = page.getByRole('dialog').filter({hasText: 'Require New Review Round'});
            await entry.first().waitFor({timeout: T});
            await entry.getByRole('button', {name: 'Next'}).click();
            await page.locator('h1').filter({hasText: 'Request Revisions'}).first().waitFor({timeout: T});
            const steps = [];
            for (let i = 0; i < 2; i++) {
                await idle(page);
                await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
                await settled(page, page.frameLocator('iframe.tox-edit-area__iframe').first().locator('body'));
                const letter = await page.evaluate(() => {
                    const mce = window.tinymce || window.tinyMCE;
                    const shown = (mce ? mce.get() : []).filter((e) => e.getContainer && e.getContainer() && e.getContainer().getClientRects().length > 0);
                    return shown.map((e) => e.getContent({format: 'text'})).join(' || ');
                });
                await snap(`L-decision-step-${i + 1}`);
                steps.push({h: flat(await page.locator('h1').first().innerText().catch(() => null), 120), letter: flat(letter, 6000),
                    shared: letter.includes(TXT.rv2shared) || letter.includes(TXT.rv1), privateShown: letter.includes(TXT.rv2private)});
                if (i === 0) { await page.getByRole('button', {name: 'Continue', exact: true}).click(); await sleep(500); }
            }
            fact('L-letters', steps);
            // leave the wizard unrecorded
            await page.getByRole('button', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            await sleep(800);
            await snap('L-decision-cancel');
            fact('L-after-cancel', {url: page.url(), dialogs: await page.getByRole('dialog').allInnerTexts().then((a) => a.map((x) => flat(x, 300))).catch(() => [])});
        });

        // ------------------------------------------------------------------ "Resubmit for Review"
        if (on('resubmit') && subs.N) await sect('resubmit', async () => {
            const N = subs.N;
            fact('N-decisions', H.decisions(app, N.id));
            const before = {au: await tasks('au', N.id, 'N-before'), au2: await tasks('au2', N.id, 'N-before')};
            fact('N-tasks-before', before);
            await signInAs('au');
            await openAuthor(N.id);
            await snap('N-author-review');
            const f = L.smallFile(`u26i07-${RUN}-n1.txt`);
            fact('N-upload', await D.authorUpload(page, comp, f).catch((e) => ({error: flat(e.message, 300)})));
            fact('N-tasks-after', {au: await tasks('au', N.id, 'N-after'), au2: await tasks('au2', N.id, 'N-after')});
        });
    } finally {
        record('i07-facts', facts, {merge: true});
        await close();
    }
});
