// U27 claim check I28 (housekeeping 2026-09-28): the incidental rows of
// docs/tracking/incidentals.md for the reviewer-assignment spec, per the drive
// plan in .reports/hk28/chunks/U27.md, on OJS and OMP (OPS has no review stage).
// Every run seeds its own scratch contexts (nothing on publicknowledge):
//   A  "I28 A <t>": ed (editor, manager-level), se (section/series editor, the
//      sub-editor level), au (author), reviewers rA rA2 rB rC rD rE rF rG rH rS
//      rT rY rZ (externalReviewer); OMP adds rX (externalReviewer only) and rI
//      (internalReviewer). A competing-interests policy and one active review
//      form "I28 Form" (one optional textarea question).
//   B  "I28 B <t>": eb (editor), ab (author), rN (never assigned), rW, plus rT
//      rY rZ enrolled as externalReviewer; no policy, no review form.
// Phases (PHASES=a,b to narrow; the state of a run is kept in i28-state-<RUN>-<app>.json):
//   seed   contexts and submissions
//   rev    reviewer drives: rB accepts leaving "I do not have any competing
//          interests" ticked, uploads a file on step 3, submits (s18); rD
//          declares competing interests and submits (s28)
//   l16    (L16a) the row's "Edit" window: the review due date typed from the
//          keyboard as YYYY-MM-DD (ed on rA; se on rA2), MM/DD/YYYY (ed on rA2,
//          control) and set with fill() (ed on rA, the automation path); each
//          read on the page, after a reload, and in the change-notice email;
//          the window left once with a typed, unsaved date
//   l18    (L18, L19, L28a) "Read Review" on s18 opened 8 times as ed and 3 as se,
//          "Reviewer Files" read at settle and 3 s on, with the files traffic;
//          "Download Review Form" on s18 (free form), s19 (form), s28b (B, seeded
//          free form); the competing-interests lines on s18, s28 and s28b
//   l27    (L27a) "Resend Review Request" on a declined row, then Activity Log
//   l32    (L32b) "Add Reviewer" › search › "Select Reviewer" on A (active form)
//          and B (no form), clicked at once and hand-paced; the letter read 5 s on;
//          the window then left with the selection unsaved
//   l32t   (opt-in, PHASES=l32t on a seeded RUN) how long the letter editor takes
//          to initialise after the window opens, three openings per context
//   l39    (L39c, OMP) an external-only reviewer on an Internal Review round:
//          opening list, searched, selected from the list and added; his list
//   l73    (L73) "Unassign Reviewer" (rF, invited) and "Cancel Reviewer" (rG,
//          accepted) with a review discussion each; rH's discussion the control
//   l125   (L125) "Add Reviewer" entries of rT (assigned today in A), rY (1 day),
//          rZ (2 days), rN (never), read in B's and A's windows, collapsed and expanded
//
//   RUN=r1 PROBE_FEATURE=U27 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U27/I28/i28.js
//   RUN=r2 …  (a second, independent run: its own scratch contexts and facts names)
// OPS is skipped (no review stage; its absence is U26's).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'rev', 'l16', 'l18', 'l27', 'l32', 'l39', 'l73', 'l125'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const pad = (n) => String(n).padStart(2, '0');
const dayObj = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const ymd = (n) => { const d = dayObj(n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const mdy = (n) => { const d = dayObj(n); return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`; };
const T = 30000;

const NAMES = {
    ed: ['Edna', 'Chief'], se: ['Seth', 'Subeditor'], au: ['Ava', 'Author'],
    rA: ['Rae', 'Typedate'], rA2: ['Ron', 'Otherdate'], rB: ['Rita', 'Filer'], rC: ['Rolf', 'Former'],
    rD: ['Rosa', 'Declarer'], rE: ['Remy', 'Resent'], rF: ['Rhea', 'Invitee'], rG: ['Reza', 'Accepter'],
    rH: ['Ruth', 'Stayer'], rS: ['Sam', 'Spare'], rT: ['Tara', 'Sameday'], rY: ['Yuri', 'Oneday'],
    rZ: ['Zoe', 'Twodays'], rX: ['Xavi', 'Externalonly'], rI: ['Ines', 'Internal'],
    eb: ['Ebba', 'Bchief'], ab: ['Abe', 'Bauthor'], rN: ['Nina', 'Neverassigned'], rW: ['Walt', 'Bfree'],
};
const full = (k) => NAMES[k].join(' ');
const person = (t, k, roles) => ({username: `${t}${k.toLowerCase()}`, roles, givenName: NAMES[k][0], familyName: NAMES[k][1]});
const FORM = 'I28 Form';
const CI_TEXT = 'I28 declared interest: I co-authored with the first author in 2024.';
const FILE_NAME = 'i28-reviewer-file.txt';

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[i28] ops: no review stage; skipped'); return; }
    const A = app.name;
    const isOMP = A === 'omp';
    const sf = path.join(outDir(), `i28-state-${RUN}-${A}.json`);
    const st = fs.existsSync(sf) && !on('seed') ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(st, null, 2));
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record(`${RUN}-facts`, {[k]: v}, {merge: true}); console.log(`[${RUN} ${A}] ${k}:`, JSON.stringify(v).slice(0, 900)); };
    const log = (...a) => console.log(`[${RUN} ${A}]`, ...a);
    async function sect(name, fn) {
        try { await fn(); } catch (e) { log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 5).join(' | ')); fact(`${name} FAILED`, String(e.message || e).slice(0, 600)); }
    }

    // ---- seed -------------------------------------------------------------
    if (on('seed')) {
        const t = tag('u27i28');
        const u = (k) => `${t}${k.toLowerCase()}`;
        const tb = `${t}b`;
        st.t = t; st.u = {};
        for (const k of Object.keys(NAMES)) st.u[k] = u(k);
        const revs = ['rA', 'rA2', 'rB', 'rC', 'rD', 'rE', 'rF', 'rG', 'rH', 'rS', 'rT', 'rY', 'rZ'];
        const usersA = [person(t, 'ed', ['editor']), person(t, 'se', ['sectionEditor']), person(t, 'au', ['author']),
            ...revs.map((k) => person(t, k, ['externalReviewer']))];
        if (isOMP) usersA.push(person(t, 'rX', ['externalReviewer']), person(t, 'rI', ['internalReviewer']));
        const CA = await app.api.createContext({
            tag: t, context: {name: `I28 A ${t}`}, users: usersA,
            review: {competingInterests: {en: 'I28 competing interests policy: disclose any relationship with the authors.'}},
            reviewForms: [{title: {en: FORM}, elements: [{question: {en: 'I28 question one'}, type: 'textarea'}]}],
        });
        st.A = CA.path;
        const CB = await app.api.createContext({
            tag: tb, context: {name: `I28 B ${t}`},
            users: [person(t, 'eb', ['editor']), person(t, 'ab', ['author']), person(t, 'rN', ['externalReviewer']), person(t, 'rW', ['externalReviewer']),
                {username: u('rT'), roles: ['externalReviewer']}, {username: u('rY'), roles: ['externalReviewer']}, {username: u('rZ'), roles: ['externalReviewer']}],
        });
        st.B = CB.path;
        const sub = async (key, ctx, submitter, extra) => {
            const r = await app.api.createSubmission({tag: `${t}${key}`, context: ctx, submitter, title: `I28 ${key} ${t}`, ...extra});
            st[key] = {id: r.submissionId, rounds: r.reviewRounds, ra: r.reviewAssignments, tasks: r.tasks, title: `I28 ${key} ${t}`};
        };
        const ext = {decisions: ['sendExternalReview']};
        const seP = {participants: [{username: u('se'), role: 'sectionEditor'}]};
        await sub('s16', st.A, u('au'), {...ext, ...seP, reviewRounds: [{reviewers: [{username: u('rA'), status: 'accepted'}, {username: u('rA2'), status: 'accepted'}]}]});
        await sub('s18', st.A, u('au'), {...ext, ...seP, reviewRounds: [{reviewers: [{username: u('rB'), status: 'invited'}]}]});
        await sub('s19', st.A, u('au'), {...ext, reviewRounds: [{reviewers: [{username: u('rC'), status: 'completed', reviewForm: FORM}]}]});
        await sub('s28', st.A, u('au'), {...ext, reviewRounds: [{reviewers: [{username: u('rD'), status: 'invited'}]}]});
        await sub('s27', st.A, u('au'), {...ext, reviewRounds: [{reviewers: [{username: u('rE'), status: 'declined'}]}]});
        const D = (title, who) => ({title, creator: u('ed'), participants: [u('ed'), u(who)], stage: 'review', message: `${title} first message`});
        try {
            await sub('s73', st.A, u('au'), {...ext, reviewRounds: [{reviewers: [{username: u('rF'), status: 'invited'}, {username: u('rG'), status: 'accepted'}, {username: u('rH'), status: 'accepted'}]}],
                tasks: [D('I28 D-F', 'rF'), D('I28 D-G', 'rG'), D('I28 D-H', 'rH')]});
        } catch (e) { fact('seed s73 refused', String(e.message).slice(0, 600)); }
        await sub('s32', st.A, u('au'), {...ext});
        await sub('s125', st.A, u('au'), {...ext, reviewRounds: [{reviewers: [{username: u('rT'), status: 'invited'},
            {username: u('rY'), status: 'completed', dateCompleted: ymd(-1)}, {username: u('rZ'), status: 'completed', dateCompleted: ymd(-2)}]}]});
        if (isOMP) await sub('s39', st.A, u('au'), {decisions: ['sendInternalReview']});
        await sub('s32b', st.B, u('ab'), {...ext});
        await sub('s28b', st.B, u('ab'), {...ext, reviewRounds: [{reviewers: [{username: u('rW'), status: 'completed'}]}]});
        st.seededAt = new Date().toISOString();
        save();
        fact('seed', {A: st.A, B: st.B, subs: Object.fromEntries(Object.entries(st).filter(([k]) => /^s\d/.test(k)).map(([k, v]) => [k, {id: v.id, rounds: v.rounds}]))});
    }
    if (!st.t) { log('no state; run the seed phase'); return; }
    const u = st.u;

    const {page, close} = await launch(app);
    const dialogsSeen = [];
    page.on('dialog', async (d) => { dialogsSeen.push({type: d.type(), message: d.message(), url: page.url(), at: new Date().toISOString()}); log('[browser dialog]', d.type(), flat(d.message(), 160)); await d.accept().catch(() => {}); });
    const traffic = [];
    page.on('response', async (r) => {
        const url = r.url();
        if (!/\/api\/v1\/|\$\$\$call\$\$\$|\/grid\/|reviewer\/|users\/reviewers/.test(url)) return;
        const op = (url.split('?')[0].split('/').pop() || '').replace(/-/g, '').toLowerCase();
        const e = {at: Date.now(), method: r.request().method(), status: r.status(), op, url: url.replace(/^https?:\/\/[^/]+/, '').slice(0, 220)};
        if (/\/files[/?]|reviewAssignments\/\d+/.test(url) && r.request().method() === 'GET') {
            try { const j = await r.json(); e.items = Array.isArray(j) ? j.length : (j && Array.isArray(j.items) ? j.items.length : undefined); e.itemsMax = j && j.itemsMax; if (j && j.items) e.names = j.items.map((i) => (i.name && (i.name.en || Object.values(i.name)[0])) || i.id).slice(0, 5); } catch (_) { /* not json */ }
        }
        if (/^(update\w*|fetchtemplatebody|reloadreviewerform)$/.test(op) && r.request().method() === 'POST') {
            try { const j = await r.json(); e.jsonStatus = j.status; e.content = flat(typeof j.content === 'string' ? j.content.replace(/<[^>]+>/g, ' ') : JSON.stringify(j.content), 200); } catch (_) { /* not json */ }
        }
        traffic.push(e);
    });
    const since = (t0) => traffic.filter((e) => e.at >= t0).map(({at, ...rest}) => ({ms: at - t0, ...rest}));
    let snapN = 0;
    async function snap(label, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) Object.assign(s, extra);
        const name = `${RUN}-${String(++snapN).padStart(3, '0')}-${label}`;
        record(name, s);
        await shot(page, name).catch(() => {});
        return {name: `${name}-${A}`, s};
    }
    const as = async (who, ctx) => { await signIn(page, u[who], {contextPath: ctx}); await idle(page); };
    const wfUrl = (ctx, s, round = 0) => app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${s.id}${s.rounds && s.rounds[round] ? `&workflowMenuKey=workflow_${s.rounds[round].stageId}_${s.rounds[round].id}` : ''}`);
    const wf = () => page.locator('[role="dialog"]:visible').first();
    async function openWf(ctx, s, {rowOf} = {}) {
        await page.goto(wfUrl(ctx, s)); await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.getByRole('button', {name: 'Add Reviewer', exact: true}).first().waitFor({timeout: T}).catch(() => log('no Add Reviewer button'));
        if (rowOf) await row(rowOf).waitFor({timeout: T}).catch(() => log('no row', rowOf));
        await idle(page);
    }
    const row = (k) => page.getByRole('table', {name: 'Reviewers', exact: true}).getByRole('row').filter({hasText: full(k)}).first();
    const rowText = async (k) => (await row(k).count() ? flat(await row(k).innerText(), 300) : '(no row)');
    async function menu(k) {
        const r = row(k);
        await r.getByRole('button', {name: /More Actions/}).first().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        return (await page.getByRole('menuitem').allInnerTexts()).map((x) => x.trim());
    }
    async function closeMenu(k) { await row(k).getByRole('button', {name: /More Actions/}).first().click().catch(() => {}); await page.getByRole('menu').waitFor({state: 'hidden', timeout: 5000}).catch(() => {}); }
    async function menuAction(k, entry) {
        const items = await menu(k);
        if (!items.includes(entry)) { await closeMenu(k); return {items, absent: true}; }
        await page.getByRole('menuitem', {name: entry, exact: true}).click();
        await idle(page);
        return {items};
    }
    const legacy = (formId) => page.getByRole('dialog').filter({has: page.locator(`form#${formId}`)}).last();
    async function mceReady(scopeSel) {
        await page.waitForFunction((sel) => {
            const ta = [...document.querySelectorAll(`${sel} textarea`)].pop();
            const mce = window.tinyMCE || window.tinymce;
            return !ta || !!(mce && mce.get(ta.id) && mce.get(ta.id).initialized);
        }, scopeSel, {timeout: 20000}).catch(() => {});
    }
    async function notices() { return page.locator('.app__notifications .pkpNotification, .pkp_notification').allInnerTexts().catch(() => []); }

    try {
        // ---- rev: reviewer drives (s18 with file + "no interests"; s28 with declared interests)
        if (on('rev')) await sect('rev', async () => {
            const {ReviewWizardPage} = require(path.resolve(__dirname, '../../../pages/ReviewerPages.js'));
            for (const [key, who, declare] of [['s18', 'rB', false], ['s28', 'rD', true]]) {
                if (st[key].reviewed) continue;
                await as(who, st.A);
                const w = new ReviewWizardPage(page, st.A, {privateBoxLabel: isOMP ? 'For editor only' : 'For editor'});
                await w.goto(st[key].id);
                await idle(page);
                const ciRadios = await page.locator('input[name="competingInterestOption"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim()})));
                const s1 = await snap(`rev-${key}-step1`);
                if (declare) {
                    await w.hasCompetingInterestsRadio.check();
                    await w.competingInterestsFrame.first().waitFor({state: 'visible', timeout: 15000}).catch(() => {});
                    await w.typeInto(w.competingInterestsBody.first(), CI_TEXT);
                }
                await w.accept();
                await w.continueToStep3();
                if (!declare) {
                    await w.uploadReviewerFile(FILE_NAME);
                }
                await w.typeComments(`I28 ${key} comments for author and editor.`);
                if (!isOMP) await w.chooseRecommendation('Accept Submission');
                const s3 = await snap(`rev-${key}-step3`);
                await w.submitReview();
                await w.expectCompleted().catch(() => {});
                const s4 = await snap(`rev-${key}-step4`);
                st[key].reviewed = true; save();
                fact(`rev ${key}`, {ciRadiosOnStep1: ciRadios, declared: declare, snaps: [s1.name, s3.name, s4.name]});
            }
        });

        // ---- l16: the Edit window's typed review due date ---------------
        if (on('l16')) await sect('l16', async () => {
            const s = st.s16;
            const readEdit = async (label) => {
                const m = legacy('editReviewForm');
                await m.locator('input[name="isReviewPubliclyVisible"]').waitFor({timeout: T});
                await idle(page);
                const v = await m.evaluate((el) => {
                    const g = (sel) => el.querySelector(sel);
                    const vis = (n) => g(`input[name="${n}-removed"]`); const hid = (n) => g(`input[type="hidden"][name="${n}"]`);
                    return {responseVisible: vis('responseDueDate')?.value, responseHidden: hid('responseDueDate')?.value,
                        reviewVisible: vis('reviewDueDate')?.value, reviewHidden: hid('reviewDueDate')?.value,
                        dateFormat: hid('reviewDueDate')?.getAttribute('data-date-format'),
                        labels: [...el.querySelectorAll('label')].map((l) => l.innerText.trim()).filter(Boolean).slice(0, 12)};
                });
                const sn = await snap(label, {editValues: v});
                return {...v, snap: sn.name};
            };
            const openEdit = async (k) => { const a = await menuAction(k, 'Edit'); const m = legacy('editReviewForm'); await m.locator('input[name="isReviewPubliclyVisible"]').waitFor({timeout: T}); await idle(page); return a; };
            const cancelEdit = async () => { const m = legacy('editReviewForm'); await m.getByRole('link', {name: 'Cancel'}).or(m.getByRole('button', {name: 'Cancel', exact: true})).first().click(); await sleep(800); await idle(page); };
            const typeDate = async (m, value, how) => {
                const box = m.locator('input[name="reviewDueDate-removed"]');
                if (how === 'fill') { await box.fill(value); }
                else { await box.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete'); await page.keyboard.type(value, {delay: 60}); await page.keyboard.press('Tab'); }
                await sleep(400);
                return m.evaluate((el) => ({visible: el.querySelector('input[name="reviewDueDate-removed"]').value, hidden: el.querySelector('input[type="hidden"][name="reviewDueDate"]').value, pickerShown: !!document.querySelector('#ui-datepicker-div') && getComputedStyle(document.querySelector('#ui-datepicker-div')).display !== 'none'}));
            };
            const mailTo = async (k) => { const r = await app.mail._search({to: `${u[k]}@mail.test`}).catch(() => ({messages: []})); return (r.messages || []).map((m) => ({id: m.ID, subject: m.Subject, created: m.Created})); };
            const mailFull = async (id) => { const m = await app.mail.fullMessage(id); return flat(m.Text, 1200); };

            const trial = async (who, k, value, how, label) => {
                await as(who, st.A);
                await openWf(st.A, s, {rowOf: k});
                const before = {row: await rowText(k)};
                const mailBefore = (await mailTo(k)).map((m) => m.id);
                await openEdit(k);
                before.edit = await readEdit(`l16-${label}-before`);
                const m = legacy('editReviewForm');
                const afterType = await typeDate(m, value, how);
                const typedSnap = await snap(`l16-${label}-typed`, {afterType});
                const t0 = Date.now();
                await m.getByRole('button', {name: 'OK', exact: true}).click();
                await m.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: 20000}).catch(() => log('edit form still open'));
                await sleep(1500); await idle(page);
                const post = since(t0).filter((e) => e.op === 'updatereview');
                const sameRow = await rowText(k);
                const sameSnap = await snap(`l16-${label}-after-same-page`);
                // reopen on the same page
                await openEdit(k);
                const reopenSame = await readEdit(`l16-${label}-reopen-same-page`);
                await cancelEdit();
                // after a reload
                await page.reload(); await idle(page);
                await openWf(st.A, s, {rowOf: k});
                const reloadRow = await rowText(k);
                await openEdit(k);
                const reopenReload = await readEdit(`l16-${label}-reopen-after-reload`);
                await cancelEdit();
                await sleep(2500);
                const newMail = (await mailTo(k)).filter((mm) => !mailBefore.includes(mm.id));
                const mails = [];
                for (const mm of newMail.slice(0, 3)) mails.push({subject: mm.subject, text: await mailFull(mm.id)});
                const out = {who, reviewer: k, typed: value, how, before, afterType, typedSnap: typedSnap.name, post, sameRow, sameSnap: sameSnap.name, reopenSame, reloadRow, reopenReload, mails,
                    savedYmd: reopenReload.reviewHidden, expectYmd: how === 'mdy' ? null : value};
                fact(`L16 ${label}`, out);
                return out;
            };
            // Sweep first: leave the window with a typed, unsaved date.
            await as('ed', st.A);
            await openWf(st.A, s, {rowOf: 'rA'});
            await openEdit('rA');
            const pre = await readEdit('l16-leave-before');
            const m = legacy('editReviewForm');
            await typeDate(m, ymd(33), 'keys');
            const t0 = Date.now(); const d0 = dialogsSeen.length;
            await m.getByRole('link', {name: 'Cancel'}).or(m.getByRole('button', {name: 'Cancel', exact: true})).first().click();
            await sleep(1200);
            const askedVue = await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').filter({hasText: /changed|Warning|unsaved/i}).allInnerTexts().catch(() => []);
            const leaveSnap = await snap('l16-leave-after-cancel');
            let answered = null;
            if (askedVue.length) {
                const d = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').filter({hasText: /changed|Warning|unsaved/i}).last();
                const btns = await d.getByRole('button').allInnerTexts();
                const yes = d.getByRole('button', {name: /^(Yes|OK)$/}).first();
                if (await yes.count()) { await yes.click(); answered = 'Yes'; await sleep(800); }
                answered = {buttons: btns, pressed: answered};
            }
            const stillOpen = await legacy('editReviewForm').locator('form#editReviewForm').isVisible().catch(() => false);
            await page.reload(); await idle(page);
            await openWf(st.A, s, {rowOf: 'rA'});
            await openEdit('rA');
            const post = await readEdit('l16-leave-reopen');
            await cancelEdit();
            fact('L16 sweep leave', {before: {reviewHidden: pre.reviewHidden, reviewVisible: pre.reviewVisible, dateFormat: pre.dateFormat, labels: pre.labels}, browserDialogs: dialogsSeen.slice(d0), vueDialogs: askedVue.map((x) => flat(x, 300)), answered, stillOpen, afterReopen: {reviewHidden: post.reviewHidden, reviewVisible: post.reviewVisible}, requests: since(t0).filter((e) => e.op === 'updatereview'), snap: leaveSnap.name});

            await trial('ed', 'rA', ymd(40), 'keys', 'ed-rA-ymd-keys');
            await trial('ed', 'rA2', mdy(45), 'mdy', 'ed-rA2-mdy-keys');
            await trial('se', 'rA2', ymd(50), 'keys', 'se-rA2-ymd-keys');
            await trial('ed', 'rA', ymd(55), 'fill', 'ed-rA-ymd-fill');
            if (RUN === 'r1') note(`ccI28 [${A}] · Reviewers row › "Edit" (form#editReviewForm): the visible date box is \`input[name="reviewDueDate-removed"]\`, the posted value the hidden \`input[type=hidden][name="reviewDueDate"]\` (data-date-format on it); keyboard typing (click, Control+A, Delete, type, Tab) updates the hidden field, \`fill()\` does not. The bottom "Cancel" is a link.`);
        });

        // ---- l18 / l19 / l28a: Review Details --------------------------
        if (on('l18')) await sect('l18', async () => {
            const rd = () => page.getByRole('dialog', {name: /^Review Details:/}).last();
            const readRD = async (label, settleText) => {
                const d = rd();
                await d.waitFor({timeout: T});
                const t0 = Date.now();
                await d.getByRole('button', {name: 'Modify Review', exact: true}).waitFor({timeout: T}).catch(() => {});
                await page.waitForFunction(() => { const dd = [...document.querySelectorAll('[role=dialog]')].filter((x) => /^Review Details:/.test(x.getAttribute('aria-label') || x.innerText)).pop() || [...document.querySelectorAll('[role=dialog]')].pop(); const b = [...dd.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Modify Review'); return b && !b.disabled; }, null, {timeout: T}).catch(() => {});
                if (settleText) await d.getByText(settleText).first().waitFor({timeout: 15000}).catch(() => {});
                const settleMs = Date.now() - t0;
                const read = async () => d.evaluate((el) => {
                    const txt = el.innerText;
                    const i = txt.indexOf('Reviewer Files');
                    let seg = i >= 0 ? txt.slice(i, i + 500) : null;
                    if (seg) { const cut = seg.search(/Reviewer Recommendation|Reviewer rating/); if (cut > 0) seg = seg.slice(0, cut); seg = seg.replace(/^Reviewer Files\s*Any supporting files the reviewer chose to upload\.\s*Reviewer Files\s*NO\s*FILE NAME\s*DATE UPLOADED\s*TYPE\s*MORE ACTIONS\s*/, '[grid] '); }
                    const hs = [...el.querySelectorAll('h1,h2,h3,legend')].map((h) => h.innerText.trim()).filter(Boolean);
                    const ciH = [...el.querySelectorAll('h2')].find((h) => h.innerText.trim() === 'Competing Interests');
                    const dl = [...el.querySelectorAll('button')].find((b) => /Download Review Form/.test(b.innerText) || /Download Review Form/.test(b.getAttribute('aria-label') || ''));
                    return {reviewerFiles: seg, headings: hs.slice(0, 30), competingInterests: ciH ? ciH.parentElement.innerText.trim().slice(0, 300) : null,
                        noCompetingLine: txt.includes('No competing interests were disclosed.'), downloadButton: dl ? (dl.innerText.trim() || dl.getAttribute('aria-label')) : null, textLen: txt.length};
                });
                const r0 = await read();
                const r0At = Date.now();
                await idle(page);
                const rIdle = await read();
                const rIdleAt = Date.now();
                await sleep(3000);
                const r3 = await read();
                const sn = await snap(label);
                return {settleMs, r0At, rIdleAt, atSettle: r0, afterIdle: {reviewerFiles: rIdle.reviewerFiles}, after3s: {reviewerFiles: r3.reviewerFiles}, snap: sn.name, dialogText: flat(sn.s.text && sn.s.text.dialog, 1600)};
            };
            const closeRD = async () => { const d = rd(); await d.getByRole('button', {name: 'Cancel', exact: true}).last().click().catch(() => {}); await d.waitFor({state: 'hidden', timeout: 15000}).catch(() => {}); await sleep(700); await idle(page); };
            const openRD = async (k, via) => {
                if (via === 'button') await row(k).getByRole('button', {name: 'Read Review', exact: true}).click();
                else await menuAction(k, 'Review Details');
            };
            const downloadMenu = async () => {
                const d = rd();
                const b = d.getByRole('button', {name: /Download Review Form/});
                if (!(await b.count())) return {button: 0};
                await loc(page, 'Review Details: "Download Review Form" menu button', b.first());
                await b.first().click(); await sleep(600);
                const items = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => x.trim());
                const sn = await snap('l19-download-menu-open');
                await b.first().click().catch(() => {}); await sleep(400);
                return {button: await b.count(), items, snap: sn.name};
            };
            // s18 as ed: 8 openings (via "Read Review" once the row offers it; the first opening marks it viewed)
            await as('ed', st.A);
            const runs = {ed: [], se: []};
            for (let i = 1; i <= 8; i++) {
                await openWf(st.A, st.s18, {rowOf: 'rB'});
                const rt = await rowText('rB');
                const t0 = Date.now();
                await openRD('rB', (await row('rB').getByRole('button', {name: 'Read Review', exact: true}).count()) ? 'button' : 'menu');
                const r = await readRD(`l18-ed-open${i}`, `I28 s18 comments`);
                r.traffic = since(t0).filter((e) => /files|reviewAssignments|\/review\b|reviews/.test(e.url));
                r.readMs = {atSettle: r.r0At - t0, afterIdle: r.rIdleAt - t0};
                r.row = rt;
                if (i === 1) { r.download = await downloadMenu(); await loc(page, 'Review Details dialog', rd()); }
                runs.ed.push(r);
                await closeRD();
            }
            fact('L18 ed openings', runs.ed.map((r) => ({settleMs: r.settleMs, files: flat(r.atSettle.reviewerFiles, 120), filesIdle: flat(r.afterIdle.reviewerFiles, 120), files3s: flat(r.after3s.reviewerFiles, 120), readMs: r.readMs, traffic: r.traffic.map((e) => `${e.method} ${e.status} ${e.url.slice(0, 110)} ${e.items != null ? `items=${e.items}` : ''} ${e.ms}ms`), snap: r.snap})));
            fact('L28a s18 (no interests ticked)', {competingInterests: runs.ed[0].atSettle.competingInterests, noCompetingLine: runs.ed[0].atSettle.noCompetingLine, headings: runs.ed[0].atSettle.headings, row: runs.ed[0].row});
            fact('L19 s18 free-form', {download: runs.ed[0].download, button: runs.ed[0].atSettle.downloadButton});
            fact('L18 s18 window text (opening 1)', runs.ed[0].dialogText);
            await as('se', st.A);
            for (let i = 1; i <= 3; i++) {
                await openWf(st.A, st.s18, {rowOf: 'rB'});
                const t0 = Date.now();
                await openRD('rB', (await row('rB').getByRole('button', {name: 'Read Review', exact: true}).count()) ? 'button' : 'menu');
                const r = await readRD(`l18-se-open${i}`, `I28 s18 comments`);
                r.traffic = since(t0).filter((e) => /files|reviewAssignments|\/review\b|reviews/.test(e.url));
                r.readMs = {atSettle: r.r0At - t0, afterIdle: r.rIdleAt - t0};
                runs.se.push(r);
                await closeRD();
            }
            fact('L18 se openings', runs.se.map((r) => ({settleMs: r.settleMs, files: flat(r.atSettle.reviewerFiles, 120), filesIdle: flat(r.afterIdle.reviewerFiles, 120), files3s: flat(r.after3s.reviewerFiles, 120), readMs: r.readMs, traffic: r.traffic.map((e) => `${e.method} ${e.status} ${e.url.slice(0, 110)} ${e.items != null ? `items=${e.items}` : ''} ${e.ms}ms`), snap: r.snap})));
            // s19 (form) and s28 (declared) as ed
            await as('ed', st.A);
            for (const [key, k, label] of [['s19', 'rC', 'l19-form'], ['s28', 'rD', 'l28-declared']]) {
                await openWf(st.A, st[key], {rowOf: k});
                const rt = await rowText(k);
                await openRD(k, (await row(k).getByRole('button', {name: 'Read Review', exact: true}).count()) ? 'button' : 'menu');
                const r = await readRD(label, null);
                r.download = await downloadMenu();
                fact(`${label}`, {row: rt, download: r.download, competingInterests: r.atSettle.competingInterests, noCompetingLine: r.atSettle.noCompetingLine, headings: r.atSettle.headings, reviewerFiles: r.atSettle.reviewerFiles, snap: r.snap, text: flat(r.dialogText, 900)});
                await closeRD();
            }
            // B: seeded free-form review, no policy
            await as('eb', st.B);
            await openWf(st.B, st.s28b, {rowOf: 'rW'});
            const rtb = await rowText('rW');
            await openRD('rW', (await row('rW').getByRole('button', {name: 'Read Review', exact: true}).count()) ? 'button' : 'menu');
            const rb = await readRD('l28-b-nopolicy', null);
            rb.download = await downloadMenu();
            fact('l28-b-nopolicy', {row: rtb, download: rb.download, competingInterests: rb.atSettle.competingInterests, noCompetingLine: rb.atSettle.noCompetingLine, headings: rb.atSettle.headings, snap: rb.snap});
            await closeRD();
            if (RUN === 'r1') note(`ccI28 [${A}] · Review Details window: \`getByRole('dialog', {name: /^Review Details:/})\`; settled when "Modify Review" is enabled; "Download Review Form" is a button (DropdownActions) whose entries are page-level \`menuitem\`s, closed by pressing the button again; the competing-interests block is an h2 "Competing Interests" under the reviewer's name.`);
        });

        // ---- l27: resend a declined request, then the Activity Log ----
        if (on('l27')) await sect('l27', async () => {
            await as('ed', st.A);
            await openWf(st.A, st.s27, {rowOf: 'rE'});
            const before = await rowText('rE');
            const a = await menuAction('rE', 'Resend Review Request');
            const m = legacy('resendRequestReviewerForm');
            await m.waitFor({timeout: T});
            await mceReady('#resendRequestReviewerForm');
            await idle(page);
            const win = await snap('l27-resend-window');
            const t0 = Date.now();
            await m.getByRole('button', {name: 'Resend Review Request', exact: true}).click();
            await m.locator('form#resendRequestReviewerForm').waitFor({state: 'hidden', timeout: 20000}).catch(() => log('resend window still open'));
            await sleep(1200); await idle(page);
            const shown = await snap('l27-after-resend');
            const after = await rowText('rE');
            const menuAfter = await menu('rE'); await closeMenu('rE');
            // Activity Log
            await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
            const logd = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'}).last();
            await logd.getByRole('row').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            const lines = (await logd.getByRole('row').allInnerTexts()).map((x) => flat(x, 300));
            const logSnap = await snap('l27-activity-log');
            await loc(page, 'Activity Log: the resend line', logd.getByRole('row').filter({hasText: 'Resent the request'}));
            fact('L27a', {rowBefore: before, menuBefore: a.items, windowSnap: win.name, requests: since(t0).filter((e) => /resend/.test(e.op)), notices: shown.s.notices, rowAfter: after, menuAfter, resendLines: lines.filter((l) => /Resent|resent/.test(l)), rawPlaceholders: lines.filter((l) => /\{\$\w+\}/.test(l)), logSnap: logSnap.name, allLines: lines.slice(0, 12)});
        });

        // ---- l32: the request letter after "Select Reviewer" --------------
        if (on('l32')) await sect('l32', async () => {
            const addWin = () => page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')}).last();
            const letter = () => page.evaluate(() => {
                const ta = document.querySelector('#reviewerFormFooter textarea[name="personalMessage"]') || [...document.querySelectorAll('textarea[name="personalMessage"]')].pop();
                const mce = window.tinyMCE || window.tinymce;
                const ed = ta && mce && mce.get(ta.id);
                return {textarea: !!ta, editor: !!ed, initialized: !!(ed && ed.initialized), shown: ed && ed.getBody() ? ed.getBody().innerText.trim().slice(0, 300) : null, length: ed ? ed.getContent().length : null, textareaValueLength: ta ? ta.value.length : null};
            });
            const drive = async (ctxKey, s, who, spare, mode) => {
                await as(who, st[ctxKey]);
                await openWf(st[ctxKey], s);
                const c0 = page.listenerCount('console');
                const consoleMsgs = [];
                const onC = (msg) => consoleMsgs.push(`${msg.type()}: ${msg.text().slice(0, 200)}`);
                page.on('console', onC);
                const t0 = Date.now();
                await page.getByRole('button', {name: 'Add Reviewer', exact: true}).first().click();
                const w = addWin();
                await w.locator('.listPanel--selectReviewer input.pkpSearch__input').waitFor({timeout: T});
                const box = w.locator('.listPanel--selectReviewer input.pkpSearch__input');
                await box.fill(full(spare)); await box.press('Enter');
                const item = w.locator('.listPanel--selectReviewer .listPanel__item').filter({hasText: full(spare)}).first();
                await item.waitFor({timeout: T});
                if (mode === 'paced') { await page.waitForFunction(() => { const ta = document.querySelector('#reviewerFormFooter textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !!(ta && mce && mce.get(ta.id) && mce.get(ta.id).initialized); }, null, {timeout: T}).catch(() => {}); await sleep(2500); await idle(page); }
                const atClick = await letter();
                const tClick = Date.now();
                await item.getByRole('button', {name: `Select ${full(spare)}`}).click();
                await sleep(5000);
                const after5 = await letter();
                const formSelect = await w.locator('select[name="reviewFormId"]').evaluate((el) => [...el.options].map((o) => `${o.selected ? '*' : ''}${o.text}`)).catch(() => null);
                const sn = await snap(`l32-${ctxKey}-${mode}-after5s`, {letter: after5});
                // sweep: leave the window with the selection unsaved ("Cancel" link at the bottom, else the header Close)
                const d0 = dialogsSeen.length;
                const cancel = w.getByRole('link', {name: 'Cancel'}).or(w.getByRole('button', {name: 'Cancel', exact: true})).last();
                const hadCancel = await cancel.count();
                if (hadCancel) await cancel.click(); else await w.getByRole('button', {name: 'Close', exact: true}).first().click();
                await sleep(1200);
                const asked = await page.locator('[role="dialog"]:visible').filter({hasText: /changed|Warning/i}).allInnerTexts().catch(() => []);
                const leave = await snap(`l32-${ctxKey}-${mode}-after-leave`);
                if (asked.length) { const d = page.locator('[role="dialog"]:visible').filter({hasText: /changed|Warning/i}).last(); const y = d.getByRole('button', {name: /^(Yes|OK)$/}).first(); if (await y.count()) await y.click(); await sleep(800); }
                page.off('console', onC);
                const reqs = since(tClick).map((e) => `${e.method} ${e.status} ${e.url.slice(0, 120)}${e.jsonStatus != null ? ` status=${e.jsonStatus}` : ''} ${e.ms}ms`);
                fact(`L32 ${ctxKey} ${mode}`, {who, spare, atClick, after5, formSelect, requests: reqs.slice(0, 12), console: consoleMsgs.filter((x) => !/^(debug|log|info)/.test(x)).slice(0, 10), snap: sn.name, leave: {usedCancel: !!hadCancel, browserDialogs: dialogsSeen.slice(d0), vueDialogs: asked.map((x) => flat(x, 200)), snap: leave.name}});
                if (RUN === 'r1' && ctxKey === 'A' && mode === 'fast') await loc(page, 'Add Reviewer: search box', page.locator('.listPanel--selectReviewer input.pkpSearch__input'));
            };
            await drive('A', st.s32, 'ed', 'rS', 'fast');
            await drive('A', st.s32, 'ed', 'rS', 'paced');
            await drive('B', st.s32b, 'eb', 'rN', 'fast');
            await drive('B', st.s32b, 'eb', 'rN', 'paced');
        });

        // ---- l32t (opt-in, PHASES=l32t): how long the letter editor takes to initialise after the window opens
        if (PHASES.includes('l32t')) await sect('l32t', async () => {
            const addWin = () => page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')}).last();
            const out = [];
            for (const [ctxKey, s, who] of [['A', st.s32, 'ed'], ['B', st.s32b, 'eb']]) {
                await as(who, st[ctxKey]);
                for (let i = 0; i < 3; i++) {
                    await openWf(st[ctxKey], s);
                    await page.getByRole('button', {name: 'Add Reviewer', exact: true}).first().click();
                    await addWin().locator('.listPanel--selectReviewer input.pkpSearch__input').waitFor({timeout: T});
                    const t0 = Date.now();
                    const firstItem = addWin().locator('.listPanel--selectReviewer .listPanel__item').first();
                    await firstItem.waitFor({timeout: T}).catch(() => {});
                    const listMs = Date.now() - t0;
                    await page.waitForFunction(() => { const ta = document.querySelector('#reviewerFormFooter textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !!(ta && mce && mce.get(ta.id) && mce.get(ta.id).initialized); }, null, {timeout: T, polling: 50}).catch(() => {});
                    out.push({ctx: ctxKey, form: ctxKey === 'A', listVisibleMs: listMs, editorInitialisedMs: Date.now() - t0});
                    await addWin().getByRole('link', {name: 'Cancel'}).or(addWin().getByRole('button', {name: 'Close', exact: true})).first().click().catch(() => {});
                    await sleep(800);
                }
            }
            fact('L32 editor init timing', out);
        });

        // ---- l39 (OMP): an external-only reviewer on an internal round ----
        if (on('l39') && isOMP) await sect('l39', async () => {
            const s = st.s39;
            await as('ed', st.A);
            await openWf(st.A, s);
            const addWin = () => page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')}).last();
            const open = async () => { await page.getByRole('button', {name: 'Add Reviewer', exact: true}).first().click(); await addWin().locator('.listPanel--selectReviewer input.pkpSearch__input').waitFor({timeout: T}); await idle(page); };
            const entries = async () => (await addWin().locator('.listPanel--selectReviewer .listPanel__item').allInnerTexts()).map((x) => flat(x, 90));
            const heading = flat(await wf().locator('h1, h2').first().innerText().catch(() => ''), 120);
            await open();
            const opening = await entries();
            const openSnap = await snap('l39-opening-list');
            const search = async (name) => { const b = addWin().locator('.listPanel--selectReviewer input.pkpSearch__input'); await b.fill(name); await b.press('Enter'); await sleep(1500); await idle(page); const e = await entries(); const empty = await addWin().getByText('No items found.').count(); const sn = await snap(`l39-search-${name.split(' ')[1]}`); return {entries: e, noItemsFound: empty, snap: sn.name}; };
            const sx = await search(full('rX'));
            const si = await search(full('rI'));
            await addWin().getByRole('link', {name: 'Cancel'}).or(addWin().getByRole('button', {name: 'Close', exact: true})).first().click();
            await sleep(1000); await idle(page);
            // reopen, pick rX from the opening list, add
            await openWf(st.A, s);
            await open();
            const item = addWin().locator('.listPanel--selectReviewer .listPanel__item').filter({hasText: full('rX')}).first();
            const inList = await item.count();
            let added = null;
            if (inList) {
                await page.waitForFunction(() => { const ta = document.querySelector('#reviewerFormFooter textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !!(ta && mce && mce.get(ta.id) && mce.get(ta.id).initialized); }, null, {timeout: T}).catch(() => {});
                await sleep(1500);
                await item.getByRole('button', {name: `Select ${full('rX')}`}).click();
                await addWin().locator('#regularReviewerForm').waitFor({timeout: T}).catch(() => {});
                await page.frameLocator('iframe[id^="personalMessage"]').last().locator('body').filter({hasText: /\w/}).waitFor({timeout: T}).catch(() => {});
                await idle(page);
                const form = await snap('l39-request-form');
                const t0 = Date.now();
                await addWin().getByRole('button', {name: 'Add Reviewer', exact: true}).click();
                await sleep(2500); await idle(page);
                const notice = await snap('l39-after-add');
                const rowNow = await rowText('rX');
                await page.reload(); await idle(page); await openWf(st.A, s);
                const rowReload = await rowText('rX');
                const title = flat(await wf().innerText().then((t) => (t.match(/(Internal|External) Review[^\n]*/) || [''])[0]), 120);
                const sr = await snap('l39-row-after-reload');
                added = {formSnap: form.name, requests: since(t0).filter((e) => /update|reviewer/.test(e.op)).map((e) => `${e.method} ${e.status} ${e.url.slice(0, 110)}${e.jsonStatus != null ? ` status=${e.jsonStatus}` : ''}`), notices: notice.s.notices, rowSamePage: rowNow, rowAfterReload: rowReload, stageLine: title, snap: sr.name};
            }
            // his own list
            await as('rX', st.A);
            await page.goto(app.url(`/index.php/${st.A}/dashboard/reviewAssignments`)); await idle(page);
            await page.getByRole('table').first().waitFor({timeout: T}).catch(() => {});
            await sleep(1500); await idle(page);
            const list = await snap('l39-rX-list');
            const hisRow = flat(await page.getByRole('row').filter({hasText: st.s39.title}).first().innerText().catch(() => '(no row)'), 300);
            let wizard = null;
            await page.goto(app.url(`/index.php/${st.A}/reviewer/submission/${s.id}`)); await idle(page);
            const wz = await snap('l39-rX-wizard');
            wizard = {h1: flat(await page.locator('main h1').first().innerText().catch(() => ''), 150), text: flat(wz.s.text && wz.s.text.main, 400)};
            fact('L39c', {workflowHeading: heading, openingList: opening, rXInOpening: opening.some((x) => x.includes(full('rX'))), rIInOpening: opening.some((x) => x.includes(full('rI'))), searchRX: sx, searchRI: si, openSnap: openSnap.name, inListOnReopen: inList, added, hisList: {row: hisRow, snap: list.name}, wizard});
        });

        // ---- l73: unassign / cancel and the review discussions ----------
        if (on('l73')) await sect('l73', async () => {
            if (!st.s73) { fact('L73', 'not seeded'); return; }
            const s = st.s73;
            const ids = Object.fromEntries((s.tasks || []).map((x) => [x.title, x.id]));
            const readParts = async (title, label) => {
                const btn = page.locator('[id^="discussion_name_"]').filter({hasText: title}).first();
                if (!(await btn.count())) return {absent: true, panel: flat(await page.locator('[data-cy="discussion-manager"]').first().innerText().catch(() => 'no panel'), 400)};
                await btn.click();
                const w = page.getByRole('dialog', {name: title, exact: true}).last();
                await w.waitFor({timeout: T}).catch(() => {});
                await w.getByRole('group', {name: 'Details', exact: true}).getByText(/^\d+\. /).first().waitFor({timeout: 15000}).catch(() => {});
                await idle(page);
                const lines = (await w.getByRole('group', {name: 'Details', exact: true}).getByText(/^\d+\. /).allInnerTexts().catch(() => [])).map((x) => x.trim());
                const sn = await snap(label);
                await w.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                await w.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
                await sleep(700);
                return {participants: lines, snap: sn.name};
            };
            await as('ed', st.A);
            await openWf(st.A, s, {rowOf: 'rF'});
            await page.locator('[data-cy="discussion-manager"]').first().waitFor({timeout: T}).catch(() => {});
            const before = {};
            for (const d of ['I28 D-F', 'I28 D-G', 'I28 D-H']) { await openWf(st.A, s, {rowOf: 'rF'}); before[d] = await readParts(d, `l73-before-${d.slice(-1)}`); }
            const act = async (k, entry, formId) => {
                await openWf(st.A, s, {rowOf: k});
                const a = await menuAction(k, entry);
                const m = legacy(formId);
                await m.waitFor({timeout: T});
                await mceReady(`#${formId}`);
                await idle(page);
                const t0 = Date.now();
                await m.getByRole('button', {name: entry, exact: true}).click();
                await m.locator(`form#${formId}`).waitFor({state: 'hidden', timeout: 20000}).catch(() => log(`${entry} window still open`));
                await sleep(1500); await idle(page);
                const sn = await snap(`l73-after-${k}`);
                return {menu: a.items, notices: sn.s.notices, requests: since(t0).filter((e) => /update(unassign|cancel)/.test(e.op)).map((e) => `${e.status} ${e.url.slice(0, 90)} status=${e.jsonStatus}`), rows: {rF: await rowText('rF'), rG: await rowText('rG'), rH: await rowText('rH')}};
            };
            const unF = await act('rF', 'Unassign Reviewer', 'unassignReviewerForm');
            const samePageF = await readParts('I28 D-F', 'l73-same-page-F');
            const caG = await act('rG', 'Cancel Reviewer', 'cancelReviewForm');
            const samePageG = await readParts('I28 D-G', 'l73-same-page-G');
            const after = {};
            for (const d of ['I28 D-F', 'I28 D-G', 'I28 D-H']) { await page.reload(); await idle(page); await openWf(st.A, s, {rowOf: 'rH'}); after[d] = await readParts(d, `l73-reload-${d.slice(-1)}`); }
            fact('L73', {ids, before, unassignF: unF, samePageF, cancelG: caG, samePageG, afterReload: after});
        });

        // ---- l125: "Yesterday" vs "0 Days" -------------------------------
        if (on('l125')) await sect('l125', async () => {
            const addWin = () => page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')}).last();
            const readEntry = async (k, label) => {
                const b = addWin().locator('.listPanel--selectReviewer input.pkpSearch__input');
                await b.fill(full(k)); await b.press('Enter'); await sleep(1500); await idle(page);
                const item = addWin().locator('.listPanel--selectReviewer .listPanel__item').filter({hasText: full(k)}).first();
                if (!(await item.count())) { const sn = await snap(`${label}-none`); return {absent: true, snap: sn.name, list: flat(sn.s.text && sn.s.text.dialog, 300)}; }
                const collapsed = flat(await item.innerText(), 400);
                const toggle = item.getByRole('button', {name: /^Show more details about/}).first();
                let expanded = null; let toggleName = null;
                if (await toggle.count()) { toggleName = (await toggle.getAttribute('aria-label')) || flat(await toggle.innerText(), 60); if (RUN !== 'smoke' && k === 'rT') await loc(page, 'Add Reviewer entry: "Show more details about …"', toggle); await toggle.click(); await sleep(700); expanded = flat(await item.innerText(), 900); }
                const sn = await snap(label);
                const days = expanded ? ((expanded.match(/(\S+) Days since last review assigned/) || expanded.match(/Days since last review assigned\s*(\S+)/) || [])[1] || null) : null;
                const line = (collapsed.replace(full(k), '').match(/(Yesterday|\d+ days ago|Never assigned|Today)/) || [])[1] || null;
                return {collapsed, line, toggleName, expanded, daysFigure: days, snap: sn.name};
            };
            const out = {browserNow: await page.evaluate(() => ({now: new Date().toString(), tzOffsetMin: new Date().getTimezoneOffset()})), nodeNow: new Date().toString()};
            await as('eb', st.B);
            await openWf(st.B, st.s32b);
            await page.getByRole('button', {name: 'Add Reviewer', exact: true}).first().click();
            await addWin().locator('.listPanel--selectReviewer input.pkpSearch__input').waitFor({timeout: T}); await idle(page);
            out.B = {};
            const tr0 = Date.now();
            for (const k of ['rT', 'rY', 'rZ', 'rN']) out.B[k] = await readEntry(k, `l125-B-${k}`);
            out.B.traffic = since(tr0).filter((e) => /users\/reviewers/.test(e.url)).map((e) => `${e.status} ${e.url.slice(0, 140)}`).slice(0, 4);
            await addWin().getByRole('link', {name: 'Cancel'}).or(addWin().getByRole('button', {name: 'Close', exact: true})).first().click().catch(() => {});
            // the same entries in A's own window (the assigning journal)
            await as('ed', st.A);
            await openWf(st.A, st.s32);
            await page.getByRole('button', {name: 'Add Reviewer', exact: true}).first().click();
            await addWin().locator('.listPanel--selectReviewer input.pkpSearch__input').waitFor({timeout: T}); await idle(page);
            out.A = {};
            for (const k of ['rT', 'rY', 'rZ']) out.A[k] = await readEntry(k, `l125-A-${k}`);
            await addWin().getByRole('link', {name: 'Cancel'}).or(addWin().getByRole('button', {name: 'Close', exact: true})).first().click().catch(() => {});
            // the seeded assignment dates as the editor's own API read shows them (the screen's data)
            out.assignments = (st.s125.ra || []).map((r) => ({id: r.id || r.reviewAssignmentId, reviewer: r.reviewerId || r.username, dateAssigned: r.dateAssigned, dateCompleted: r.dateCompleted}));
            fact('L125', out);
            if (RUN === 'r1') note(`ccI28 [${A}] · Add Reviewer list entry: \`.listPanel--selectReviewer .listPanel__item\` filtered by name; the entry's details open through its button "Show more details about {name}"; the collapsed line carries "Yesterday" / "{N} days ago" / "Never assigned".`);
        });
    } finally {
        record(`${RUN}-dialogs`, dialogsSeen);
        record(`${RUN}-traffic`, traffic.map(({at, ...r}) => ({t: new Date(at).toISOString(), ...r})).slice(-600));
        await close();
    }
});
