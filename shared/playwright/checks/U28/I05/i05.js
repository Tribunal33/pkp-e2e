// U28 claim check, housekeeping chunk I05 (hk05, 2026-10-05): the three incidentals rows in
// .reports/hk05/drive/U28/rows.md.
//   R096  "My Assignments as Reviewer" on the due day itself (U28 Rule 3 table, l.134-137; A5's
//         "overdue from the start of the 30th"). One scratch journal (press) per run, one reviewer, six
//         requests whose dates the Journal Manager (Press manager) sets in the reviewer row's "Edit"
//         window, the axis driven at both ends:
//           A0 accepted, review due yesterday     A1 accepted, review due today     A2 accepted, review due tomorrow
//              (each with the response due ten days ago: the window refuses a review due before the response due)
//           U0 unanswered, response due yesterday U1 unanswered, response due today U2 unanswered, response and
//           review both due today (the code's "review overdue" branch for an unanswered request)
//         Read on the reviewer's list ("Action Required by me" landing and "All assignments"), again after a
//         reload; A1's "Finish review" pressed; the editor's Reviewers row read beside it. {OJS OMP}
//   R032  {OMP} a review marked "Publicly Show Reviewer Comments" (the row's "Edit"), its "Mark as Complete"
//         dialog, then the published book's page read signed out (and after a reload), as a Reader and as the
//         Press manager; control B2 left private; other end B3: a press whose default makes every new review
//         public, its book seeded published. Settings › Workflow › Review › "Setup" read for the press's option.
//   R040  {OJS} Settings › Workflow › Review › "Reviewer Recommendations": each row's "Activate" tick box,
//         its accessible name (Chromium's accessibility tree, as a screen reader gets it), its keyboard use;
//         as the Journal Manager and the Site Administrator. Controls: OMP's and OPS's Workflow settings tabs.
//
// Phases (PHASES=due,public,recs; default all that apply to the app), each seeding its own scratch context.
// Run twice, each under its own PROBE_RUN (OMP outlasts 600 s, run detached):
//   PROBE_RUN=r1 PROBE_FEATURE=U28 PROBE_AGENT=ccI05 node bin/probe.js all shared/playwright/checks/U28/I05/i05.js
//   PROBE_RUN=r2 …
// No assertions: the script records, the reader judges. Database reads (SELECT) are evidence only.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, sql} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'r0';
const PHASES = (process.env.PHASES || 'due,public,recs').split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const T = 30_000;
const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php\//, '');
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOff = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };

function fact(key, value) {
    record('i05-facts', {[key]: value}, {merge: true});
    console.log(`[i05 ${RUN} +${Math.round((Date.now() - T0) / 1000)}s] [${key}]`, JSON.stringify(value).slice(0, 1800));
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const db = (q) => { try { return sql(app, q).split('\n').filter(Boolean); } catch (e) { return [`ERROR ${flat(e.message, 200)}`]; } };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    await app.api.bootstrapProbe(app.contextPath);

    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    const jsDialogs = [], net = [], pageErrors = [], consoleErrs = [];
    let dialogAnswer = null; // null: accept beforeunload, dismiss the rest
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300)});
        if (d.type() === 'beforeunload' || dialogAnswer === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 || /\/api\/|\$\$\$call\$\$\$/.test(u)) net.push({at: Date.now(), m: r.request().method(), u: strip(u).slice(0, 220), s: r.status()}); });
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), text: flat(e.message, 200), url: strip(page.url())}));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push({at: Date.now(), text: flat(m.text(), 200), url: strip(page.url())}); });
    const since = (arr, t0) => arr.filter((x) => x.at >= t0).map(({at, ...x}) => x);

    let snapN = 0;
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), text: {}, screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `i05-${String(++snapN).padStart(3, '0')}-${name}`;
        record(n, s);
        await shot(page, n).catch(() => {});
        s.name = `${n}-${RUN}-${app.name}`;
        return s;
    }
    async function sect(name, fn) {
        if (!on(name)) return;
        const t0 = Date.now();
        console.log(`[i05 ${RUN} ${app.name}] == ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 1500));
            await snap(`zz-failed-${name}`).catch(() => {});
        }
        fact(`${name}.crashes`, {server: since(net, t0).filter((r) => r.s >= 500), script: since(pageErrors, t0), consoleErrors: since(consoleErrs, t0).slice(0, 20)});
        const b4 = since(net, t0).filter((r) => r.s >= 400 && r.s < 500);
        if (b4.length) fact(`${name}.4xx`, b4.slice(0, 40));
        const d = since(jsDialogs, t0);
        if (d.length) fact(`${name}.dialogs`, d);
    }
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r; };
    let who = null;
    const as = async (user, ctx) => { if (who === `${user}@${ctx}`) return; await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); who = `${user}@${ctx}`; };
    const visitor = async () => { if (who === null) return; await signOut(page).catch(() => {}); await idle(page).catch(() => {}); who = null; };

    async function mkCtx(key, extra = {}, roles = []) {
        const t = tag(`u28i05${key}`).slice(0, 28) + RUN;
        const base = [['mg', ['manager'], 'Mona', 'Manager'], ['au', ['author'], 'Ada', 'Author'], ['rd', ['reader'], 'Rosa', 'Reader'], ...roles];
        const {context: cx = {}, ...rest} = extra;
        const res = await app.api.createContext({tag: t, context: {name: `U28 I05 ${key} ${t}`, contactName: 'Pat Principal', contactEmail: `${t}pc@mail.test`, country: 'CA', ...cx},
            users: base.map(([u, r, g, f]) => ({username: `${t}${u}`, roles: r, givenName: g, familyName: f})), ...rest});
        const C = {path: res.path || t, id: res.contextId, u: Object.fromEntries(base.map(([u]) => [u, `${t}${u}`])), subs: {}};
        fact(`${key}.seed`, {path: C.path, id: C.id});
        return C;
    }
    async function mkSub(C, key, spec) {
        const title = spec.title || `I05 ${key} ${C.path}`;
        try {
            const {submitter, ...r} = spec;
            const res = await app.api.createSubmission({tag: `${C.path}${key}`.slice(0, 32), context: C.path, submitter: submitter || C.u.au, title, ...r});
            C.subs[key] = {id: res.submissionId, pub: res.publicationId, title};
        } catch (e) {
            C.subs[key] = {error: flat(e.message, 500), title};
        }
        return C.subs[key];
    }

    // ---------------------------------------------------------------- the workflow (after U28 K1, U13 I28)
    const wf = () => page.locator('[role="dialog"]:visible').first();
    async function openWf(ctx, sid, key) {
        await go(cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`));
        await page.getByRole('heading', {name: /^Workflow:/}).waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await sleep(800);
    }
    const revPanel = () => page.locator('div').filter({has: page.getByRole('table', {name: 'Reviewers', exact: true})}).last();
    const revRow = (name) => revPanel().getByRole('row').filter({hasText: name}).first();
    async function openEdit(ctx, sid, reviewer) {
        await openWf(ctx, sid);
        await revRow(reviewer).waitFor({timeout: T});
        await revRow(reviewer).getByRole('button', {name: 'More Actions'}).click();
        await sleep(500);
        const items = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const edit = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')});
        await edit.locator('form#editReviewForm input.datepicker').first().waitFor({timeout: T});
        await idle(page); await sleep(600);
        return {edit, items};
    }
    async function pickDate(scope, fieldPrefix, date) {
        const input = scope.locator(`input.datepicker[id^="${fieldPrefix}"]`);
        await input.click();
        const picker = page.locator('#ui-datepicker-div');
        await picker.waitFor({timeout: 15000});
        await picker.locator('select.ui-datepicker-year').selectOption(String(date.getFullYear()));
        await picker.locator('select.ui-datepicker-month').selectOption(String(date.getMonth()));
        await picker.locator('td:not(.ui-datepicker-other-month) a').filter({hasText: new RegExp(`^${date.getDate()}$`)}).first().click();
        await picker.waitFor({state: 'hidden', timeout: 15000});
    }
    async function saveEdit(edit) {
        const t0 = Date.now();
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /update-review|updateReview/i.test(r.url()), {timeout: T}).catch(() => null);
        await edit.getByRole('button', {name: /^(OK|Save)$/}).first().click();
        const r = await w;
        let body = null;
        if (r) { try { body = flat(await r.text(), 300); } catch { /* none */ } }
        let closed = true;
        try { await edit.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: 10000}); } catch { closed = false; }
        await idle(page); await sleep(600);
        return {status: r ? r.status() : null, body: body && /"status":\s*false/.test(body) ? body : (body ? 'status true' : null), closed, errors: closed ? [] : await edit.locator('.error, .pkp_form_error, label.error').allInnerTexts().catch(() => []), traffic: since(net, t0).filter((x) => x.m !== 'GET')};
    }

    // ================================================================ R096 (OJS, OMP): the due day
    await sect('due', async () => {
        if (isOPS) return;
        const J = await mkCtx('d', {}, [['rv', ['externalReviewer'], 'Rhea', 'Duetest']]);
        const today = dayOff(0), yesterday = dayOff(-1), tomorrow = dayOff(1), later = dayOff(14);
        const plan = {
            A0: {status: 'accepted', response: dayOff(-10), review: yesterday, label: 'accepted, review due yesterday'},
            A1: {status: 'accepted', response: dayOff(-10), review: today, label: 'accepted, review due today'},
            A2: {status: 'accepted', response: dayOff(-10), review: tomorrow, label: 'accepted, review due tomorrow'},
            U0: {status: 'invited', response: yesterday, review: later, label: 'unanswered, response due yesterday'},
            U1: {status: 'invited', response: today, review: later, label: 'unanswered, response due today'},
            U2: {status: 'invited', response: today, review: today, label: 'unanswered, response and review both due today'},
        };
        for (const [k, p] of Object.entries(plan)) {
            await mkSub(J, k, {title: `I05 ${k} due ${J.path}`, decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: J.u.rv, status: p.status}]}]});
        }
        fact('due.subs', {today: ymd(today), serverNow: db('select now()'), subs: J.subs});
        if (Object.values(J.subs).some((s) => s.error)) return;
        // the manager sets each request's dates in the reviewer row's "Edit" window
        await as(J.u.mg, J.path);
        const edits = {};
        for (const [k, p] of Object.entries(plan)) {
            const s = J.subs[k];
            const {edit, items} = await openEdit(J.path, s.id, 'Rhea Duetest');
            const before = await edit.locator('input.datepicker').evaluateAll((els) => els.map((e) => ({id: e.id.replace(/-[^-]*$/, ''), value: e.value})));
            if (k === 'A1') { await snap('due-edit-window-A1'); await loc(page, 'Reviewer row "Edit": review due date box', edit.locator('input.datepicker[id^="reviewDueDate"]')); }
            if (p.response) await pickDate(edit, 'responseDueDate', p.response);
            if (p.review) await pickDate(edit, 'reviewDueDate', p.review);
            const values = await edit.locator('input.datepicker').evaluateAll((els) => els.map((e) => ({id: e.id.replace(/-[^-]*$/, ''), value: e.value})));
            const saved = await saveEdit(edit);
            if (!saved.closed) { await snap(`due-edit-${k}-refused`); await edit.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {}); await sleep(800); }
            edits[k] = {menu: items, before, values, saved, db: db(`select date_response_due, date_due, date_confirmed is not null from review_assignments where submission_id=${s.id}`)};
            // the editor's row, as the editor reads it right after
            await openWf(J.path, s.id);
            edits[k].editorRow = flat(await revRow('Rhea Duetest').innerText().catch(() => ''), 300);
            if (k === 'A1' || k === 'U1' || k === 'U2') await snap(`due-editor-row-${k}`);
        }
        fact('due.edits', edits);
        // the reviewer's list
        await as(J.u.rv, J.path);
        const readRows = async () => page.evaluate(() => {
            const t = document.querySelector('main table');
            if (!t) return {headers: null, rows: []};
            return {headers: [...t.querySelectorAll('thead th')].map((x) => x.innerText.trim()),
                rows: [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td, th')].map((c) => c.innerText.trim().replace(/\s+/g, ' ') + ([...c.querySelectorAll('button, a')].length ? ` [${[...c.querySelectorAll('button, a')].map((b) => `${b.tagName}:${b.innerText.trim()}`).join('|')}]` : '')))};
        });
        const waitList = async () => {
            await page.locator('main table tbody tr').first().waitFor({timeout: 20000}).catch(() => {});
            await page.waitForFunction(() => { const t = document.querySelector('main table'); return t && !/Loading/i.test(t.innerText); }, null, {timeout: 20000}).catch(() => {});
            await idle(page);
        };
        const byKey = (list) => Object.fromEntries(Object.keys(plan).map((k) => [k, (list.rows.find((r) => r.some((c) => c.includes(`I05 ${k} due`))) || null)]));
        const reads = {};
        await go(cu(J.path, '/dashboard/reviewAssignments'));
        await waitList();
        const landing = await snap('due-reviewer-landing');
        reads.landing = {url: strip(landing.url), heading: flat(await page.locator('main h1').first().innerText().catch(() => null), 80), rows: byKey(await readRows())};
        await page.reload(); await waitList();
        await snap('due-reviewer-landing-reload');
        reads.landingReload = byKey(await readRows());
        await go(cu(J.path, '/dashboard/reviewAssignments?currentViewId=reviewer-assignments-all'));
        await waitList();
        const all = await snap('due-reviewer-all');
        const allRows = await readRows();
        reads.all = {heading: flat(await page.locator('main h1').first().innerText().catch(() => null), 80), headers: allRows.headers, rows: byKey(allRows)};
        await loc(page, 'Reviewer list: a row\'s "Editorial Activity" cell (A1, due today)', page.locator('main table tbody tr').filter({hasText: 'I05 A1 due'}).locator('td').nth(2));
        await page.reload(); await waitList();
        await snap('due-reviewer-all-reload');
        reads.allReload = byKey(await readRows());
        reads.apiStatus = db(`select s.submission_id, ra.date_response_due, ra.date_due, ra.date_confirmed is not null as accepted from review_assignments ra join submissions s on s.submission_id = ra.submission_id where s.context_id = ${J.id} order by s.submission_id`);
        fact('due.reads', reads);
        // A1's button pressed: where it leads, and step 1's dates
        const btn = page.locator('main table tbody tr').filter({hasText: 'I05 A1 due'}).locator('td').last().getByRole('button').first();
        const label = flat(await btn.innerText().catch(() => null), 40);
        await btn.click().catch(() => {});
        await page.waitForURL(/reviewer\/submission/, {timeout: T}).catch(() => {});
        await idle(page);
        const wz = await snap('due-A1-wizard');
        fact('due.A1press', {label, url: strip(page.url()), tab: await page.locator('[role="tab"][aria-selected="true"]').allInnerTexts().catch(() => null),
            dueLines: String(wz.text.main || '').split('\n').filter((l) => /Due Date|\d{4}-\d{2}-\d{2}/.test(l)).slice(0, 8)});
        // U2's button too (an unanswered request in the "review overdue" state, if it reads so)
        await go(cu(J.path, '/dashboard/reviewAssignments?currentViewId=reviewer-assignments-all'));
        await waitList();
        const b2 = page.locator('main table tbody tr').filter({hasText: 'I05 U2 due'}).locator('td').last().getByRole('button').first();
        const l2 = flat(await b2.innerText().catch(() => null), 40);
        await b2.click().catch(() => {});
        await page.waitForURL(/reviewer\/submission/, {timeout: T}).catch(() => {});
        await idle(page);
        const wz2 = await snap('due-U2-wizard');
        fact('due.U2press', {label: l2, url: strip(page.url()), tab: await page.locator('[role="tab"][aria-selected="true"]').allInnerTexts().catch(() => null),
            dueLines: String(wz2.text.main || '').split('\n').filter((l) => /Due Date|\d{4}-\d{2}-\d{2}/.test(l)).slice(0, 8)});
        await visitor();
    });

    // ================================================================ R032 (OMP): a public review and the book page
    await sect('public', async () => {
        if (!isOMP) return;
        const J = await mkCtx('p', {review: {defaultReviewMode: 'open', defaultReviewPublicVisibility: false}},
            [['rv1', ['externalReviewer'], 'Rhea', 'Openreviewer'], ['rv2', ['externalReviewer'], 'Ravi', 'Closedreviewer'], ['se', ['sectionEditor'], 'Sam', 'Serieseditor']]);
        const tok = (k) => `I05TOKEN${k}${J.path}`;
        const B1 = await mkSub(J, 'b1', {title: `I05 Public Review Book ${J.path}`, decisions: ['sendExternalReview'], participants: [{username: J.u.se, role: 'sectionEditor'}],
            reviewRounds: [{reviewers: [{username: J.u.rv1, status: 'completed', comments: `Open review text ${tok('B1')} for the public.`}]}]});
        const B2 = await mkSub(J, 'b2', {title: `I05 Private Review Book ${J.path}`, decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: J.u.rv2, status: 'completed', comments: `Open review text ${tok('B2')} kept private.`}]}]});
        const dbRev = (sid) => db(`select review_id, review_method, is_review_publicly_visible, considered, date_completed is not null from review_assignments where submission_id=${sid}`);
        fact('public.seedDb', {B1, B2, b1: B1.id && dbRev(B1.id), b2: B2.id && dbRev(B2.id)});
        if (B1.error || B2.error) return;
        await as(J.u.mg, J.path);
        // the press's review settings: is there a "publicly visible" option?
        await go(cu(J.path, '/management/settings/workflow#review'));
        await page.locator('#review-button').first().click().catch(() => {});
        await idle(page); await sleep(800);
        const setup = await snap('public-settings-review-setup');
        fact('public.settingsSetup', {lines: String(setup.text.main || '').split('\n').filter((l) => /public|visible|Review Mode|Default Review/i.test(l)).map((l) => flat(l, 200)).slice(0, 12)});
        // B1: the Edit window as it opens; left once with the box changed and unsaved
        const out = {};
        {
            const {edit, items} = await openEdit(J.path, B1.id, 'Rhea Openreviewer');
            const box = edit.locator('input[name="isReviewPubliclyVisible"]');
            out.boxCount = await box.count();
            out.menu = items;
            out.was = out.boxCount ? await box.isChecked() : null;
            out.label = flat(await edit.locator('form#editReviewForm').evaluate((f) => { const b = f.querySelector('input[name="isReviewPubliclyVisible"]'); if (!b) return null; const fs = b.closest('fieldset'); return fs ? fs.innerText : (b.closest('label') || {}).innerText; }).catch(() => null), 400);
            out.reviewType = await edit.locator('input[name="reviewMethod"]:checked').evaluate((r) => (r.closest('label') || {}).innerText || r.value).catch(() => null);
            await snap('public-b1-edit-window', {was: out.was, label: out.label});
            await loc(page, 'OMP reviewer row "Edit": "Publicly Show Reviewer Comments" box', box);
            if (out.boxCount) {
                await box.check(); await box.blur().catch(() => {}); await sleep(400);
                const t0 = Date.now();
                await edit.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                await sleep(1500);
                out.leave = {dialogs: since(jsDialogs, t0), stillOpen: await edit.locator('form#editReviewForm').isVisible().catch(() => false)};
                if (out.leave.stillOpen) { dialogAnswer = 'accept'; await edit.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {}); await sleep(1500); dialogAnswer = null; }
                await snap('public-b1-edit-left-unsaved', out.leave);
                const again = await openEdit(J.path, B1.id, 'Rhea Openreviewer');
                out.leave.reopened = await again.edit.locator('input[name="isReviewPubliclyVisible"]').isChecked().catch(() => null);
                out.leave.db = dbRev(B1.id);
                // tick and save
                await again.edit.locator('input[name="isReviewPubliclyVisible"]').check();
                out.save = await saveEdit(again.edit);
                out.save.db = dbRev(B1.id);
                await snap('public-b1-edit-saved', out.save);
                const third = await openEdit(J.path, B1.id, 'Rhea Openreviewer');
                out.save.reopened = await third.edit.locator('input[name="isReviewPubliclyVisible"]').isChecked().catch(() => null);
                await third.edit.getByRole('link', {name: 'Cancel', exact: true}).or(third.edit.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
                await sleep(800);
            }
        }
        fact('public.edit', out);
        // the assigned Series editor's Edit window: the box offered there too?
        await as(J.u.se, J.path);
        {
            const r = {};
            try {
                const {edit, items} = await openEdit(J.path, B1.id, 'Rhea Openreviewer');
                r.menu = items;
                r.box = await edit.locator('input[name="isReviewPubliclyVisible"]').count();
                r.checked = r.box ? await edit.locator('input[name="isReviewPubliclyVisible"]').isChecked() : null;
                await snap('public-b1-edit-series-editor', r);
                await edit.getByRole('link', {name: 'Cancel', exact: true}).or(edit.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
            } catch (e) { r.err = flat(e.message, 300); await snap('public-b1-series-editor-failed'); }
            fact('public.seriesEditorEdit', r);
        }
        await as(J.u.mg, J.path);
        // "Read Review" › "Mark as Complete" on both
        for (const [sub, reviewer, k] of [[B1, 'Rhea Openreviewer', 'B1'], [B2, 'Ravi Closedreviewer', 'B2']]) {
            const r = {};
            await openWf(J.path, sub.id);
            const row = revRow(reviewer);
            r.rowBefore = flat(await row.innerText().catch(() => ''), 300);
            const read = row.getByRole('button', {name: 'Read Review'});
            if (!(await read.count())) { r.noRead = true; await snap(`public-${k}-noread`); fact(`public.${k}complete`, r); continue; }
            await read.click(); await idle(page); await sleep(1500);
            const rd = await snap(`public-${k}-review-details`);
            r.details = flat(rd.text.dialog, 900);
            const mac = page.getByRole('button', {name: 'Mark as Complete'}).last();
            r.markOffered = await mac.count();
            if (r.markOffered) {
                await mac.click(); await sleep(1000);
                const conf = page.getByRole('dialog').filter({hasText: 'Mark this review as complete?'});
                r.confirm = flat(await conf.innerText().catch(() => null), 600);
                await snap(`public-${k}-mark-complete-dialog`);
                const t0 = Date.now();
                if (await conf.count()) await conf.getByRole('button', {name: 'Mark as Complete'}).click();
                await sleep(2000); await idle(page);
                r.traffic = since(net, t0).filter((x) => x.m !== 'GET');
                r.notices = (await snap(`public-${k}-marked`)).notices;
            }
            r.db = dbRev(sub.id);
            await openWf(J.path, sub.id);
            r.rowAfter = flat(await revRow(reviewer).innerText().catch(() => ''), 300);
            fact(`public.${k}complete`, r);
        }
        // accept, then publish (through production when the copyediting stage offers no "Publish")
        const decide = async (sid, button, name) => {
            await openWf(J.path, sid);
            const o = {buttons: (await wf().getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 50)).filter(Boolean)};
            const b = page.getByRole('button', {name: button, exact: true}).last();
            if (!(await b.isVisible().catch(() => false))) { o.missing = button; await snap(`${name}-nobutton`); return o; }
            await b.click();
            await page.waitForURL(/decision/, {timeout: T}).catch(() => {});
            await idle(page);
            const cont = page.getByRole('button', {name: 'Continue', exact: true});
            const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
            for (let i = 0; i < 6 && !(await rec.isVisible().catch(() => false)); i++) {
                await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await sleep(1500);
                await cont.click().catch(() => {}); await idle(page);
            }
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(800);
            const w = page.waitForResponse((x) => /decisions/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await rec.click();
            const rr = await w;
            await sleep(2500); await idle(page);
            o.status = rr ? rr.status() : null;
            await snap(name, {decide: o});
            return o;
        };
        const publish = async (sid, pub, name) => {
            await openWf(J.path, sid, `publication_${pub}_titleAbstract`);
            const o = {};
            const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
            await btn.waitFor({state: 'visible', timeout: 15000}).catch(() => {});
            if (!(await btn.isVisible().catch(() => false))) { o.noButton = await page.locator('[data-cy="workflow-controls-right"]').getByRole('button').allInnerTexts().catch(() => []); await snap(`${name}-nobutton`); return o; }
            await sleep(600);
            await btn.click();
            const vs = page.locator('select[name="versionStage"]');
            const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
            const which = await Promise.race([
                vs.waitFor({state: 'visible', timeout: 20_000}).then(() => 'stage'),
                confirm.waitFor({state: 'visible', timeout: 20_000}).then(() => 'confirm'),
            ]).catch(() => null);
            if (which === 'stage') {
                const opts = await vs.locator('option').evaluateAll((os) => os.map((x) => ({v: x.value, t: x.textContent.trim()})));
                const pick = opts.find((x) => /Version of Record/.test(x.t));
                if (pick) await vs.selectOption(pick.v);
                await page.getByRole('button', {name: 'Confirm', exact: true}).last().click();
                await confirm.waitFor({state: 'visible', timeout: T});
            }
            await idle(page);
            o.confirmText = flat(await confirm.innerText().catch(() => ''), 300);
            const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
            await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
            const r = await done;
            o.status = r ? r.status() : null;
            await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Unpublish', exact: true}).first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            o.head = flat(await page.locator('[data-cy="workflow-controls-right"]').innerText().catch(() => ''), 200);
            await snap(name, {publish: o});
            return o;
        };
        for (const [sub, k] of [[B1, 'B1'], [B2, 'B2']]) {
            const o = {accept: await decide(sub.id, 'Accept Submission', `public-${k}-accept`)};
            o.publish = await publish(sub.id, sub.pub, `public-${k}-publish`);
            if (o.publish.noButton) {
                o.production = await decide(sub.id, 'Send To Production', `public-${k}-production`);
                o.publish = await publish(sub.id, sub.pub, `public-${k}-publish2`);
            }
            o.db = db(`select publication_id, status from publications where submission_id=${sub.id}`);
            fact(`public.${k}publish`, o);
        }
        // the book pages
        const readBook = async (sid, name, tokens, {reload = false} = {}) => {
            const t0 = Date.now();
            const r = await go(cu(J.path, `/en/catalog/book/${sid}`));
            let html = r && typeof r.text === 'function' ? await r.text().catch(() => '') : '';
            if (reload) { await page.reload().catch(() => {}); await idle(page); html = await page.content().catch(() => html); }
            const s = await snap(name);
            const text = String((s.text && (s.text.main || s.text.body)) || '');
            return {status: r && typeof r.status === 'function' ? r.status() : r, url: strip(page.url()), snap: s.name,
                h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
                tokensShown: tokens.filter((t) => text.includes(t)), tokensInSource: tokens.filter((t) => html.includes(t)),
                reviewWords: [...new Set((text.match(/[^.\n]*\b(peer[- ]review\w*|reviewer\w*|review report|open review|reviews?)\b[^.\n]*/gi) || []).map((x) => flat(x, 140)))].slice(0, 10),
                sourceOpenReview: (html.match(/openReview\w*|PkpOpenReview|pkp-open-review|peerReviews?/gi) || []).slice(0, 10),
                peerReviewTraffic: since(net, t0).filter((x) => /peerReview/i.test(x.u)), bad: since(net, t0).filter((x) => x.s >= 400)};
        };
        const tokens = [tok('B1'), tok('B2')];
        const reads = {};
        await visitor();
        for (const [sub, k] of [[B1, 'B1'], [B2, 'B2']]) {
            reads[`${k}visitor`] = await readBook(sub.id, `public-${k}-book-visitor`, tokens);
            reads[`${k}visitorReload`] = await readBook(sub.id, `public-${k}-book-visitor-reload`, tokens, {reload: true});
        }
        await as(J.u.rd, J.path);
        reads.B1reader = await readBook(B1.id, 'public-B1-book-reader', tokens);
        await as(J.u.mg, J.path);
        reads.B1manager = await readBook(B1.id, 'public-B1-book-manager', tokens);
        await visitor();
        await go(cu(J.path, '/en/catalog'));
        const cat = await snap('public-catalog-visitor');
        reads.catalogTokens = tokens.filter((t) => String(cat.text.main || cat.text.body || '').includes(t));
        reads.db = {b1: dbRev(B1.id), b2: dbRev(B2.id)};
        fact('public.reads', reads);
        // the other end: a press whose default makes every new review public; its book seeded published
        const K = await mkCtx('q', {review: {defaultReviewMode: 'open', defaultReviewPublicVisibility: true}}, [['rv1', ['externalReviewer'], 'Rhea', 'Openreviewer']]);
        const tk = `I05TOKENB3${K.path}`;
        const B3 = await mkSub(K, 'b3', {title: `I05 Default Public Book ${K.path}`, decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: K.u.rv1, status: 'completed', comments: `Open review text ${tk} for the public.`}]}], published: true});
        const o3 = {seed: B3};
        if (!B3.error) {
            o3.db = db(`select review_method, is_review_publicly_visible, considered from review_assignments where submission_id=${B3.id}`);
            const t0 = Date.now();
            const r = await go(cu(K.path, `/en/catalog/book/${B3.id}`));
            const html = r && typeof r.text === 'function' ? await r.text().catch(() => '') : '';
            const s = await snap('public-B3-book-visitor');
            o3.page = {status: r && typeof r.status === 'function' ? r.status() : r, tokenShown: String(s.text.main || s.text.body || '').includes(tk), tokenInSource: html.includes(tk),
                peerReviewTraffic: since(net, t0).filter((x) => /peerReview/i.test(x.u))};
        }
        fact('public.B3', o3);
    });

    // ================================================================ R040 (OJS; OMP/OPS controls): the recommendations' tick boxes
    await sect('recs', async () => {
        const J = await mkCtx('r');
        const users = [[J.u.mg, 'manager'], ['admin', 'admin']];
        for (const [u, level] of users) {
            await as(u, J.path);
            const o = {};
            await go(cu(J.path, '/management/settings/workflow'));
            o.topTabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
            if (isOPS || !(await page.locator('#review-button').count())) {
                await snap(`recs-workflow-${level}`);
                fact(`recs.${level}`, o);
                continue;
            }
            await page.locator('#review-button').first().click(); await idle(page); await sleep(600);
            o.reviewSideTabs = (await page.getByRole('tabpanel').filter({visible: true}).first().getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
            const recBtn = page.locator('#reviewerRecommendations-button');
            o.recTab = await recBtn.count();
            if (!o.recTab) { await snap(`recs-review-tab-${level}`); fact(`recs.${level}`, o); continue; }
            await recBtn.first().click();
            const root = page.locator('[data-cy="reviewer-recommendation-manager"]');
            await root.locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(500);
            await snap(`recs-table-${level}`);
            o.aria = await root.ariaSnapshot().catch((e) => `ERR ${flat(e.message, 200)}`);
            await loc(page, 'Reviewer Recommendations: a row\'s "Activate" tick box', root.locator('tbody tr').first().locator('input[type=checkbox]'));
            await loc(page, 'Reviewer Recommendations: tick boxes by role (any name)', root.getByRole('checkbox'));
            // the accessibility tree Chromium hands a screen reader: each tick box's computed name and its row
            const cdp = await page.context().newCDPSession(page);
            await cdp.send('Accessibility.enable');
            await cdp.send('DOM.enable');
            const {nodes} = await cdp.send('Accessibility.getFullAXTree');
            o.boxes = [];
            for (const n of nodes.filter((x) => x.role && x.role.value === 'checkbox' && !x.ignored)) {
                let dom = null;
                if (n.backendDOMNodeId) {
                    const {object} = await cdp.send('DOM.resolveNode', {backendNodeId: n.backendDOMNodeId}).catch(() => ({object: null}));
                    if (object) {
                        const r = await cdp.send('Runtime.callFunctionOn', {objectId: object.objectId, returnByValue: true, functionDeclaration: `function () { const e = this; const tr = e.closest('tr'); return {inRecs: !!e.closest('[data-cy="reviewer-recommendation-manager"]'), row: tr ? (tr.querySelector('th, td') || {}).innerText.trim() : null, name: e.name, checked: e.checked, id: e.id || null, ariaLabel: e.getAttribute('aria-label'), labelText: e.closest('label') ? e.closest('label').innerText : null, labelFor: !!(e.id && document.querySelector('label[for="' + e.id + '"]')), title: e.getAttribute('title')}; }`}).catch(() => null);
                        dom = r && r.result ? r.result.value : null;
                    }
                }
                if (!dom || !dom.inRecs) continue;
                o.boxes.push({...dom, ax: {name: n.name ? n.name.value : null, nameSources: ((n.name && n.name.sources) || []).map((x) => ({type: x.type, attribute: x.attribute, value: x.value && x.value.value})).filter((x) => x.value != null), focusable: (n.properties || []).some((p) => p.name === 'focusable' && p.value.value)}});
            }
            o.menus = await root.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || b.innerText.trim())));
            o.headers = await root.locator('thead th').allInnerTexts();
            // keyboard: Tab to the first tick box and press Space
            const first = root.locator('tbody tr').first().locator('input[type=checkbox]');
            await first.focus();
            o.focusedName = await page.evaluate(() => { const e = document.activeElement; return {tag: e.tagName, type: e.type}; });
            const t0 = Date.now();
            await page.keyboard.press('Space');
            await sleep(1200);
            const dlg = page.getByRole('dialog').filter({hasText: /Are you sure you want to (de)?activate/}).last();
            o.space = {dialog: flat(await dlg.innerText().catch(() => null), 300), dialogName: await dlg.getAttribute('aria-labelledby').catch(() => null)};
            await snap(`recs-space-dialog-${level}`, o.space);
            if (await dlg.count()) await dlg.getByRole('button', {name: 'No', exact: true}).click().catch(() => {});
            await sleep(800);
            o.space.after = {checked: await first.isChecked().catch(() => null), traffic: since(net, t0).filter((x) => x.m !== 'GET')};
            // sweep (manager only): "Add Recommendation" left with text typed and unsaved
            if (level === 'manager') {
                await root.getByRole('button', {name: 'Add Recommendation', exact: true}).click();
                const add = page.getByRole('dialog').filter({hasText: 'Add Recommendation'}).last();
                await add.waitFor({timeout: T}).catch(() => {});
                await idle(page); await sleep(800);
                const box = add.getByRole('textbox').first();
                await box.fill(`Unsaved ${J.path}`).catch(() => {});
                await snap('recs-add-window-typed');
                const t1 = Date.now();
                await add.getByRole('button', {name: /^Close/}).first().click().catch(() => {});
                await sleep(1500);
                const after = await snap('recs-add-window-closed');
                o.addLeave = {dialogs: since(jsDialogs, t1), notices: after.notices, stillOpen: await add.isVisible().catch(() => false), rows: await root.locator('tbody tr th, tbody tr td:first-child').allInnerTexts().catch(() => [])};
                await page.reload(); await idle(page);
                await page.locator('#review-button').first().click().catch(() => {}); await sleep(400);
                await page.locator('#reviewerRecommendations-button').first().click().catch(() => {});
                await root.locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
                await idle(page);
                await snap('recs-after-reload');
                o.addLeave.rowsAfterReload = await root.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => (tr.querySelector('th, td') || {}).innerText.trim()));
            }
            fact(`recs.${level}`, o);
        }
        await visitor();
    });

    fact('run.crashes', {server: net.filter((x) => x.s >= 500).map(({at, ...x}) => x), script: pageErrors.map(({at, ...x}) => x), consoleErrors: consoleErrs.map(({at, ...x}) => x).slice(0, 30)});
    await close();
});
