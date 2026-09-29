// U27 claim check I29 (housekeeping 2026-09-29): incidentals row 17, the reviewer
// row's "Edit Review" window left by its top "Close" (per .reports/hk29/chunks/U27.md).
// OJS and OMP (OPS has no review stage; its absence is U26's). Every run seeds its
// own scratch context "I29 <t>" (nothing on publicknowledge):
//   mg (manager, the Journal/Press Manager level), se (sectionEditor, the
//   sub-editor level, a participant), au (author), reviewers rA..rF
//   (externalReviewer, all "accepted" on one external round); OMP adds rI
//   (internalReviewer, accepted on an internal round of a second submission).
// Variants, each on its own reviewer row, each read on the page and after a reload
// (and in review_assignments):
//   V1 mg/rA  tick "Publicly Show Reviewer Comments", top "Close": the question
//             answered "Cancel" (window kept?), then "Close" again answered "OK"
//   V2 mg/rB  tick the box, bottom "Cancel" (control: asks nothing)
//   V3 mg/rC  the review due date retyped only, top "Close", answered "OK"
//   V4 mg/rD  untouched, top "Close"
//   V5 mg/rF  the "Review Type" radio changed only, top "Close", answered "OK" (sweep)
//   V6 se/rE  V1 as the sub-editor level
//   V7 mg/rI  V1 on OMP's Internal Review stage
// Run twice, each under its own facts name:
//   RUN=r1 PROBE_FEATURE=U27 PROBE_AGENT=ccI29 node bin/probe.js ojs shared/playwright/checks/U27/I29/i29.js
//   RUN=r2 …  (and `omp`); VARIANTS=V1,V3 narrows.
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const VARIANTS = (process.env.VARIANTS || 'V1,V2,V3,V4,V5,V6,V7').split(',');
const T = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const NAMES = {mg: ['Mona', 'Manager'], se: ['Seth', 'Subeditor'], au: ['Ava', 'Author'],
    rA: ['Rae', 'Closer'], rB: ['Rob', 'Canceller'], rC: ['Rita', 'Dater'], rD: ['Rudi', 'Untouched'],
    rE: ['Remy', 'Subclose'], rF: ['Rhea', 'Typer'], rI: ['Ines', 'Internal']};
const full = (k) => NAMES[k].join(' ');

forEachApp(async (app) => {
    const A = app.name;
    if (A === 'ops') { console.log('[i29] ops: no review stage; skipped'); return; }
    const isOMP = A === 'omp';
    const T0 = Date.now();
    const log = (...a) => console.log(`[i29 ${RUN} ${A} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const fact = (k, v) => { record(`i29-facts-${RUN}`, {[k]: v}, {merge: true}); log(`[${k}]`, JSON.stringify(v).slice(0, 1800)); };
    const db = (q) => {
        try {
            return execFileSync('psql', ['-d', app.db, '-At', '-F', '|', '-c', q], {encoding: 'utf8', timeout: 20000}).trim().split('\n').filter(Boolean);
        } catch (e) { return [`ERROR ${flat(e.message, 200)}`]; }
    };

    // ---- seed ---------------------------------------------------------------
    const t = tag('u27i29');
    const u = Object.fromEntries(Object.keys(NAMES).map((k) => [k, `${t}${k.toLowerCase()}`]));
    const person = (k, roles) => ({username: u[k], roles, givenName: NAMES[k][0], familyName: NAMES[k][1]});
    const revs = ['rA', 'rB', 'rC', 'rD', 'rE', 'rF'];
    const users = [person('mg', ['manager']), person('se', ['sectionEditor']), person('au', ['author']), ...revs.map((k) => person(k, ['externalReviewer']))];
    if (isOMP) users.push(person('rI', ['internalReviewer']));
    const C = await app.api.createContext({tag: t, context: {name: `I29 ${t}`}, users});
    const ctx = C.path;
    const s1 = await app.api.createSubmission({tag: `${t}s1`, context: ctx, submitter: u.au, title: `I29 s1 ${t}`,
        decisions: ['sendExternalReview'], participants: [{username: u.se, role: 'sectionEditor'}],
        reviewRounds: [{reviewers: revs.map((k) => ({username: u[k], status: 'accepted'}))}]});
    let s2 = null;
    if (isOMP) {
        s2 = await app.api.createSubmission({tag: `${t}s2`, context: ctx, submitter: u.au, title: `I29 s2 ${t}`,
            decisions: ['sendInternalReview'], reviewRounds: [{reviewers: [{username: u.rI, status: 'accepted'}]}]});
    }
    fact('seed', {ctx, s1: {id: s1.submissionId, rounds: s1.reviewRounds}, s2: s2 && {id: s2.submissionId, rounds: s2.reviewRounds}});
    const reviewDb = (sid, k) => db(`select ra.review_id, ra.is_review_publicly_visible, ra.review_method, ra.date_due::date, ra.date_response_due::date from review_assignments ra join users us on us.user_id = ra.reviewer_id where ra.submission_id = ${sid} and us.username = '${u[k]}'`)[0];

    // ---- browser ------------------------------------------------------------
    const {page} = await launch(app);
    const jsDialogs = [], net = [], pageErrors = [];
    let answer = 'dismiss';
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300), answered: d.type() === 'beforeunload' ? 'accept' : answer});
        if (d.type() === 'beforeunload' || answer === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    page.on('response', (r) => { const x = r.url(); if (r.status() >= 400 || r.request().method() !== 'GET') net.push({at: Date.now(), m: r.request().method(), s: r.status(), u: x.replace(/^https?:\/\/[^/]+/, '').slice(0, 200)}); });
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), text: flat(e.message, 200)}));
    const since = (arr, t0) => arr.filter((x) => x.at >= t0).map(({at, ...x}) => ({ms: at - t0, ...x}));
    let snapN = 0;
    async function snap(label, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const name = `${RUN}-${String(++snapN).padStart(3, '0')}-${label}`;
        record(name, s);
        await shot(page, name).catch(() => {});
        return `${name}-${A}`;
    }
    const as = async (k) => { await signIn(page, u[k], {contextPath: ctx}); await idle(page); };
    const wfUrl = (sub) => app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${sub.submissionId}&workflowMenuKey=workflow_${sub.reviewRounds[0].stageId}_${sub.reviewRounds[0].id}`);
    const row = (k) => page.getByRole('table', {name: 'Reviewers', exact: true}).getByRole('row').filter({hasText: full(k)}).first();
    async function openWf(sub, k) {
        await page.goto(wfUrl(sub)); await idle(page);
        await row(k).waitFor({timeout: T}).catch(() => log('no row', k));
        await idle(page);
    }
    const edit = () => page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')}).last();
    const box = () => edit().locator('input[name="isReviewPubliclyVisible"]');
    const topClose = () => edit().getByRole('button', {name: 'Close', exact: true}).first();
    const bottomCancel = () => edit().getByRole('link', {name: 'Cancel', exact: true}).first();
    async function openEdit(k) {
        await sleep(700); // the modal store's 450 ms close slot (patterns pitfall 4)
        await row(k).getByRole('button', {name: /More Actions/}).first().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        const items = (await page.getByRole('menuitem').allInnerTexts()).map((x) => x.trim());
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        await box().waitFor({timeout: T}); await idle(page); await sleep(500);
        return items;
    }
    const readEdit = async () => edit().evaluate((el) => ({
        publicVisible: el.querySelector('input[name="isReviewPubliclyVisible"]').checked,
        reviewDue: el.querySelector('input[type="hidden"][name="reviewDueDate"]')?.value,
        responseDue: el.querySelector('input[type="hidden"][name="responseDueDate"]')?.value,
        method: [...el.querySelectorAll('input[name="reviewMethod"]')].find((r) => r.checked)?.value,
        methods: [...el.querySelectorAll('input[name="reviewMethod"]')].map((r) => ({value: r.value, label: (r.closest('label') || r.parentElement).innerText.trim()})),
    }));
    const isOpen = async () => edit().locator('form#editReviewForm').isVisible().catch(() => false);
    async function pressClose(label, how, ans) {
        answer = ans;
        const t0 = Date.now();
        if (how === 'close') await topClose().click(); else await bottomCancel().click();
        await sleep(2000);
        const out = {pressed: how, answer: ans, dialogs: since(jsDialogs, t0), open: await isOpen(), posts: since(net, t0).filter((x) => x.m !== 'GET')};
        out.state = out.open ? await readEdit().catch(() => null) : null;
        out.snap = await snap(label, out);
        answer = 'dismiss';
        return out;
    }
    async function reads(sub, k, label) {
        // the same page: the row, then "Edit" reopened
        const out = {sameRow: flat(await row(k).innerText().catch(() => ''), 200)};
        await openEdit(k);
        out.reopenSame = await readEdit();
        out.reopenSameSnap = await snap(`${label}-reopen-same-page`);
        await bottomCancel().click(); await sleep(1500);
        // after a reload
        await openWf(sub, k);
        await openEdit(k);
        out.reopenReload = await readEdit();
        out.reopenReloadSnap = await snap(`${label}-reopen-after-reload`);
        await bottomCancel().click(); await sleep(1500);
        out.db = reviewDb(sub.submissionId, k);
        return out;
    }
    const typeDate = async (value) => {
        const b = edit().locator('input[name="reviewDueDate-removed"]');
        await b.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
        await page.keyboard.type(value, {delay: 50}); await page.keyboard.press('Tab'); await sleep(500);
        return readEdit();
    };

    async function variant(id, who, sub, k, change, how, answers) {
        if (!VARIANTS.includes(id)) return;
        const t0 = Date.now();
        const out = {who, reviewer: k, change, how};
        try {
            await as(who);
            await openWf(sub, k);
            out.stageSnap = await snap(`${id}-stage`);
            out.menu = await openEdit(k);
            out.before = await readEdit();
            out.db0 = reviewDb(sub.submissionId, k);
            out.openSnap = await snap(`${id}-edit-open`, out.before);
            if (id === 'V1' && RUN === 'r1') {
                await loc(page, 'Reviewer row "Edit" window ("Edit Review"): top "Close" button', topClose());
                await loc(page, 'Reviewer row "Edit" window: "Publicly Show Reviewer Comments" box', box());
                await loc(page, 'Reviewer row "Edit" window: bottom "Cancel" link', bottomCancel());
            }
            if (change === 'public') { await box().check(); await box().blur().catch(() => {}); await sleep(400); }
            if (change === 'date') out.typed = await typeDate(ymd(41));
            if (change === 'method') {
                const other = out.before.methods.find((m) => m.value !== out.before.method);
                await edit().locator(`input[name="reviewMethod"][value="${other.value}"]`).check(); await sleep(400);
                out.picked = other;
            }
            out.changed = await readEdit();
            out.changedSnap = await snap(`${id}-changed`, out.changed);
            out.presses = [];
            for (let i = 0; i < answers.length; i++) {
                const p = await pressClose(`${id}-${how}-${answers[i]}`, how, answers[i]);
                out.presses.push(p);
                if (!p.open) break;
            }
            await sleep(1000);
            out.lateDialogs = since(jsDialogs, t0).length;
            Object.assign(out, await reads(sub, k, id));
        } catch (e) {
            out.FAILED = flat(e.stack || e, 800);
            out.failSnap = await snap(`${id}-failed`).catch(() => null);
        }
        out.crashes = {server: since(net, t0).filter((x) => x.s >= 500), script: since(pageErrors, t0)};
        out.allDialogs = since(jsDialogs, t0);
        fact(id, out);
    }

    await variant('V1', 'mg', s1, 'rA', 'public', 'close', ['dismiss', 'accept']);
    await variant('V2', 'mg', s1, 'rB', 'public', 'cancel', ['accept']);
    await variant('V3', 'mg', s1, 'rC', 'date', 'close', ['accept']);
    await variant('V4', 'mg', s1, 'rD', 'none', 'close', ['accept']);
    await variant('V5', 'mg', s1, 'rF', 'method', 'close', ['accept']);
    await variant('V6', 'se', s1, 'rE', 'public', 'close', ['dismiss', 'accept']);
    if (isOMP) await variant('V7', 'mg', s2, 'rI', 'public', 'close', ['dismiss', 'accept']);
    if (RUN === 'r1') {
        note(`ccI29 [${A}] · Reviewers row › "Edit" ("Edit Review", form#editReviewForm): the top "Close" is \`getByRole('button', {name: 'Close', exact: true})\` in the dialog filtered by the form; with the form changed it raises a browser confirm() (form.dataHasChanged, FormHandler.containerCloseHandler), so register page.on('dialog') with the answer before pressing; the bottom "Cancel" link asks nothing. Reopening "Edit" right after a close waits out the modal store's 450 ms slot.`);
    }
});
