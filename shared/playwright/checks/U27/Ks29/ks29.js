// U27 claim check Ks29 (upstream-sync accommodation, 2026-09-29): pkp-lib c4303c66af (#13394) with
// ui-library 19802b78 (#993), issue pkp/pkp-lib#13282 "[Editors - Modify Reviews] Make reviewer's
// competing interest editable", and pkp-lib 46ac5ea933 (#13388, issue #13291). The chunk's lines: Rule 2
// (the status table and the "Competing Interests" badge), Rules 14a-14d (the Review Details and "Modify
// Review" windows), the Settings bullet "Competing Interests", scenarios 9 and 16, the Coverage lines naming
// either window and the register entries they cite (A21 A22 A23 A29 A30 A31 A32 OMP4 OMP5 OMP6).
// OJS and OMP (OPS has no review stage; its absence is U26's). Every run seeds its own scratch contexts:
//   P "Ks29 P <t>"  a "Competing Interests" policy and two active review forms ("Ks29 Opt": one optional
//                   textarea; "Ks29 Req": one required textarea). ed (editor, manager level), se
//                   (sectionEditor, sub-editor level, a participant), fc (funding, assistant level, a
//                   participant), au (author), reviewers (externalReviewer):
//       S1 read      rD wizard, declares an interest; rW wizard, keeps "I do not have any competing
//                    interests"; rN seeded completed; rU invited; rA accepted; rC declined
//       S2 modify    rS wizard (both comment blocks); rS2 seeded completed; rU2 invited; rA2 accepted;
//                    rC2 declined; rE2 declined (re-sent on screen); rF completed on "Ks29 Opt"; rQ invited
//                    on "Ks29 Req"; rK invited; rM invited; rJ accepted; rP seeded completed; rL seeded completed
//       S3 s9        r9a accepted (wizard, both comment blocks), r9b invited (wizard later)
//       S4 status    qO1 invited, qO2 accepted, qE declined, qX accepted, qR invited
//   N "Ks29 N <t>"  no policy, no review form: edN, auN; nS seeded completed, nU invited, nW wizard
//   X "Ks29 X <t>"  a policy at seed, cleared on screen mid-run: edX, auX; xD wizard (declares), xN seeded
//                   completed, xU invited, xE seeded completed (the editor declares for them), xV invited
// Phases (PHASES=a,b narrows; state in ks29-state-<RUN>-<app>.json, facts in <RUN>-facts-<app>.json):
//   seed  rev  settings  pread  dash  pmod  pmod2  s9  status  nread  xpre  xoff  xread
//   RUN=r1 PROBE_FEATURE=U27 PROBE_AGENT=ccKs29 node bin/probe.js ojs shared/playwright/checks/U27/Ks29/ks29.js
//   RUN=r2 …  (a second, independent run: its own scratch contexts and facts names); `omp` the same.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'rev', 'settings', 'pread', 'dash', 'pmod', 'pmod2', 's9', 'status', 'nread', 'xpre', 'xoff', 'xread'];
// Opt-in (PHASES=…): s9d, a thanked review taken back and then thanked again by a decision's "Notify Reviewers" (S1's rW);
// h14d, the History of the requests submitted for the reviewer (after pmod and pmod2 on the same RUN).
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const pad = (n) => String(n).padStart(2, '0');
const dayObj = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const ymd = (n) => { const d = dayObj(n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const T = 30000;

const NAMES = {
    ed: ['Edda', 'Chief'], se: ['Seb', 'Subeditor'], fc: ['Fran', 'Funder'], au: ['Ada', 'Author'],
    rD: ['Dora', 'Declarer'], rW: ['Wendy', 'Wizardnone'], rN: ['Noel', 'Seednone'], rU: ['Una', 'Unanswered'],
    rA: ['Abel', 'Accepted'], rC: ['Cleo', 'Declined'],
    rS: ['Sara', 'Modified'], rS2: ['Stan', 'Subedited'], rU2: ['Uri', 'Submitfor'], rA2: ['Alma', 'Acceptfor'],
    rC2: ['Cyd', 'Declinedfor'], rE2: ['Eve', 'Resentfor'], rF: ['Fay', 'Formopt'], rQ: ['Quinn', 'Formreq'],
    rK: ['Kit', 'Nocontent'], rM: ['Mo', 'Markcomplete'], rJ: ['Jo', 'Cionly'], rP: ['Pia', 'Publicrev'], rL: ['Lou', 'Leaver'],
    r9a: ['Nina', 'Firstnine'], r9b: ['Otto', 'Secondnine'],
    qO1: ['Olga', 'Respoverdue'], qO2: ['Oren', 'Revoverdue'], qE: ['Esme', 'Resent'], qX: ['Xena', 'Cancelled'], qR: ['Rory', 'Reminded'],
    edN: ['Ned', 'Nchief'], auN: ['Nia', 'Nauthor'], nS: ['Nate', 'Nseeded'], nU: ['Nell', 'Nunanswered'], nW: ['Neil', 'Nwizard'],
    edX: ['Xavi', 'Xchief'], auX: ['Xoe', 'Xauthor'], xD: ['Xia', 'Xdeclarer'], xN: ['Xen', 'Xseednone'], xU: ['Xu', 'Xunanswered'],
    xE: ['Xander', 'Xeditordeclared'], xV: ['Xyla', 'Xlatewizard'],
};
const full = (k) => NAMES[k].join(' ');
const POLICY = 'Ks29 competing interests policy: disclose any relationship with the authors.';
const CI_REV = 'Ks29 reviewer-declared interest: I co-authored with the first author.';
const CI_ED = 'Ks29 editor-entered interest: reviewer reported a shared grant.';
const CI_ED2 = 'Ks29 editor-revised interest: the grant ended in 2025.';
const FORM_OPT = 'Ks29 Opt';
const FORM_REQ = 'Ks29 Req';

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[ks29] ops: no review stage; skipped'); return; }
    const A = app.name;
    const isOMP = A === 'omp';
    const REC = isOMP ? null : 'Accept Submission';
    const PRIV = isOMP ? 'For editor only' : 'For editor';
    const sf = path.join(outDir(), `ks29-state-${RUN}-${A}.json`);
    const st = fs.existsSync(sf) && !on('seed') ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(st, null, 2));
    const T0 = Date.now();
    const log = (...a) => console.log(`[ks29 ${RUN} ${A} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const fact = (k, v) => { record(`${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${k}]`, JSON.stringify(v).slice(0, 1400)); };
    async function sect(name, fn) {
        const t0 = Date.now();
        try { await fn(); } catch (e) { log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 6).join(' | ')); fact(`${name} FAILED`, String(e.message || e).slice(0, 800)); }
        log(`[${name}] done in ${Math.round((Date.now() - t0) / 1000)}s`);
    }
    const {execFileSync} = require('child_process');
    const db = (q) => { try { return execFileSync('psql', ['-d', app.db, '-At', '-F', '|', '-c', q], {encoding: 'utf8', timeout: 20000}).trim().split('\n').filter(Boolean); } catch (e) { return [`ERROR ${flat(e.message, 200)}`]; } };

    // ---- seed ---------------------------------------------------------------
    if (on('seed')) {
        const t = tag('u27s29');
        st.t = t; st.u = {};
        for (const k of Object.keys(NAMES)) st.u[k] = `${t}${k.toLowerCase()}`;
        const u = st.u;
        const person = (k, roles) => ({username: u[k], roles, givenName: NAMES[k][0], familyName: NAMES[k][1]});
        const pRevs = ['rD', 'rW', 'rN', 'rU', 'rA', 'rC', 'rS', 'rS2', 'rU2', 'rA2', 'rC2', 'rE2', 'rF', 'rQ', 'rK', 'rM', 'rJ', 'rP', 'rL', 'r9a', 'r9b', 'qO1', 'qO2', 'qE', 'qX', 'qR'];
        const CP = await app.api.createContext({
            tag: t, context: {name: `Ks29 P ${t}`},
            users: [person('ed', ['editor']), person('se', ['sectionEditor']), person('fc', ['funding']), person('au', ['author']), ...pRevs.map((k) => person(k, ['externalReviewer']))],
            review: {competingInterests: {en: POLICY}},
            reviewForms: [
                {title: {en: FORM_OPT}, elements: [{question: {en: 'Ks29 optional question'}, type: 'textarea'}]},
                {title: {en: FORM_REQ}, elements: [{question: {en: 'Ks29 required question'}, type: 'textarea', required: true}]},
            ],
        });
        st.P = CP.path;
        const CN = await app.api.createContext({
            tag: `${t}n`, context: {name: `Ks29 N ${t}`},
            users: [person('edN', ['editor']), person('auN', ['author']), person('nS', ['externalReviewer']), person('nU', ['externalReviewer']), person('nW', ['externalReviewer'])],
        });
        st.N = CN.path;
        const CX = await app.api.createContext({
            tag: `${t}x`, context: {name: `Ks29 X ${t}`},
            users: [person('edX', ['editor']), person('auX', ['author']), ...['xD', 'xN', 'xU', 'xE', 'xV'].map((k) => person(k, ['externalReviewer']))],
            review: {competingInterests: {en: POLICY}},
        });
        st.X = CX.path;
        const sub = async (key, ctx, submitter, extra) => {
            const title = `Ks29 ${key} ${t}`;
            const r = await app.api.createSubmission({tag: `${t}${key}`, context: ctx, submitter, title, decisions: ['sendExternalReview'], ...extra});
            st[key] = {id: r.submissionId, rounds: r.reviewRounds, ra: r.reviewAssignments, title, ctx};
        };
        const parts = {participants: [{username: u.se, role: 'sectionEditor'}, {username: u.fc, role: 'funding'}]};
        const R = (k, status, more = {}) => ({username: u[k], status, ...more});
        await sub('S1', st.P, u.au, {...parts, reviewRounds: [{reviewers: [R('rD', 'invited'), R('rW', 'invited'), R('rN', 'completed', {comments: 'Ks29 rN seeded comments.'}), R('rU', 'invited'), R('rA', 'accepted'), R('rC', 'declined')]}]});
        await sub('S2', st.P, u.au, {...parts, reviewRounds: [{reviewers: [R('rS', 'accepted'), R('rS2', 'completed', {comments: 'Ks29 rS2 seeded comments.'}), R('rU2', 'invited'), R('rA2', 'accepted'), R('rC2', 'declined'), R('rE2', 'declined'),
            R('rF', 'completed', {reviewForm: FORM_OPT}), R('rQ', 'invited', {reviewForm: FORM_REQ}), R('rK', 'invited'), R('rM', 'invited'), R('rJ', 'accepted'), R('rP', 'completed', {comments: 'Ks29 rP seeded comments.'}), R('rL', 'completed', {comments: 'Ks29 rL seeded comments.'})]}]});
        await sub('S3', st.P, u.au, {reviewRounds: [{reviewers: [R('r9a', 'accepted'), R('r9b', 'invited')]}]});
        await sub('S4', st.P, u.au, {reviewRounds: [{reviewers: [R('qO1', 'invited'), R('qO2', 'accepted'), R('qE', 'declined'), R('qX', 'accepted'), R('qR', 'invited')]}]});
        await sub('SN', st.N, u.auN, {reviewRounds: [{reviewers: [R('nS', 'completed', {comments: 'Ks29 nS seeded comments.'}), R('nU', 'invited'), R('nW', 'invited')]}]});
        await sub('SX', st.X, u.auX, {reviewRounds: [{reviewers: [R('xD', 'invited'), R('xN', 'completed', {comments: 'Ks29 xN seeded comments.'}), R('xU', 'invited'), R('xE', 'completed', {comments: 'Ks29 xE seeded comments.'}), R('xV', 'invited')]}]});
        st.seededAt = new Date().toISOString();
        save();
        fact('seed', {P: st.P, N: st.N, X: st.X, subs: Object.fromEntries(['S1', 'S2', 'S3', 'S4', 'SN', 'SX'].map((k) => [k, {id: st[k].id, rounds: st[k].rounds}]))});
    }
    if (!st.t) { log('no state; run the seed phase'); return; }
    const u = st.u;

    const {page, close} = await launch(app);
    const dialogsSeen = [];
    page.on('dialog', async (d) => { dialogsSeen.push({type: d.type(), message: d.message(), url: page.url(), at: new Date().toISOString()}); log('[browser dialog]', d.type(), flat(d.message(), 160)); await d.accept().catch(() => {}); });
    // The review PUTs the screens send (the browser's own traffic): keys and values, and the answer.
    const puts = [];
    page.on('request', (req) => {
        const url = req.url().split('?')[0];
        if (req.method() === 'POST' && /\/reviewAssignments\/\d+\/review$/.test(url)) {
            let body = null; try { body = req.postDataJSON(); } catch (_) { body = flat(req.postData(), 300); }
            puts.push({at: Date.now(), url: url.replace(/^https?:\/\/[^/]+/, ''), override: req.headers()['x-http-method-override'] || null, keys: body && typeof body === 'object' ? Object.keys(body) : null,
                body: body && typeof body === 'object' ? Object.fromEntries(Object.entries(body).map(([k, v]) => [k, v === null ? null : flat(typeof v === 'string' ? v : JSON.stringify(v), 160)])) : body});
        }
    });
    page.on('response', async (r) => {
        const url = r.url().split('?')[0];
        if (r.request().method() === 'POST' && /\/reviewAssignments\/\d+\/review$/.test(url)) {
            const p = [...puts].reverse().find((x) => x.url === url.replace(/^https?:\/\/[^/]+/, '') && x.status === undefined);
            let j = null; try { j = await r.json(); } catch (_) { /* not json */ }
            const e = {status: r.status(), answer: j && (j.errors || j.error) ? flat(JSON.stringify(j.errors || j.error), 400) : (j ? {competingInterests: j.competingInterests, competingInterestsDeclared: j.competingInterestsDeclared, dateCompleted: j.dateCompleted, lastModifiedByName: j.lastModifiedByName || null} : null)};
            if (p) Object.assign(p, e); else puts.push({at: Date.now(), url, ...e});
        }
    });
    const putsSince = (t0) => puts.filter((p) => p.at >= t0).map(({at, ...r}) => r);
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
    const wfUrl = (s) => `/index.php/${s.ctx}/dashboard/editorial?workflowSubmissionId=${s.id}${s.rounds && s.rounds[0] ? `&workflowMenuKey=workflow_${s.rounds[0].stageId}_${s.rounds[0].id}` : ''}`;
    const table = () => page.getByRole('table', {name: 'Reviewers', exact: true});
    const row = (k) => table().getByRole('row').filter({hasText: full(k)}).first();
    async function openWf(s, rowOf) {
        await page.goto(wfUrl(s)); await idle(page);
        await page.getByRole('button', {name: 'Add Reviewer', exact: true}).first().waitFor({timeout: T}).catch(() => log('no Add Reviewer button'));
        if (rowOf) await row(rowOf).waitFor({timeout: T}).catch(() => log('no row', rowOf));
        await idle(page);
    }
    const rowText = async (k) => (await row(k).count() ? flat(await row(k).innerText(), 300) : '(no row)');
    async function rowRead(k) {
        const r = row(k);
        if (!(await r.count())) return {absent: true};
        return r.evaluate((el) => {
            const cells = [...el.querySelectorAll('th,td')];
            const statusCell = el.querySelector('td');
            const title = statusCell && statusCell.querySelector('span.text-base-bold');
            return {cells: cells.map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
                status: title ? title.innerText.trim() : null, statusClass: title ? title.className : null, tooltip: title ? title.getAttribute('title') : null,
                statusCellText: statusCell ? statusCell.innerText.replace(/\s+/g, ' ').trim() : null,
                badge: statusCell ? [...statusCell.querySelectorAll('span,div')].filter((x) => x.children.length === 0 && /Competing Interests/.test(x.innerText)).map((x) => ({text: x.innerText.trim(), cls: x.className})) : [],
                buttons: [...el.querySelectorAll('button')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean)};
        });
    }
    async function menu(k) {
        await row(k).getByRole('button', {name: /More Actions/}).first().click();
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
    // Notices raised by fn alone: a screen() before resets the kit's "shown since" list, the one after reads it.
    async function withNotices(fn) { await screen(page).catch(() => {}); const r = await fn(); await sleep(400); const sc = await screen(page).catch(() => ({notices: []})); return {r, notices: (sc.notices || []).map((x) => flat(typeof x === 'string' ? x : (x.text || JSON.stringify(x)), 200))}; }
    const notices = async () => (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((x) => flat(x, 300));

    // ---- the Review Details / Modify Review windows ------------------------
    const rd = () => page.getByRole('dialog', {name: /^Review Details:/}).last();
    const mr = () => page.getByRole('dialog', {name: 'Modify Review'}).last();
    async function settleRD() {
        await rd().waitFor({timeout: T});
        await page.waitForFunction(() => {
            const dd = [...document.querySelectorAll('[role=dialog]')].filter((x) => /^Review Details:/.test(x.getAttribute('aria-label') || '')).pop()
                || [...document.querySelectorAll('[role=dialog]')].filter((x) => /Review Details:/.test(x.innerText)).pop();
            if (!dd) return false;
            const b = [...dd.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Modify Review');
            return b && !b.disabled;
        }, null, {timeout: T}).catch(() => log('RD not settled'));
        await idle(page);
    }
    // One structured read of a review window (the view or the edit one).
    async function readWin(d) {
        return d.evaluate((el) => {
            const txt = el.innerText;
            const pos = (s) => { const i = txt.indexOf(s); return i; };
            const groups = [...el.querySelectorAll('fieldset, [role=group]')];
            const ciGroup = groups.find((g) => /^\s*Competing Interests/.test(g.innerText)) || null;
            const ciLabelEl = [...el.querySelectorAll('legend,h2,h3,label,span,div')].find((x) => x.children.length === 0 && x.innerText.trim() === 'Competing Interests');
            let ci = null;
            const scope = ciGroup || (ciLabelEl ? ciLabelEl.closest('fieldset, [role=group], .pkpFormGroup') || ciLabelEl.parentElement.parentElement : null);
            if (scope) {
                ci = {text: scope.innerText.replace(/\s+\n/g, '\n').trim().slice(0, 800),
                    radios: [...scope.querySelectorAll('input[type=radio]')].map((r) => ({name: r.name, value: r.value, checked: r.checked, disabled: r.disabled, visible: !!r.getClientRects().length, label: ((r.closest('label') || {}).innerText || '').trim()})),
                    iframes: [...scope.querySelectorAll('iframe')].map((f) => ({id: f.id, visible: !!f.getClientRects().length})),
                    labels: [...scope.querySelectorAll('legend,label,.pkpFormField__heading,.pkpFormFieldLabel')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12)};
            }
            const mce = window.tinymce || window.tinyMCE;
            const editors = mce ? mce.get().filter((e) => el.contains(e.getContainer && e.getContainer())).map((e) => ({id: e.id, init: !!e.initialized, visible: !!(e.getContainer() && e.getContainer().getClientRects().length), content: (e.getContent() || '').slice(0, 200)})) : [];
            const btns = [...el.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => ({t: (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), disabled: b.disabled})).filter((b) => b.t);
            const selects = [...el.querySelectorAll('select')].map((s) => ({name: s.name, value: s.value, selected: s.selectedOptions[0] ? s.selectedOptions[0].text : null, required: s.required || s.getAttribute('aria-required'), options: [...s.options].map((o) => o.text).slice(0, 10)}));
            const quality = [...el.querySelectorAll('input[name="quality"]')].map((q) => ({v: q.value, checked: q.checked}));
            return {textLen: txt.length, order: Object.fromEntries(['Competing Interests', 'Download Review Form', 'may upload the file below', 'Reviewer Comments', 'Reviewer Files', 'Reviewer Recommendation', 'Reviewer rating', 'Last modified by', 'Review Submitted:', 'Recommendation:'].map((s) => [s, pos(s)])),
                ci, editors, buttons: btns, selects, quality, noCompetingLine: txt.includes('No competing interests were disclosed.'),
                headings: [...el.querySelectorAll('h1,h2,h3,legend')].map((h) => h.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40)};
        });
    }
    async function openRD(k, via = 'auto') {
        const hasRead = await row(k).getByRole('button', {name: 'Read Review', exact: true}).count();
        if (via === 'button' || (via === 'auto' && hasRead)) await row(k).getByRole('button', {name: 'Read Review', exact: true}).click();
        else { const a = await menuAction(k, 'Review Details'); if (a.absent) throw new Error(`no Review Details for ${k}: ${a.items}`); }
        await settleRD();
    }
    async function closeRD() { const d = rd(); await d.getByRole('button', {name: 'Cancel', exact: true}).last().click().catch(() => {}); await d.waitFor({state: 'hidden', timeout: 15000}).catch(() => {}); await sleep(1200); await idle(page); }
    async function rdRead(label) {
        const r = await readWin(rd());
        const sn = await snap(label);
        return {...r, snap: sn.name, notices: sn.s.notices, dialogText: flat(sn.s.text && sn.s.text.dialog, 2500)};
    }
    async function openMR() {
        const t0 = Date.now();
        await rd().getByRole('button', {name: 'Modify Review', exact: true}).click();
        const conf = page.locator('[data-cy="dialog"]').filter({hasText: 'Modify this review?'}).last();
        await conf.waitFor({timeout: T});
        const confText = flat(await conf.innerText(), 400);
        const confButtons = (await conf.getByRole('button').allInnerTexts()).map((x) => x.trim());
        await conf.getByRole('button', {name: 'Modify Review', exact: true}).click();
        await mr().waitFor({timeout: T});
        await mr().getByRole('button', {name: 'Save Changes', exact: true}).waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => { const mce = window.tinymce || window.tinyMCE; const eds = mce ? mce.get() : []; return eds.filter((e) => e.getContainer() && e.getContainer().getClientRects().length).every((e) => e.initialized); }, null, {timeout: T}).catch(() => {});
        await idle(page); await sleep(500);
        return {confText, confButtons, ms: Date.now() - t0};
    }
    async function mrRead(label) {
        const r = await readWin(mr());
        const sn = await snap(label);
        return {...r, snap: sn.name, dialogText: flat(sn.s.text && sn.s.text.dialog, 2500)};
    }
    // Type into a Vue rich-text box of the edit window by its field name (keyboard into the editor frame).
    async function typeMce(field, text) {
        const arg = field instanceof RegExp ? {re: field.source} : {f: field};
        const id = await page.waitForFunction(({re, f}) => {
            const mce = window.tinymce || window.tinyMCE; if (!mce) return false;
            const e = mce.get().find((x) => (re ? new RegExp(re).test(x.id) : x.id.includes(`-${f}-`)) && x.getContainer() && x.getContainer().getClientRects().length);
            return e && e.initialized ? e.id : false;
        }, arg, {timeout: T}).then((h) => h.jsonValue()).catch(() => null);
        if (!id) return {typed: false, reason: `no initialised ${field} editor`};
        const body = page.frameLocator(`iframe[id="${id}_ifr"]`).locator('body');
        await body.click();
        await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
        await body.pressSequentially(text, {delay: 10});
        await sleep(400);
        let content = await page.evaluate((i) => (window.tinymce || window.tinyMCE).get(i).getContent(), id);
        if (!content.includes(text)) {
            await page.evaluate(([i, v]) => { const e = (window.tinymce || window.tinyMCE).get(i); e.setContent(`<p>${v}</p>`); e.fire('change'); }, [id, text]);
            content = await page.evaluate((i) => (window.tinymce || window.tinyMCE).get(i).getContent(), id);
            return {typed: true, via: 'setContent', id, content};
        }
        return {typed: true, via: 'keys', id, content};
    }
    const ciRadio = (d, value) => {
        const l = d.locator(`input[type=radio][value="${value}"]`);
        return {check: async () => { try { await l.check({timeout: 5000}); } catch (_) { await l.check({force: true}); } }, locator: l};
    };
    const formBox = () => mr().locator('textarea[id^="reviewDetailsForm-"]:not([id*="competingInterests"]):not([id*="comments"]):visible').first();
    async function saveMR({expectClose = true} = {}) {
        const t0 = Date.now();
        const btn = mr().getByRole('button', {name: 'Save Changes', exact: true});
        if (await btn.isDisabled().catch(() => false)) return {disabledBeforeClick: true, puts: [], closed: false, notices: await notices()};
        await btn.click({timeout: 10000});
        if (expectClose) await mr().waitFor({state: 'hidden', timeout: 20000}).catch(() => log('MR still open'));
        else await sleep(2500);
        await sleep(1200); await idle(page);
        return {puts: putsSince(t0), closed: !(await mr().isVisible().catch(() => false)), notices: await notices()};
    }
    async function cancelMR() {
        await mr().getByRole('button', {name: 'Cancel', exact: true}).last().click();
        await sleep(1200);
        const warn = page.getByRole('dialog').filter({hasText: 'The data on this form has changed'}).last();
        if (await warn.isVisible().catch(() => false)) return {warning: flat(await warn.innerText(), 300)};
        return {warning: null, closed: !(await mr().isVisible().catch(() => false))};
    }
    async function answerWarning(btn) {
        const warn = page.getByRole('dialog').filter({hasText: 'The data on this form has changed'}).last();
        const buttons = (await warn.getByRole('button').allInnerTexts()).map((x) => x.trim());
        await warn.getByRole('button', {name: btn, exact: true}).click();
        await sleep(1200); await idle(page);
        return {buttons, mrOpen: await mr().isVisible().catch(() => false)};
    }
    async function activityLog(label) {
        await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
        const lg = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'}).last();
        await lg.getByRole('row').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(600);
        const lines = (await lg.locator('tr.gridRow').allInnerTexts().catch(() => [])).map((x) => flat(x, 300));
        const sn = await snap(label);
        return {lg, lines, snap: sn.name};
    }
    async function closeLog(lg) { await lg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {}); await lg.waitFor({state: 'hidden', timeout: 15000}).catch(() => {}); await sleep(900); }
    async function viewChanges(lg, rowText, label) {
        const r = lg.locator('tr.gridRow').filter({hasText: rowText}).first();
        if (!(await r.count())) return {absent: true};
        await r.locator('a.show_extras').click().catch(() => {});
        await sleep(600);
        const ctl = r.locator('xpath=following-sibling::tr[1]');
        const actions = (await ctl.getByRole('link').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
        let win = null;
        const vc = ctl.getByRole('link', {name: 'View changes'}).first();
        if (await vc.count()) {
            await vc.click();
            const w = page.getByRole('dialog').filter({hasText: /View Review|Updated|Previous/}).last();
            await w.waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            const sn = await snap(label);
            win = {text: flat(await w.innerText().catch(() => ''), 1200), snap: sn.name};
            await w.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await sleep(900);
        }
        return {actions, win};
    }
    async function history(k, label) {
        await menuAction(k, 'History');
        const h = page.getByRole('dialog').filter({has: page.locator('.pkp_review_history')}).last();
        await h.waitFor({timeout: T}).catch(() => {});
        await idle(page);
        const lines = (await h.locator('.pkp_review_history > div').allInnerTexts().catch(() => [])).map((x) => flat(x, 120));
        const sn = await snap(label);
        await h.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await h.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
        await sleep(800);
        return {lines, snap: sn.name};
    }
    async function pickDate(scope, prefix, n) {
        const date = dayObj(n);
        await scope.locator(`input.datepicker[id^="${prefix}"]`).click();
        const picker = page.locator('#ui-datepicker-div');
        await picker.waitFor({timeout: T});
        await picker.locator('select.ui-datepicker-year').selectOption(String(date.getFullYear()));
        await picker.locator('select.ui-datepicker-month').selectOption(String(date.getMonth()));
        await picker.locator('td:not(.ui-datepicker-other-month) a').filter({hasText: new RegExp(`^${date.getDate()}$`)}).first().click();
        await picker.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    }
    async function editDates(k, resp, rev) {
        await menuAction(k, 'Edit');
        const m = legacy('editReviewForm');
        await m.locator('input[name="isReviewPubliclyVisible"]').waitFor({timeout: T});
        await idle(page);
        if (resp != null) await pickDate(m, 'responseDueDate', resp);
        if (rev != null) await pickDate(m, 'reviewDueDate', rev);
        await m.getByRole('button', {name: 'OK', exact: true}).click();
        await m.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: 20000}).catch(() => log('edit form still open'));
        await sleep(1000); await idle(page);
    }
    async function wizard(who, s, {declare = null, priv = null, comments, file = null}) {
        const {ReviewWizardPage} = require(path.resolve(__dirname, '../../../pages/ReviewerPages.js'));
        await as(who, s.ctx);
        const w = new ReviewWizardPage(page, s.ctx, {privateBoxLabel: PRIV});
        await w.goto(s.id);
        await idle(page);
        await w.expectStep(1).catch(() => {});
        const ciRadios = await page.locator('input[name="competingInterestOption"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim()})));
        const s1 = await snap(`wiz-${who}-step1`);
        const step1 = {ciRadios, hasCIText: /Competing Interests/.test((s1.s.text && s1.s.text.main) || ''), policyShown: ((s1.s.text && s1.s.text.main) || '').includes(POLICY.slice(0, 30)), snap: s1.name};
        if (declare) {
            await w.hasCompetingInterestsRadio.check();
            await w.competingInterestsFrame.first().waitFor({state: 'visible', timeout: 15000}).catch(() => {});
            await w.typeInto(w.competingInterestsBody.first(), declare);
        }
        if (await w.acceptButton.count()) await w.accept();
        else { if (await w.privacyBox.count()) await w.privacyBox.check().catch(() => {}); await w.saveAndContinueButton.click(); await w.expectStep(2); }
        await w.continueToStep3();
        if (file) await w.uploadReviewerFile(file);
        await w.typeComments(comments);
        if (priv) await w.typePrivateComments(priv);
        if (REC) await w.chooseRecommendation(REC);
        await w.submitReview();
        await w.expectCompleted().catch(() => {});
        const s4 = await snap(`wiz-${who}-step4`);
        return {step1, snap4: s4.name};
    }

    try {
        // ---- rev: reviewer drives ----------------------------------------
        if (on('rev')) await sect('rev', async () => {
            const drives = [['rD', 'S1', {declare: CI_REV, comments: 'Ks29 rD comments for author and editor.', priv: 'Ks29 rD private remark.', file: 'ks29-rd-reviewer-file.txt'}],
                ['rW', 'S1', {comments: 'Ks29 rW comments for author and editor.'}],
                ['rS', 'S2', {comments: 'Ks29 rS original comment.', priv: 'Ks29 rS private remark.'}],
                ['r9a', 'S3', {comments: 'Ks29 r9a shared comment.', priv: 'Ks29 r9a private remark.'}],
                ['nW', 'SN', {comments: 'Ks29 nW comments for author and editor.'}],
                ['xD', 'SX', {declare: CI_REV, comments: 'Ks29 xD comments for author and editor.'}]];
            st.rev = st.rev || {};
            for (const [who, key, opts] of drives) {
                if (st.rev[who]) continue;
                try { st.rev[who] = await wizard(who, st[key], opts); save(); fact(`rev ${who}`, st.rev[who]); } catch (e) { fact(`rev ${who} FAILED`, String(e.message).slice(0, 400)); }
            }
        });

        // ---- settings: the "Competing Interests" box where the Settings bullet puts it
        if (on('settings')) await sect('settings', async () => {
            const {ReviewSettingsPage} = require(path.resolve(__dirname, '../../../pages/ReviewSettingsPages.js'));
            for (const [who, ctx, label] of [['ed', st.P, 'P'], ['edN', st.N, 'N']]) {
                await as(who, ctx);
                const sp = new ReviewSettingsPage(page, ctx);
                await sp.goto('Reviewer Guidance');
                await idle(page);
                const heads = await sp.guidance.headings().catch(() => []);
                const box = await page.frameLocator('iframe[id^="reviewerGuidance-competingInterests-control"]').locator('body').innerText().catch(() => '(no box)');
                const sn = await snap(`settings-guidance-${label}`);
                fact(`settings ${label}`, {headings: heads, competingInterestsBox: flat(box, 300), snap: sn.name});
            }
        });

        // ---- pread: rows, badges and the Review Details window on the policy context (S1)
        if (on('pread')) await sect('pread', async () => {
            const s = st.S1;
            const who = ['ed', 'se', 'fc'];
            for (const w of who) {
                await as(w, st.P);
                await openWf(s, 'rD');
                const rows = {};
                for (const k of ['rD', 'rW', 'rN', 'rU', 'rA', 'rC']) rows[k] = await rowRead(k);
                const tsn = await snap(`pread-${w}-table`);
                fact(`pread ${w} rows`, {rows, snap: tsn.name});
                const reads = {};
                for (const k of ['rD', 'rW', 'rN', 'rU', 'rA', 'rC']) {
                    try {
                        await openWf(s, k);
                        const m = await menu(k); await closeMenu(k);
                        await openRD(k, 'menu');
                        const r = await rdRead(`pread-${w}-${k}`);
                        reads[k] = {menu: m, ci: r.ci, order: r.order, noCompetingLine: r.noCompetingLine, buttons: r.buttons, headings: r.headings, snap: r.snap, text: flat(r.dialogText, 1600)};
                        if (w === 'ed' && k === 'rD' && RUN === 'r1') await loc(page, 'Review Details: the "Competing Interests" group', rd().getByRole('group', {name: 'Competing Interests'}));
                        if (w === 'ed' && k === 'rD') {
                            reads[k].reviewerFiles = flat(await rd().evaluate((el) => { const t = el.innerText; const i = t.indexOf('Reviewer Files'); return i >= 0 ? t.slice(i, i + 400) : null; }), 400);
                            reads[k].reviewerFilesUpload = await rd().getByRole('button', {name: 'Upload', exact: true}).count();
                            const b = rd().getByRole('button', {name: /Download Review Form/}).first();
                            await b.click(); await sleep(600);
                            reads[k].downloadMenu = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => x.trim());
                            await snap('pread-ed-rD-download-menu');
                            await b.click().catch(() => {}); await sleep(400);
                        }
                        // the edit window's competing-interests fields, left with nothing changed
                        if (['rD', 'rN', 'rU'].includes(k) && w !== 'fc') {
                            const o = await openMR();
                            const m2 = await mrRead(`pread-${w}-${k}-modify`);
                            reads[k].modify = {confirm: o, ci: m2.ci, editors: m2.editors, order: m2.order, buttons: m2.buttons, snap: m2.snap, text: flat(m2.dialogText, 1600)};
                            if (w === 'ed' && k === 'rD' && RUN === 'r1') {
                                await loc(page, 'Modify Review: "I may have competing interests (Specify below)" radio', mr().getByRole('radio', {name: 'I may have competing interests (Specify below)'}));
                                await loc(page, 'Modify Review: "I do not have any competing interests" radio', mr().getByRole('radio', {name: 'I do not have any competing interests'}));
                            }
                            reads[k].modify.cancel = await cancelMR();
                            if (reads[k].modify.cancel.warning) reads[k].modify.cancel.answer = await answerWarning('Yes');
                        }
                        await closeRD();
                        reads[k].rowAfter = await rowText(k);
                    } catch (e) { reads[k] = {failed: String(e.message).slice(0, 300)}; await page.keyboard.press('Escape').catch(() => {}); }
                }
                fact(`pread ${w} windows`, reads);
            }
        });

        // ---- dash: the dashboard popover entry path (Rule 14a) on S1 ----------
        if (on('dash')) await sect('dash', async () => {
            await as('ed', st.P);
            await page.goto(`/index.php/${st.P}/dashboard/editorial?currentViewId=active`); await idle(page);
            await sleep(1500); await idle(page);
            const drow = page.locator('table tbody tr').filter({hasText: st.S1.title}).first();
            await drow.waitFor({timeout: T}).catch(() => {});
            const dsn = await snap('dash-list');
            const out = {rowText: flat(await drow.innerText().catch(() => ''), 400), snap: dsn.name, popovers: {}};
            const ind = drow.locator('button[id^="headlessui-popover-button"]');
            const n = await ind.count();
            out.indicators = n;
            for (let i = 0; i < n; i++) {
                await ind.nth(i).click();
                const panel = drow.locator('[id^="headlessui-popover-panel"]');
                await panel.waitFor({timeout: 10000}).catch(() => {});
                const txt = flat(await panel.innerText().catch(() => ''), 300);
                const who = Object.keys(NAMES).find((k) => txt.includes(full(k)));
                if (!who || out.popovers[who]) { await page.locator('main h1').first().click().catch(() => {}); await sleep(400); continue; }
                const btns = (await panel.getByRole('button').allInnerTexts().catch(() => [])).map((x) => x.trim());
                out.popovers[who] = {text: txt, buttons: btns};
                if (['rD', 'rU', 'rN'].includes(who)) {
                    const b = panel.getByRole('button', {name: /View (unread recommendation|recommendation|details)/}).first();
                    if (await b.count()) {
                        const bl = flat(await b.innerText(), 60);
                        await b.click();
                        await settleRD();
                        const r = await rdRead(`dash-${who}`);
                        out.popovers[who].window = {button: bl, ci: r.ci, order: r.order, buttons: r.buttons, snap: r.snap, text: flat(r.dialogText, 1400)};
                        if (who === 'rD') {
                            const o = await openMR();
                            const m2 = await mrRead('dash-rD-modify');
                            out.popovers[who].modify = {ci: m2.ci, snap: m2.snap};
                            out.popovers[who].modify.cancel = await cancelMR();
                        }
                        await closeRD();
                        await page.goto(`/index.php/${st.P}/dashboard/editorial?currentViewId=active`); await idle(page); await sleep(1200);
                        await drow.waitFor({timeout: T}).catch(() => {});
                        i = -1; // the list reloaded: walk the indicators again, skipping the read ones
                        continue;
                    }
                }
                await page.locator('main h1').first().click().catch(() => {}); await sleep(400);
            }
            fact('dash', out);
        });

        // ---- pmod: modifying reviews on the policy context (S2) --------------
        if (on('pmod')) await sect('pmod', async () => {
            const s = st.S2;
            await as('ed', st.P);
            // (1) scenario 16 on rS, with the competing interests changed alongside
            await openWf(s, 'rS');
            const before = await rowRead('rS');
            await openRD('rS');
            const v0 = await rdRead('pmod-rS-view-before');
            const o1 = await openMR();
            const e0 = await mrRead('pmod-rS-edit-open');
            const c0 = await cancelMR();
            const afterCancel = await readWin(rd());
            const o2 = await openMR();
            const typed = await typeMce('comments', 'Revised by the editor.');
            let recPick = null;
            if (!isOMP) { const sel = mr().locator('select[name="reviewerRecommendationId"]'); await sel.selectOption({label: 'Revisions Required'}); recPick = await sel.evaluate((x) => x.selectedOptions[0].text); }
            await ciRadio(mr(), 'hasCompetingInterests').check();
            await sleep(800);
            const ciTyped = await typeMce('competingInterests', CI_ED);
            const e1 = await mrRead('pmod-rS-edit-filled');
            const sv = await saveMR();
            await settleRD();
            const v1 = await rdRead('pmod-rS-view-after-save');
            await closeRD();
            const rowSame = await rowRead('rS');
            const lg = await activityLog('pmod-rS-activity-log');
            const vcCI = await viewChanges(lg.lg, 'Competing Interests', 'pmod-rS-view-changes-ci');
            await closeLog(lg.lg);
            await page.reload(); await idle(page); await openWf(s, 'rS');
            const rowReload = await rowRead('rS');
            await openRD('rS');
            const v2 = await rdRead('pmod-rS-view-after-reload');
            // (2) the declaration taken back: "I do not have any competing interests"
            const o3 = await openMR();
            const e2 = await mrRead('pmod-rS-edit-reopen');
            await ciRadio(mr(), 'noCompetingInterests').check(); await sleep(600);
            const e3 = await mrRead('pmod-rS-edit-no');
            const sv2 = await saveMR();
            await settleRD();
            const v3 = await rdRead('pmod-rS-view-after-no');
            await closeRD();
            const rowNo = await rowRead('rS');
            await page.reload(); await idle(page); await openWf(s, 'rS');
            const rowNoReload = await rowRead('rS');
            const lg2 = await activityLog('pmod-rS-activity-log-2');
            const vcCI2 = await viewChanges(lg2.lg, 'Competing Interests', 'pmod-rS-view-changes-ci-2');
            await closeLog(lg2.lg);
            fact('pmod rS (scenario 16 + CI)', {before, view0: {ci: v0.ci, order: v0.order, snap: v0.snap, text: flat(v0.dialogText, 1500)}, confirm: o1, edit0: {ci: e0.ci, editors: e0.editors, selects: e0.selects, buttons: e0.buttons, snap: e0.snap, text: flat(e0.dialogText, 1500)},
                cancelNothingTyped: c0, afterCancelButtons: afterCancel.buttons, typed, recPick, ciTyped, edit1: {ci: e1.ci, snap: e1.snap}, save: sv,
                view1: {ci: v1.ci, order: v1.order, snap: v1.snap, text: flat(v1.dialogText, 1500)}, rowSame, activity: lg.lines.slice(0, 12), viewChangesCI: vcCI, rowReload, view2: {ci: v2.ci, snap: v2.snap},
                edit2: {ci: e2.ci, snap: e2.snap}, edit3: {ci: e3.ci, snap: e3.snap}, save2: sv2, view3: {ci: v3.ci, snap: v3.snap, text: flat(v3.dialogText, 900)}, rowNo, rowNoReload, activity2: lg2.lines.slice(0, 6), viewChangesCI2: vcCI2,
                db: db(`select competing_interests, competing_interests_declared, date_completed, last_modified_by_id from review_assignments where submission_id=${s.id} and reviewer_id=(select user_id from users where username='${u.rS}')`)});

            // (3) the sub-editor level declares for rS2 (seeded "I do not have …")
            await as('se', st.P);
            await openWf(s, 'rS2');
            await openRD('rS2');
            const sv3pre = await rdRead('pmod-se-rS2-view');
            await openMR();
            const se0 = await mrRead('pmod-se-rS2-edit');
            await ciRadio(mr(), 'hasCompetingInterests').check(); await sleep(800);
            const seTyped = await typeMce('competingInterests', CI_ED);
            const seSave = await saveMR();
            await settleRD();
            const seView = await rdRead('pmod-se-rS2-after');
            await closeRD();
            fact('pmod se rS2', {view: {ci: sv3pre.ci, snap: sv3pre.snap}, edit: {ci: se0.ci, editors: se0.editors, snap: se0.snap}, typed: seTyped, save: seSave, after: {ci: seView.ci, snap: seView.snap, text: flat(seView.dialogText, 900)}, row: await rowRead('rS2')});

            // (4) the assistant level (A31) on rS2
            await as('fc', st.P);
            await openWf(s, 'rS2');
            await openRD('rS2', 'menu');
            const fcView = await rdRead('pmod-fc-rS2-view');
            let fc = {view: {ci: fcView.ci, buttons: fcView.buttons, snap: fcView.snap}};
            try {
                await openMR();
                const fe = await mrRead('pmod-fc-rS2-edit');
                await ciRadio(mr(), 'noCompetingInterests').check(); await sleep(500);
                const fs0 = await saveMR({expectClose: false});
                const errDlg = page.getByRole('dialog').filter({hasText: /does not have access|Error/}).last();
                const err = await errDlg.isVisible().catch(() => false) ? flat(await errDlg.innerText(), 300) : null;
                const fsn = await snap('pmod-fc-rS2-after-save');
                if (err) await errDlg.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                await sleep(600);
                const cc = await mr().isVisible().catch(() => false) ? await cancelMR() : null;
                if (cc && cc.warning) cc.answer = await answerWarning('Yes');
                fc = {...fc, edit: {ci: fe.ci, snap: fe.snap}, save: fs0, error: err, snapAfter: fsn.name, leave: cc};
            } catch (e) { fc.failed = String(e.message).slice(0, 300); }
            await closeRD();
            fc.row = await rowRead('rS2');
            fact('pmod fc rS2 (A31)', fc);

            // (5) submitting for the reviewer (Rule 14d) with a declaration: rU2 (unanswered) and rA2 (accepted)
            await as('ed', st.P);
            for (const k of ['rU2', 'rA2']) {
                await openWf(s, k);
                const rb = await rowRead(k);
                const mb = await menu(k); await closeMenu(k);
                await openRD(k, 'menu');
                const vb = await rdRead(`pmod-${k}-view-before`);
                const ob = await openMR();
                const eb = await mrRead(`pmod-${k}-edit-open`);
                // OJS: the save refused without a recommendation (only the comment typed)
                await typeMce('comments', `Ks29 ${k} entered by the editor.`);
                let refused = null;
                if (!isOMP) {
                    const t0 = Date.now();
                    await mr().getByRole('button', {name: 'Save Changes', exact: true}).click(); await sleep(1500);
                    const rsn = await snap(`pmod-${k}-refused`);
                    refused = {puts: putsSince(t0), text: flat(rsn.s.text && rsn.s.text.dialog, 900), saveDisabled: await mr().getByRole('button', {name: 'Save Changes', exact: true}).isDisabled().catch(() => null), errors: (await mr().locator('.pkpFieldError, .pkpFormErrors').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)), snap: rsn.name};
                    await mr().locator('select[name="reviewerRecommendationId"]').selectOption({label: 'Accept Submission'});
                    await sleep(400);
                    refused.saveDisabledAfterPick = await mr().getByRole('button', {name: 'Save Changes', exact: true}).isDisabled().catch(() => null);
                }
                await ciRadio(mr(), 'hasCompetingInterests').check(); await sleep(800);
                const ct = await typeMce('competingInterests', CI_ED);
                const sv4 = await saveMR();
                await settleRD();
                const va = await rdRead(`pmod-${k}-view-after`);
                await closeRD();
                const ra = await rowRead(k);
                const ma = await menu(k); await closeMenu(k);
                fact(`pmod ${k} submit-for`, {rowBefore: rb, menuBefore: mb, viewBefore: {ci: vb.ci, order: vb.order, buttons: vb.buttons, snap: vb.snap, text: flat(vb.dialogText, 1300)}, confirm: ob,
                    editOpen: {ci: eb.ci, editors: eb.editors, selects: eb.selects, snap: eb.snap, text: flat(eb.dialogText, 1300)}, refused, ciTyped: ct, save: sv4, viewAfter: {ci: va.ci, snap: va.snap, text: flat(va.dialogText, 1300)}, rowAfter: ra, menuAfter: ma,
                    db: db(`select date_completed, date_confirmed, step, competing_interests, competing_interests_declared from review_assignments where submission_id=${s.id} and reviewer_id=(select user_id from users where username='${u[k]}')`)});
            }
            // the reviewer's side of rU2, and the mail and log around it
            const mailU2 = await app.mail._search({to: `${u.rU2}@mail.test`}).catch(() => ({messages: []}));
            const mailAcc = await app.mail._search({contains: full('rU2')}).catch(() => ({messages: []}));
            const lgU = await activityLog('pmod-rU2-activity-log');
            await closeLog(lgU.lg);
            await as('rU2', st.P);
            await page.goto(`/index.php/${st.P}/dashboard/reviewAssignments`); await idle(page); await sleep(1500); await idle(page);
            const rl = await snap('pmod-rU2-reviewer-list');
            const views = {};
            for (const v of ['reviewer-assignments-all', 'reviewer-assignments-completed']) {
                await page.goto(`/index.php/${st.P}/dashboard/reviewAssignments?currentViewId=${v}`); await idle(page); await sleep(1200); await idle(page);
                const vr = page.locator('table tbody tr').filter({hasText: s.title}).first();
                views[v] = {row: flat(await vr.innerText().catch(() => '(no row)'), 300), snap: (await snap(`pmod-rU2-list-${v}`)).name};
            }
            const vrow = page.locator('table tbody tr').filter({hasText: s.title}).first();
            const vbtn = vrow.getByRole('link', {name: /^View/}).or(vrow.getByRole('button', {name: /^View/})).first();
            if (await vbtn.count()) { await vbtn.click(); await idle(page); await sleep(1500); await idle(page); }
            else { await page.goto(`/index.php/${st.P}/reviewer/submission/${s.id}`); await idle(page); await sleep(1000); }
            const rw = await snap('pmod-rU2-reviewer-wizard');
            const rwStep = await page.locator('[role=tab][aria-selected="true"], .ui-tabs-active').first().innerText().catch(() => null);
            // acceptance mail goes to the stage's editors (se is S1's and S2's participant): S1's rD accepted on screen is the control
            const mailCtl = await app.mail._search({to: `${u.se}@mail.test`}).catch(() => ({messages: []}));
            fact('pmod rU2 aftermath', {mailToReviewer: (mailU2.messages || []).map((m) => m.Subject), mailNamingReviewer: (mailAcc.messages || []).map((m) => m.Subject), mailToSubEditor: (mailCtl.messages || []).map((m) => m.Subject).filter((x) => /accepted|Review/i.test(x)).slice(0, 12),
                logUriAccepted: lgU.lines.filter((l) => l.includes(full('rU2')) && /accepted/i.test(l)), logAcceptedAny: lgU.lines.filter((l) => /has been accepted/.test(l)), logLines: lgU.lines.filter((l) => /modified/i.test(l)).slice(0, 8),
                reviewerList: {text: flat(rl.s.text && rl.s.text.main, 700), snap: rl.name}, views, viewButton: await vbtn.count().catch(() => 0), reviewerWizard: {step: flat(rwStep, 80), url: page.url(), text: flat(rw.s.text && rw.s.text.main, 700), snap: rw.name}});
            await as('ed', st.P);

            // (6) a competing-interests-only change on an accepted request (rJ)
            await openWf(s, 'rJ');
            await openRD('rJ', 'menu');
            await openMR();
            await ciRadio(mr(), 'hasCompetingInterests').check(); await sleep(800);
            const jt = await typeMce('competingInterests', CI_ED);
            const js = await saveMR({expectClose: isOMP});
            const jsn = await snap('pmod-rJ-after-save');
            let jview = null;
            if (!(await mr().isVisible().catch(() => false))) { await settleRD(); jview = await rdRead('pmod-rJ-view-after'); }
            else { const cc = await cancelMR(); if (cc.warning) await answerWarning('Yes'); }
            await closeRD();
            fact('pmod rJ ci-only', {typed: jt, save: js, snap: jsn.name, text: flat(jsn.s.text && jsn.s.text.dialog, 900), view: jview && {ci: jview.ci, snap: jview.snap, text: flat(jview.dialogText, 900)}, row: await rowRead('rJ'), menu: await menu('rJ').then(async (m) => { await closeMenu('rJ'); return m; }),
                db: db(`select date_completed, step, competing_interests, competing_interests_declared from review_assignments where submission_id=${s.id} and reviewer_id=(select user_id from users where username='${u.rJ}')`)});

            // (7) a declined request (A30), then OMP4's declined half; a re-sent one (rE2) goes through
            await openWf(s, 'rC2');
            await openRD('rC2', 'menu');
            const cv = await rdRead('pmod-rC2-view');
            await openMR();
            const ce = await mrRead('pmod-rC2-edit');
            await typeMce('comments', 'Ks29 rC2 entered by the editor.');
            if (!isOMP) await mr().locator('select[name="reviewerRecommendationId"]').selectOption({label: 'Accept Submission'});
            const cs = await saveMR({expectClose: false});
            const csn = await snap('pmod-rC2-refused');
            const cl = await cancelMR();
            if (cl.warning) cl.answer = await answerWarning('Yes');
            let omp4d = null;
            if (isOMP) {
                const mb = rd().getByRole('button', {name: 'Mark as Complete', exact: true});
                omp4d = {enabled: await mb.isEnabled().catch(() => null)};
                if (omp4d.enabled) {
                    await mb.click();
                    const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'}).last();
                    await dlg.waitFor({timeout: T});
                    await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
                    await sleep(1500); await idle(page);
                    omp4d.after = await rdRead('pmod-rC2-marked');
                    omp4d.after = {buttons: omp4d.after.buttons, text: flat(omp4d.after.dialogText, 600), notices: omp4d.after.notices, snap: omp4d.after.snap};
                }
            } else { omp4d = {ojsEnabled: await rd().getByRole('button', {name: 'Mark as Complete', exact: true}).isEnabled().catch(() => null)}; }
            await closeRD();
            fact('pmod rC2 declined (A30, OMP4)', {view: {ci: cv.ci, buttons: cv.buttons, snap: cv.snap, text: flat(cv.dialogText, 1000)}, edit: {ci: ce.ci, snap: ce.snap}, save: cs, refusedText: flat(csn.s.text && csn.s.text.dialog, 900), refusedNotices: csn.s.notices, snap: csn.name, leave: cl, omp4: omp4d, row: await rowRead('rC2')});
            await openWf(s, 'rE2');
            await menuAction('rE2', 'Resend Review Request');
            const rm = legacy('resendRequestReviewerForm');
            await rm.waitFor({timeout: T}); await mceReady('#resendRequestReviewerForm'); await idle(page);
            await rm.getByRole('button', {name: 'Resend Review Request', exact: true}).click();
            await rm.locator('form#resendRequestReviewerForm').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
            await sleep(1200); await idle(page);
            const eRow = await rowRead('rE2');
            await openRD('rE2', 'menu');
            await openMR();
            await typeMce('comments', 'Ks29 rE2 entered by the editor.');
            if (!isOMP) await mr().locator('select[name="reviewerRecommendationId"]').selectOption({label: 'Accept Submission'});
            const es = await saveMR();
            await settleRD();
            const ev = await rdRead('pmod-rE2-view-after');
            await closeRD();
            fact('pmod rE2 resent then submitted', {rowResent: eRow, save: es, view: {snap: ev.snap, text: flat(ev.dialogText, 700)}, row: await rowRead('rE2'), menu: await menu('rE2').then(async (m) => { await closeMenu('rE2'); return m; })});

        });

        // ---- pmod2: the review-form reviews, the empty saves, the public-visibility dialogs, leaving the window
        if (on('pmod2')) await sect('pmod2', async () => {
            const s = st.S2;
            await as('ed', st.P);
            // (8) the review-form reviews: rF (optional form, submitted) and rQ (required form, unanswered)
            await openWf(s, 'rF');
            // A21: the first opening (the one that marks the review viewed), a star pressed as soon as it shows
            await row('rF').getByRole('button', {name: 'Read Review', exact: true}).click();
            const early = {};
            {
                const star = rd().locator('input[name="quality"][value="2"]');
                await star.waitFor({state: 'attached', timeout: T}).catch(() => {});
                const t0 = Date.now();
                const modifyEnabledAtClick = await rd().getByRole('button', {name: 'Modify Review', exact: true}).isEnabled().catch(() => null);
                await star.check({force: true}).catch(() => {});
                early.clickMs = Date.now() - t0; early.modifyEnabledAtClick = modifyEnabledAtClick;
                await page.getByText('Reviewer rating saved').first().waitFor({timeout: 10000}).then(() => { early.toast = true; }).catch(() => { early.toast = false; });
                await settleRD(); await sleep(2500);
                early.checkedAfter = await rd().locator('input[name="quality"]:checked').evaluate((x) => x.value).catch(() => null);
                early.snap = (await snap('pmod-rF-early-star')).name;
                await closeRD();
                await openRD('rF');
                early.checkedOnReopen = await rd().locator('input[name="quality"]:checked').evaluate((x) => x.value).catch(() => null);
                fact('A21 early star (rF first opening)', early);
            }
            const fv = await rdRead('pmod-rF-view');
            await openMR();
            const fe = await mrRead('pmod-rF-edit');
            const fta = formBox();
            const fform = await mr().evaluate((el) => ({text: el.innerText.slice(0, 1500), textareas: [...el.querySelectorAll('textarea')].map((t) => ({name: t.name, id: t.id, value: t.value.slice(0, 100)}))}));
            let fAnswer = null;
            if (await fta.count()) { await fta.fill('Ks29 rF answer changed by the editor.'); fAnswer = 'filled'; }
            else { fAnswer = await typeMce(/^reviewDetailsForm-\d+-control$/, 'Ks29 rF answer changed by the editor.').catch((e) => String(e.message)); }
            await ciRadio(mr(), 'hasCompetingInterests').check(); await sleep(800);
            const fct = await typeMce('competingInterests', CI_ED);
            const fsave = await saveMR();
            await settleRD();
            const fv2 = await rdRead('pmod-rF-view-after');
            await closeRD();
            fact('pmod rF form review', {view: {ci: fv.ci, snap: fv.snap, text: flat(fv.dialogText, 1300)}, edit: {ci: fe.ci, editors: fe.editors, snap: fe.snap, text: flat(fe.dialogText, 1300)}, form: fform, answer: fAnswer, ciTyped: fct, save: fsave, after: {ci: fv2.ci, snap: fv2.snap, text: flat(fv2.dialogText, 1300)}});
            await openWf(s, 'rQ');
            await openRD('rQ', 'menu');
            const qv = await rdRead('pmod-rQ-view');
            await openMR();
            const qe = await mrRead('pmod-rQ-edit');
            const qs = await saveMR({expectClose: false});
            const qsn = await snap('pmod-rQ-refused');
            const qErr = (await mr().locator('.pkpFieldError, .pkpFormErrors').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
            const qta = formBox();
            const qTyped = (await qta.count()) ? (await qta.fill('Ks29 rQ required answer by the editor.'), 'filled') : await typeMce(/^reviewDetailsForm-\d+-control$/, 'Ks29 rQ required answer by the editor.').catch((e) => String(e.message));
            if (!isOMP) await mr().locator('select[name="reviewerRecommendationId"]').selectOption({label: 'Accept Submission'});
            const qs2 = await saveMR();
            await settleRD();
            const qv2 = await rdRead('pmod-rQ-view-after');
            await closeRD();
            fact('pmod rQ required form', {view: {ci: qv.ci, buttons: qv.buttons, snap: qv.snap, text: flat(qv.dialogText, 1300)}, edit: {ci: qe.ci, snap: qe.snap, text: flat(qe.dialogText, 1300)}, qTyped, emptySave: qs, emptyText: flat(qsn.s.text && qsn.s.text.dialog, 900), errors: qErr, snapRefused: qsn.name, save: qs2, after: {buttons: qv2.buttons, snap: qv2.snap, text: flat(qv2.dialogText, 900)}, row: await rowRead('rQ')});

            // (9) OMP5 / the empty save on an unanswered request without a form (rK); OMP4 on rM (unanswered)
            await openWf(s, 'rK');
            await openRD('rK', 'menu');
            const kv = await rdRead('pmod-rK-view');
            await openMR();
            const ke = await mrRead('pmod-rK-edit');
            const ks = await saveMR({expectClose: isOMP});
            const ksn = await snap('pmod-rK-after-empty-save');
            if (await mr().isVisible().catch(() => false)) { const cc = await cancelMR(); if (cc.warning) await answerWarning('Yes'); }
            await closeRD();
            fact('pmod rK empty save', {view: {buttons: kv.buttons, ci: kv.ci, snap: kv.snap, text: flat(kv.dialogText, 1200)}, edit: {ci: ke.ci, snap: ke.snap}, save: ks, text: flat(ksn.s.text && ksn.s.text.dialog, 900), snap: ksn.name, row: await rowRead('rK')});
            await openWf(s, 'rM');
            await openRD('rM', 'menu');
            const mv = await rdRead('pmod-rM-view');
            const mcb = rd().getByRole('button', {name: 'Mark as Complete', exact: true});
            const omp4 = {enabled: await mcb.isEnabled().catch(() => null), beside: flat(await rd().locator('text=/recommendation is required|incomplete and cannot/').first().innerText().catch(() => null), 200)};
            if (omp4.enabled) {
                await mcb.click();
                const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'}).last();
                await dlg.waitFor({timeout: T});
                omp4.dialog = flat(await dlg.innerText(), 400);
                await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
                await sleep(1500); await idle(page);
                const ma = await rdRead('pmod-rM-marked');
                omp4.after = {buttons: ma.buttons, snap: ma.snap, text: flat(ma.dialogText, 700)};
            }
            await closeRD();
            omp4.row = await rowRead('rM');
            fact('pmod rM mark complete (OMP4 / OJS control)', {view: {ci: mv.ci, buttons: mv.buttons, snap: mv.snap, text: flat(mv.dialogText, 1300)}, ...omp4});

            // (10) the public-visibility dialogs (rP): save before complete asks nothing; complete; save asks
            await openWf(s, 'rP');
            await menuAction('rP', 'Edit');
            const em = legacy('editReviewForm');
            await em.locator('input[name="isReviewPubliclyVisible"]').waitFor({timeout: T});
            await em.locator('input[name="isReviewPubliclyVisible"]').check();
            await em.getByRole('button', {name: 'OK', exact: true}).click();
            await em.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
            await sleep(1000); await idle(page);
            await openRD('rP');
            await openMR();
            await ciRadio(mr(), 'hasCompetingInterests').check(); await sleep(800);
            await typeMce('competingInterests', CI_ED);
            const p0 = await saveMR({expectClose: false});
            const pAsk0 = await page.locator('[data-cy="dialog"]').filter({hasText: 'Save changes to this review?'}).count();
            const p0sn = await snap('pmod-rP-save-before-complete');
            if (await mr().isVisible().catch(() => false)) { const cc = await cancelMR(); if (cc.warning) await answerWarning('Yes'); }
            await settleRD();
            await rd().getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            const mdlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'}).last();
            await mdlg.waitFor({timeout: T});
            const mText = flat(await mdlg.innerText(), 500);
            await mdlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            await sleep(1500); await idle(page);
            await openMR();
            await ciRadio(mr(), 'noCompetingInterests').check(); await sleep(500);
            const t1 = Date.now();
            await mr().getByRole('button', {name: 'Save Changes', exact: true}).click();
            const sdlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Save changes to this review?'}).last();
            const asked = await sdlg.waitFor({timeout: 8000}).then(() => true).catch(() => false);
            const sText = asked ? flat(await sdlg.innerText(), 500) : null;
            const psn = await snap('pmod-rP-save-after-complete-ci-only');
            let pc = null;
            if (asked) {
                await sdlg.getByRole('button', {name: 'Cancel', exact: true}).click(); await sleep(1000);
                pc = {afterCancel: {mrOpen: await mr().isVisible().catch(() => false), puts: putsSince(t1)}};
                const t2 = Date.now();
                await mr().getByRole('button', {name: 'Save Changes', exact: true}).click();
                await sdlg.waitFor({timeout: 8000}).catch(() => {});
                await sdlg.getByRole('button', {name: 'Save Changes', exact: true}).click().catch(() => {});
                await mr().waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
                await sleep(1200); await idle(page);
                pc.afterSave = {mrOpen: await mr().isVisible().catch(() => false), puts: putsSince(t2)};
            } else if (await mr().isVisible().catch(() => false)) { const cc = await cancelMR(); if (cc.warning) await answerWarning('Yes'); }
            await settleRD();
            const pv = await rdRead('pmod-rP-view-after');
            await closeRD();
            fact('pmod rP public visibility', {saveBeforeComplete: p0, askedBeforeComplete: pAsk0, snap0: p0sn.name, markDialog: mText, ciOnlySaveAsked: asked, askText: sText, snap: psn.name, answers: pc, view: {ci: pv.ci, snap: pv.snap}});

            // (11) leaving "Modify Review" with a changed competing-interests answer (rL): "No", then "Yes"
            await openWf(s, 'rL');
            await openRD('rL');
            await openMR();
            await ciRadio(mr(), 'hasCompetingInterests').check(); await sleep(600);
            const lc1 = await cancelMR();
            const lsn = await snap('pmod-rL-leave-warning');
            const la1 = lc1.warning ? await answerWarning('No') : null;
            const lc2 = await mr().isVisible().catch(() => false) ? await cancelMR() : null;
            const la2 = lc2 && lc2.warning ? await answerWarning('Yes') : null;
            await settleRD();
            const lv = await rdRead('pmod-rL-view-after-leave');
            await openMR();
            const le = await mrRead('pmod-rL-edit-reopen');
            // the top "Close" of the edit window with a change
            await ciRadio(mr(), 'hasCompetingInterests').check(); await sleep(600);
            const topClose = mr().getByRole('button', {name: 'Close', exact: true}).first();
            let top = null;
            if (await topClose.count()) {
                await topClose.click(); await sleep(1200);
                const warn = page.getByRole('dialog').filter({hasText: 'The data on this form has changed'}).last();
                top = {warning: await warn.isVisible().catch(() => false) ? flat(await warn.innerText(), 300) : null};
                if (top.warning) top.answer = await answerWarning('Yes');
                top.mrOpen = await mr().isVisible().catch(() => false);
            }
            if (await mr().isVisible().catch(() => false)) { const cc = await cancelMR(); if (cc.warning) await answerWarning('Yes'); }
            await closeRD();
            // a typed comment, then Cancel › "Yes": the window opened again shows the comment as it was
            await openRD('rL');
            await openMR();
            await typeMce('comments', 'Ks29 rL typed and dropped.');
            const tc = await cancelMR();
            const ta = tc.warning ? await answerWarning('Yes') : null;
            await settleRD();
            await openMR();
            const tre = await mrRead('pmod-rL-edit-after-typed-drop');
            const trComment = (tre.editors.find((e) => /-comments-/.test(e.id)) || {}).content;
            // the Upload control of the edit window: the three-step window, then Cancel (asks nothing?)
            const up = {};
            const ub = mr().getByRole('button', {name: 'Upload', exact: true}).first();
            up.uploadButtons = await mr().getByRole('button', {name: 'Upload', exact: true}).count();
            if (up.uploadButtons) {
                await ub.click();
                const wz = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: '1. Upload File'})}).last();
                await wz.waitFor({timeout: T}).catch(() => {});
                up.tabs = (await wz.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => x.trim());
                await snap('pmod-rL-upload-step1');
                await page.locator('input[type="file"]').last().setInputFiles({name: 'ks29-editor-upload.txt', mimeType: 'text/plain', buffer: Buffer.from('Ks29 file uploaded by the editor for the reviewer.')});
                await wz.getByRole('button', {name: /Change File/}).waitFor({timeout: T}).catch(() => {});
                const genre = wz.locator('select[id^="genreId"]');
                if (await genre.count()) { up.genreOptions = await genre.locator('option').allInnerTexts(); await genre.selectOption({index: 1}).catch(() => {}); }
                await wz.getByRole('button', {name: 'Continue', exact: true}).click();
                await sleep(1500); await idle(page);
                await snap('pmod-rL-upload-step2');
                await wz.getByRole('button', {name: 'Continue', exact: true}).click();
                await sleep(1500); await idle(page);
                await snap('pmod-rL-upload-step3');
                await wz.getByRole('button', {name: 'Complete', exact: true}).click();
                await wz.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await sleep(1500); await idle(page);
                up.editFiles = flat(await mr().evaluate((el) => { const t = el.innerText; const i = t.indexOf('Reviewer Files'); return i >= 0 ? t.slice(i, i + 400) : null; }), 400);
                await snap('pmod-rL-upload-listed');
                up.cancel = await cancelMR();
                if (up.cancel.warning) up.cancel.answer = await answerWarning('Yes');
                await settleRD();
                up.viewFiles = flat(await rd().evaluate((el) => { const t = el.innerText; const i = t.indexOf('Reviewer Files'); return i >= 0 ? t.slice(i, i + 400) : null; }), 400);
                up.viewSnap = (await snap('pmod-rL-view-after-upload')).name;
            } else { const cc = await cancelMR(); if (cc.warning) await answerWarning('Yes'); }
            await closeRD();
            const lgL = await activityLog('pmod-rL-activity-log');
            up.logUploaded = lgL.lines.filter((l) => /upload/i.test(l)).slice(0, 4);
            await closeLog(lgL.lg);
            fact('pmod rL leave', {cancel1: lc1, warningSnap: lsn.name, answerNo: la1, cancel2: lc2, answerYes: la2, viewAfter: {ci: lv.ci, snap: lv.snap}, editReopen: {ci: le.ci, snap: le.snap}, topClose: top,
                typedCancel: tc, typedAnswer: ta, typedReopenComment: trComment, typedSnap: tre.snap, upload: up, dialogs: dialogsSeen.slice(-3)});
        });

        // ---- s9: scenario 9 on S3, the dated lines and the thank taken back
        if (on('s9')) await sect('s9', async () => {
            const s = st.S3;
            const out = {};
            await as('ed', st.P);
            await openWf(s, 'r9a');
            out.rowSubmitted = await rowRead('r9a');
            out.row9b = await rowRead('r9b');
            await openRD('r9a', 'button');
            const v1 = await rdRead('s9-read-1');
            out.read1 = {ci: v1.ci, order: v1.order, buttons: v1.buttons, quality: v1.quality, headings: v1.headings, snap: v1.snap, text: flat(v1.dialogText, 2200)};
            const star = rd().locator('input[name="quality"][value="4"]');
            const tS = Date.now();
            await star.check({force: true}).catch(async () => { await rd().locator('label').filter({has: star}).click(); });
            await page.getByText('Reviewer rating saved').first().waitFor({timeout: 15000}).catch(() => {});
            out.starToast = await page.getByText('Reviewer rating saved').count();
            out.starMs = Date.now() - tS;
            await closeRD();
            out.rowAfterClose = await rowRead('r9a');
            await page.reload(); await idle(page); await openWf(s, 'r9a');
            out.rowAfterReload = await rowRead('r9a');
            await openRD('r9a');
            out.starAfterReopen = await rd().locator('input[name="quality"]:checked').evaluate((x) => x.value).catch(() => null);
            await closeRD();
            // Edit after submission / the unanswered row's Edit
            for (const k of ['r9a', 'r9b']) {
                await menuAction(k, 'Edit');
                const m = legacy('editReviewForm');
                await m.locator('input[name="isReviewPubliclyVisible"]').waitFor({timeout: T});
                out[`edit_${k}`] = {reviewFormSelect: await m.locator('select[name="reviewFormId"]').count(), options: await m.locator('select[name="reviewFormId"] option').allInnerTexts().catch(() => [])};
                await snap(`s9-edit-${k}`);
                await m.getByRole('link', {name: 'Cancel'}).or(m.getByRole('button', {name: 'Cancel', exact: true})).first().click();
                await sleep(1200); await idle(page);
            }
            // Mark as Complete: Cancel first, then confirm
            await openRD('r9a');
            await rd().getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'}).last();
            await dlg.waitFor({timeout: T});
            out.markDialog = {text: flat(await dlg.innerText(), 500), buttons: (await dlg.getByRole('button').allInnerTexts()).map((x) => x.trim())};
            const mdsn = await snap('s9-mark-dialog');
            out.markDialog.snap = mdsn.name;
            const tC = Date.now();
            await dlg.getByRole('button', {name: 'Cancel', exact: true}).click(); await sleep(1000);
            out.markCancel = {requests: putsSince(tC).length, markEnabled: await rd().getByRole('button', {name: 'Mark as Complete', exact: true}).isEnabled()};
            await rd().getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            await dlg.waitFor({timeout: T});
            await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            await page.getByText('The review has been marked as complete.').first().waitFor({timeout: 15000}).catch(() => {});
            await sleep(800);
            const vC = await rdRead('s9-after-mark');
            out.afterMark = {toast: vC.notices || null, buttons: vC.buttons, text: flat(vC.dialogText, 700), snap: vC.snap};
            await closeRD();
            out.rowComplete = await rowRead('r9a');
            await openRD('r9a');
            out.datedComplete = (await rdRead('s9-view-complete')).dialogText.match(/(Review Completed|Review Submitted|Reviewer Thanked):[^A-Za-z]*\d[^\n]*?[AP]M/g);
            await closeRD();
            // the reviewer's Tasks panel and the activity log
            await as('r9a', st.P);
            await page.goto(`/index.php/${st.P}/dashboard/reviewAssignments`); await idle(page);
            const {TasksPanel} = require(path.resolve(__dirname, '../../../pages/NotificationsPages.js'));
            const tp = new TasksPanel(page);
            try { await tp.open(); out.reviewerTasks = await tp.rowTexts(); await snap('s9-reviewer-tasks'); await tp.close(); } catch (e) { out.reviewerTasks = `failed ${String(e.message).slice(0, 120)}`; }
            await as('ed', st.P);
            await openWf(s, 'r9a');
            const l1 = await activityLog('s9-log-1');
            out.logComplete = l1.lines.filter((l) => /confirmed a review|unconsidered/.test(l));
            await closeLog(l1.lg);
            // Thank Reviewer
            await row('r9a').getByRole('button', {name: 'Thank Reviewer', exact: true}).click();
            const tm = legacy('sendThankYouForm');
            await tm.locator('form#sendThankYouForm').waitFor({timeout: T}); await mceReady('#sendThankYouForm'); await idle(page);
            await snap('s9-thank-window');
            await tm.locator('form#sendThankYouForm').getByRole('button', {name: 'Thank Reviewer', exact: true}).click();
            await page.getByText('Thank you email sent to reviewer.').first().waitFor({timeout: 15000}).catch(() => {});
            out.thankNotice = await notices();
            await tm.locator('form#sendThankYouForm').waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
            await sleep(1000); await idle(page);
            await page.reload(); await idle(page); await openWf(s, 'r9a');
            out.rowThanked = await rowRead('r9a');
            await sleep(1500);
            out.mailThank = ((await app.mail._search({to: `${u.r9a}@mail.test`}).catch(() => ({messages: []}))).messages || []).map((m) => m.Subject);
            out.history1 = await history('r9a', 's9-history-thanked');
            await openRD('r9a');
            const vT = await rdRead('s9-view-thanked');
            out.datedThanked = vT.dialogText.match(/(Review Completed|Review Submitted|Reviewer Thanked):[^\n]*?[AP]M/g);
            await closeRD();
            // Revert Decision on the thanked row
            await row('r9a').getByRole('button', {name: 'Revert Decision', exact: true}).click();
            const rv = page.getByRole('dialog').filter({hasText: 'Unconsider this Review'}).last();
            await rv.waitFor({timeout: T});
            out.revertDialog = flat(await rv.innerText(), 400);
            await snap('s9-revert-dialog');
            out.revertNotices = (await withNotices(async () => { await rv.getByRole('button', {name: 'OK', exact: true}).click(); await rv.waitFor({state: 'hidden', timeout: T}).catch(() => {}); await sleep(1500); await idle(page); })).notices;
            out.rowReverted = await rowRead('r9a');
            await openRD('r9a');
            const vR = await rdRead('s9-view-reverted');
            out.afterRevert = {hasShared: vR.dialogText.includes('Ks29 r9a shared comment.'), hasPriv: vR.dialogText.includes('Ks29 r9a private remark.'), dated: vR.dialogText.match(/(Review Completed|Review Submitted|Reviewer Thanked):[^\n]*?[AP]M/g), buttons: vR.buttons, snap: vR.snap};
            out.history2 = await closeRD().then(() => history('r9a', 's9-history-reverted'));
            const l2 = await activityLog('s9-log-2');
            out.logRevert = l2.lines.filter((l) => /unconsidered|confirmed a review/.test(l));
            await closeLog(l2.lg);
            // marked complete again: the thank stands (Rule 16, A33 retired)
            await openRD('r9a');
            await rd().getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            await dlg.waitFor({timeout: T});
            await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            await sleep(1800); await idle(page);
            const vR2 = await rdRead('s9-view-recompleted');
            out.recompleted = {dated: vR2.dialogText.match(/(Review Completed|Review Submitted|Reviewer Thanked):[^\n]*?[AP]M/g), buttons: vR2.buttons, snap: vR2.snap};
            await closeRD();
            out.rowRecompleted = await rowRead('r9a');
            out.history3 = await history('r9a', 's9-history-recompleted');
            // the second reviewer: submits, then Complete → Revert → "Review Submitted"; then thank without email
            await wizard('r9b', s, {comments: 'Ks29 r9b second comment.'});
            await as('ed', st.P);
            await openWf(s, 'r9b');
            out.row9bSubmitted = await rowRead('r9b');
            // A32: the window closed the moment it shows
            {
                const t0 = Date.now();
                await row('r9b').getByRole('button', {name: 'Read Review', exact: true}).click();
                await rd().waitFor({timeout: T});
                await rd().getByRole('button', {name: 'Cancel', exact: true}).last().click();
                const closedMs = Date.now() - t0;
                await rd().waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
                await sleep(2500); await idle(page);
                const same = await rowRead('r9b');
                const consider = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /\/consider/.test(e.name)).map((e) => Math.round(e.startTime)).slice(-3));
                await page.reload(); await idle(page); await openWf(s, 'r9b');
                out.a32 = {closedMs, rowSamePage: same.statusCellText, rowAfterReload: (await rowRead('r9b')).statusCellText, considerRequests: consider.length};
            }
            await openRD('r9b');
            await rd().getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            await dlg.waitFor({timeout: T});
            await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            await sleep(1500); await idle(page);
            await closeRD();
            out.row9bComplete = await rowRead('r9b');
            await row('r9b').getByRole('button', {name: 'Revert Decision', exact: true}).click();
            await rv.waitFor({timeout: T});
            out.revert9bNotices = (await withNotices(async () => { await rv.getByRole('button', {name: 'OK', exact: true}).click(); await rv.waitFor({state: 'hidden', timeout: T}).catch(() => {}); await sleep(1500); await idle(page); })).notices;
            out.row9bReverted = await rowRead('r9b');
            await openRD('r9b');
            const v9b = await rdRead('s9-9b-reverted');
            out.r9bAfterRevert = {hasComment: v9b.dialogText.includes('Ks29 r9b second comment.'), dated: v9b.dialogText.match(/(Review Completed|Review Submitted|Reviewer Thanked):[^\n]*?[AP]M/g)};
            await rd().getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            await dlg.waitFor({timeout: T});
            await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            await sleep(1500); await idle(page);
            await closeRD();
            await row('r9b').getByRole('button', {name: 'Thank Reviewer', exact: true}).click();
            await tm.locator('form#sendThankYouForm').waitFor({timeout: T}); await idle(page);
            await tm.locator('input[name="skipEmail"]').check();
            await tm.locator('form#sendThankYouForm').getByRole('button', {name: 'Thank Reviewer', exact: true}).click();
            await page.getByText('Review marked as acknowledged. Email not sent.').first().waitFor({timeout: 15000}).catch(() => {});
            out.thank9bNotice = await notices();
            await sleep(1500); await idle(page);
            await page.reload(); await idle(page); await openWf(s, 'r9b');
            out.row9bThanked = await rowRead('r9b');
            await sleep(1500);
            out.mail9b = ((await app.mail._search({to: `${u.r9b}@mail.test`}).catch(() => ({messages: []}))).messages || []).map((m) => m.Subject);
            out.mail9a = ((await app.mail._search({to: `${u.r9a}@mail.test`}).catch(() => ({messages: []}))).messages || []).map((m) => m.Subject);
            fact('s9', out);
        });

        // ---- s9d (opt-in): thank, revert, then a decision's "Notify Reviewers" thanks again (rW on S1)
        if (PHASES.includes('s9d')) await sect('s9d', async () => {
            const s = st.S1;
            const out = {};
            await as('ed', st.P);
            await openWf(s, 'rW');
            await openRD('rW');
            await rd().getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'}).last();
            await dlg.waitFor({timeout: T});
            await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
            await sleep(1500); await idle(page);
            await closeRD();
            await row('rW').getByRole('button', {name: 'Thank Reviewer', exact: true}).click();
            const tm = legacy('sendThankYouForm');
            await tm.locator('form#sendThankYouForm').waitFor({timeout: T}); await idle(page);
            await tm.locator('input[name="skipEmail"]').check();
            await tm.locator('form#sendThankYouForm').getByRole('button', {name: 'Thank Reviewer', exact: true}).click();
            await tm.locator('form#sendThankYouForm').waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
            await sleep(1500); await idle(page);
            await page.reload(); await idle(page); await openWf(s, 'rW');
            out.rowThanked = (await rowRead('rW')).statusCellText;
            await openRD('rW');
            out.datedThanked = (await rdRead('s9d-thanked')).dialogText.match(/(Review Completed|Review Submitted|Reviewer Thanked):[^\n]*?[AP]M/g);
            await closeRD();
            await row('rW').getByRole('button', {name: 'Revert Decision', exact: true}).click();
            const rv = page.getByRole('dialog').filter({hasText: 'Unconsider this Review'}).last();
            await rv.waitFor({timeout: T});
            await rv.getByRole('button', {name: 'OK', exact: true}).click();
            await rv.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(1500); await idle(page);
            out.rowReverted = (await rowRead('rW')).statusCellText;
            await sleep(61000); // a minute apart, so a second thank would carry another time
            // the decision: "Accept Submission", every step as it opens (its "Notify Reviewers" step included)
            await page.getByRole('button', {name: 'Accept Submission', exact: true}).first().click();
            await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            const steps = [];
            for (let i = 0; i < 8; i++) {
                await page.locator('.composer__loadingTemplateMask').first().waitFor({state: 'detached', timeout: T}).catch(() => {});
                await idle(page);
                const h = flat(await page.getByRole('heading', {level: 1}).first().innerText().catch(() => ''), 120);
                const sn = await snap(`s9d-decision-step-${i}`);
                steps.push({h1: h, snap: sn.name, text: flat(sn.s.text && sn.s.text.main, 500)});
                const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
                if (await rec.isVisible().catch(() => false)) {
                    await rec.click();
                    await page.getByRole('link', {name: 'View Submission'}).waitFor({timeout: 60000}).catch(() => {});
                    steps.push({recorded: true, snap: (await snap('s9d-decision-recorded')).name});
                    break;
                }
                await page.getByRole('button', {name: 'Continue', exact: true}).click();
                await sleep(800);
            }
            out.steps = steps;
            await openWf(s, 'rW');
            out.rowAfterDecision = (await rowRead('rW')).statusCellText;
            await openRD('rW');
            const v = await rdRead('s9d-after-decision');
            out.datedAfterDecision = v.dialogText.match(/(Review Completed|Review Submitted|Reviewer Thanked):[^\n]*?[AP]M/g);
            await closeRD();
            out.history = await history('rW', 's9d-history');
            fact('s9d decision thank', out);
        });

        // ---- h14d (opt-in, after pmod/pmod2): the History of the requests an editor submitted for the reviewer
        if (PHASES.includes('h14d')) await sect('h14d', async () => {
            const s = st.S2;
            await as('ed', st.P);
            await openWf(s, 'rU2');
            const out = {};
            for (const k of ['rU2', 'rA2', 'rE2', 'rQ', 'rK', 'rJ']) {
                try { out[k] = {row: (await rowRead(k)).statusCellText, history: await history(k, `h14d-${k}`)}; } catch (e) { out[k] = {failed: String(e.message).slice(0, 200)}; }
            }
            fact('h14d history', out);
        });

        // ---- status: the status table's remaining rows and the dated lines of 14c (S4)
        if (on('status')) await sect('status', async () => {
            const s = st.S4;
            const out = {};
            await as('ed', st.P);
            await openWf(s, 'qO1');
            out.initial = {};
            for (const k of ['qO1', 'qO2', 'qE', 'qX', 'qR']) out.initial[k] = await rowRead(k);
            await snap('status-initial');
            // "Request Sent:" before anything, on qO1
            await openRD('qO1', 'menu');
            const v0 = await rdRead('status-qO1-view-sent');
            out.sO1Sent = {dated: v0.dialogText.match(/(Request Sent|Reviewer Reminded|Request Accepted|Request Declined):[^\n]*?[AP]M/g), buttons: v0.buttons, besideMark: v0.dialogText.match(/A recommendation is required[^\n]*|This review is incomplete[^\n]*/g), text: flat(v0.dialogText, 1500), ci: v0.ci, snap: v0.snap};
            // a star on a request with no review
            const st0 = Date.now();
            await rd().locator('input[name="quality"][value="3"]').check({force: true}).catch(() => {});
            await page.getByText('Reviewer rating saved').first().waitFor({timeout: 10000}).catch(() => {});
            out.sO1Star = {toast: await page.getByText('Reviewer rating saved').count(), ms: Date.now() - st0};
            await closeRD();
            out.sO1RowAfterView = await rowRead('qO1');
            // backdate: qO1 and qR response due yesterday; qO2 response -2, review -1
            await editDates('qO1', -2, -1); // unanswered, both dates passed: which line?
            await editDates('qR', -1, null);
            await editDates('qO2', -2, -1);
            await page.reload(); await idle(page); await openWf(s, 'qO1');
            for (const k of ['qO1', 'qO2', 'qR']) out[`overdue_${k}`] = await rowRead(k);
            await snap('status-overdue');
            // Send Reminder on qR (twice) and on qO2 (accepted)
            const remind = async (k) => {
                await row(k).getByRole('button', {name: 'Send Reminder', exact: true}).click();
                const m = legacy('sendReminderForm');
                await m.getByText('Review Schedule').waitFor({timeout: T}); await mceReady('#sendReminderForm'); await idle(page);
                await m.locator('form#sendReminderForm').getByRole('button', {name: 'Send Reminder', exact: true}).click();
                await m.locator('form#sendReminderForm').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
                await sleep(1200); await idle(page);
                return notices();
            };
            out.remind1 = await remind('qR');
            await openRD('qR', 'menu');
            const vr1 = await rdRead('status-qR-view-reminded-1');
            out.sRReminded1 = vr1.dialogText.match(/(Request Sent|Reviewer Reminded|Request Accepted):[^\n]*?[AP]M/g);
            await closeRD();
            await sleep(61000); // the dated line carries minutes: a second reminder a minute later
            out.remind2 = await remind('qR');
            await openRD('qR', 'menu');
            const vr2 = await rdRead('status-qR-view-reminded-2');
            out.sRReminded2 = vr2.dialogText.match(/(Request Sent|Reviewer Reminded|Request Accepted):[^\n]*?[AP]M/g);
            await closeRD();
            out.remind3 = await remind('qO2');
            await openRD('qO2', 'menu');
            const va = await rdRead('status-qO2-view-accepted-reminded');
            out.sO2AcceptedReminded = {dated: va.dialogText.match(/(Request Sent|Reviewer Reminded|Request Accepted):[^\n]*?[AP]M/g), buttons: va.buttons, text: flat(va.dialogText, 1200), snap: va.snap};
            await closeRD();
            // declined: tooltip, Review Details "Request Declined:"; resend → "Request Resent"
            await openRD('qE', 'menu');
            const vd = await rdRead('status-qE-view-declined');
            out.sEDeclined = {dated: vd.dialogText.match(/(Request Sent|Request Declined|Request Accepted):[^\n]*?[AP]M/g), buttons: vd.buttons, ci: vd.ci, snap: vd.snap};
            await closeRD();
            await menuAction('qE', 'Resend Review Request');
            const rm = legacy('resendRequestReviewerForm');
            await rm.waitFor({timeout: T}); await mceReady('#resendRequestReviewerForm'); await idle(page);
            // A2: a response date and a review date that differ, so the row's line says which one it prints
            await pickDate(rm, 'responseDueDate', 10).catch((e) => log('resend response date', e.message));
            await pickDate(rm, 'reviewDueDate', 20).catch((e) => log('resend review date', e.message));
            const rsn = await snap('status-resend-window');
            const rmDates = await rm.evaluate((el) => [...el.querySelectorAll('input[type=hidden][name$="DueDate"]')].map((x) => `${x.name}=${x.value}`));
            await rm.getByRole('button', {name: 'Resend Review Request', exact: true}).click();
            await rm.locator('form#resendRequestReviewerForm').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
            await sleep(1200); await idle(page);
            out.sEResent = {row: await rowRead('qE'), resendWindowDates: rmDates, snap: rsn.name};
            await menuAction('qE', 'Edit');
            const em = legacy('editReviewForm');
            await em.locator('input[name="isReviewPubliclyVisible"]').waitFor({timeout: T}); await idle(page);
            out.sEResent.editDates = await em.evaluate((el) => [...el.querySelectorAll('input[type=hidden][name$="DueDate"]')].map((x) => `${x.name}=${x.value}`));
            await em.getByRole('link', {name: 'Cancel'}).or(em.getByRole('button', {name: 'Cancel', exact: true})).first().click(); await sleep(1200); await idle(page);
            // cancel an accepted request: "Request Cancelled"
            await menuAction('qX', 'Cancel Reviewer');
            const cm = legacy('cancelReviewForm');
            await cm.waitFor({timeout: T}); await mceReady('#cancelReviewForm'); await idle(page);
            await cm.getByRole('button', {name: 'Cancel Reviewer', exact: true}).click();
            await cm.locator('form#cancelReviewForm').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
            await sleep(1200); await idle(page);
            await page.reload(); await idle(page); await openWf(s, 'qX');
            out.final = {};
            for (const k of ['qO1', 'qO2', 'qE', 'qX', 'qR']) out.final[k] = await rowRead(k);
            out.sXMenu = await menu('qX'); await closeMenu('qX');
            const fsn = await snap('status-final');
            out.finalSnap = fsn.name;
            fact('status', out);
            if (RUN === 'r1') await loc(page, 'Reviewers row: the status title span', row('qX').locator('span.text-base-bold').first());
        });

        // ---- nread: the context without a policy (N) ------------------------
        if (on('nread')) await sect('nread', async () => {
            const s = st.SN;
            await as('edN', st.N);
            await openWf(s, 'nS');
            const rows = {};
            for (const k of ['nS', 'nU', 'nW']) rows[k] = await rowRead(k);
            await snap('nread-table');
            const reads = {};
            for (const k of ['nS', 'nW', 'nU']) {
                await openWf(s, k);
                await openRD(k, 'menu');
                const r = await rdRead(`nread-${k}`);
                reads[k] = {ci: r.ci, order: r.order, noCompetingLine: r.noCompetingLine, headings: r.headings, snap: r.snap, text: flat(r.dialogText, 1300)};
                await openMR();
                const e = await mrRead(`nread-${k}-modify`);
                reads[k].modify = {ci: e.ci, editors: e.editors, snap: e.snap, text: flat(e.dialogText, 1200)};
                if (k === 'nS') {
                    await typeMce('comments', 'Ks29 nS revised by the editor.');
                    if (!isOMP) await mr().locator('select[name="reviewerRecommendationId"]').selectOption({label: 'Revisions Required'});
                    reads[k].modify.save = await saveMR();
                    await settleRD();
                    const a = await rdRead('nread-nS-after');
                    reads[k].after = {ci: a.ci, snap: a.snap, text: flat(a.dialogText, 900)};
                } else { reads[k].modify.cancel = await cancelMR(); if (reads[k].modify.cancel.warning) await answerWarning('Yes'); }
                await closeRD();
            }
            fact('nread', {rows, reads, wizardStep1: st.rev && st.rev.nW && st.rev.nW.step1});
        });

        // ---- xpre: on X while the policy is on, the editor declares for xE ----
        if (on('xpre')) await sect('xpre', async () => {
            const s = st.SX;
            await as('edX', st.X);
            await openWf(s, 'xE');
            await openRD('xE');
            await openMR();
            const e = await mrRead('xpre-xE-edit');
            await ciRadio(mr(), 'hasCompetingInterests').check(); await sleep(800);
            const ty = await typeMce('competingInterests', CI_ED);
            const sv = await saveMR();
            await settleRD();
            const v = await rdRead('xpre-xE-after');
            await closeRD();
            const rows = {};
            for (const k of ['xD', 'xN', 'xU', 'xE', 'xV']) rows[k] = await rowRead(k);
            fact('xpre', {edit: {ci: e.ci, snap: e.snap}, typed: ty, save: sv, after: {ci: v.ci, snap: v.snap}, rows});
        });

        // ---- xoff: clear the policy on screen (Settings › Workflow › Review › Reviewer Guidance)
        if (on('xoff')) await sect('xoff', async () => {
            const {ReviewSettingsPage} = require(path.resolve(__dirname, '../../../pages/ReviewSettingsPages.js'));
            await as('edX', st.X);
            const sp = new ReviewSettingsPage(page, st.X);
            await sp.goto('Reviewer Guidance');
            await idle(page);
            const body = page.frameLocator('iframe[id^="reviewerGuidance-competingInterests-control"]').locator('body');
            await page.waitForFunction(() => { const mce = window.tinymce || window.tinyMCE; const e = mce && mce.get().find((x) => /competingInterests/.test(x.id)); return e && e.initialized; }, null, {timeout: T}).catch(() => {});
            const before = flat(await body.innerText().catch(() => ''), 300);
            await snap('xoff-before');
            await body.click();
            await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
            await sleep(500);
            await sp.guidance.saveButton.click();
            await sp.guidance.savedStatus.waitFor({timeout: T}).catch(() => {});
            const s1 = await snap('xoff-saved');
            await sp.reloadAndOpen('Reviewer Guidance').catch(() => {});
            await idle(page);
            await page.waitForFunction(() => { const mce = window.tinymce || window.tinyMCE; const e = mce && mce.get().find((x) => /competingInterests/.test(x.id)); return e && e.initialized; }, null, {timeout: T}).catch(() => {});
            const after = flat(await body.innerText().catch(() => ''), 300);
            const s2 = await snap('xoff-after-reload');
            fact('xoff', {before, after, notices: s1.s.notices, snaps: [s1.name, s2.name], dbSetting: db(`select locale, setting_value from ${isOMP ? 'press_settings' : 'journal_settings'} where setting_name='competingInterests' and ${isOMP ? 'press_id' : 'journal_id'}=(select ${isOMP ? 'press_id from presses' : 'journal_id from journals'} where path='${st.X}')`)});
        });

        // ---- xread: after the policy is gone ---------------------------------
        if (on('xread')) await sect('xread', async () => {
            const s = st.SX;
            // the late reviewer's step 1 (the wizard asks nothing now)
            await as('xV', st.X);
            const {ReviewWizardPage} = require(path.resolve(__dirname, '../../../pages/ReviewerPages.js'));
            const w = new ReviewWizardPage(page, st.X, {privateBoxLabel: PRIV});
            await w.goto(s.id); await idle(page); await w.expectStep(1).catch(() => {});
            const wz = await snap('xread-xV-step1');
            const xvStep1 = {ciRadios: await page.locator('input[name="competingInterestOption"]').count(), hasCIText: /Competing Interests/.test((wz.s.text && wz.s.text.main) || ''), snap: wz.name};
            await as('edX', st.X);
            await openWf(s, 'xD');
            const rows = {};
            for (const k of ['xD', 'xN', 'xU', 'xE', 'xV']) rows[k] = await rowRead(k);
            await snap('xread-table');
            const reads = {};
            for (const k of ['xD', 'xN', 'xE', 'xU']) {
                await openWf(s, k);
                await openRD(k, 'menu');
                const r = await rdRead(`xread-${k}`);
                reads[k] = {ci: r.ci, order: r.order, snap: r.snap, text: flat(r.dialogText, 1200)};
                await openMR();
                const e = await mrRead(`xread-${k}-modify`);
                reads[k].modify = {ci: e.ci, editors: e.editors, snap: e.snap};
                if (k === 'xD') {
                    const ty = await typeMce('competingInterests', CI_ED2);
                    reads[k].modify.typed = ty;
                    reads[k].modify.save = await saveMR({expectClose: false});
                    if (await mr().isVisible().catch(() => false)) { reads[k].modify.stillOpen = flat((await snap('xread-xD-save-stuck')).s.text.dialog, 600); const cc = await cancelMR(); if (cc.warning) await answerWarning('Yes'); }
                    await settleRD();
                    const a = await rdRead('xread-xD-after');
                    reads[k].after = {ci: a.ci, snap: a.snap};
                } else if (k === 'xN') {
                    await ciRadio(mr(), 'hasCompetingInterests').check(); await sleep(800);
                    reads[k].modify.typed = await typeMce('competingInterests', CI_ED);
                    reads[k].modify.save = await saveMR({expectClose: false});
                    if (await mr().isVisible().catch(() => false)) { const cc = await cancelMR(); if (cc.warning) await answerWarning('Yes'); }
                    await settleRD();
                    const a = await rdRead('xread-xN-after');
                    reads[k].after = {ci: a.ci, snap: a.snap};
                } else { reads[k].modify.cancel = await cancelMR(); if (reads[k].modify.cancel.warning) await answerWarning('Yes'); }
                await closeRD();
            }
            const rowsAfter = {};
            await page.reload(); await idle(page); await openWf(s, 'xD');
            for (const k of ['xD', 'xN', 'xE']) rowsAfter[k] = await rowRead(k);
            fact('xread', {xvStep1, rows, reads, rowsAfter, xDStep1: st.rev && st.rev.xD && st.rev.xD.step1});
        });
    } finally {
        record(`${RUN}-dialogs`, dialogsSeen);
        record(`${RUN}-puts`, puts.map(({at, ...r}) => ({t: new Date(at).toISOString(), ...r})));
        if (RUN === 'r1' && on('pread')) note(`ccKs29 [${A}] · Review Details / Modify Review (after ui-library#993): the competing-interests answer is a Vue form group "Competing Interests" (radios \`input[type=radio][value="noCompetingInterests"|"hasCompetingInterests"]\`, the statement a rich-text field whose TinyMCE id contains "-competingInterests-"); present when the context has a policy or the assignment is declared. Settle the view window on an enabled "Modify Review" before reading it.`);
        await close();
    }
});
