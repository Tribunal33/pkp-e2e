// U27 claim check, housekeeping chunk I07 (hk07, 2026-10-07): incidentals rows 62 and 63
// (.reports/hk07/chunks/U27.md).
//   due       {OJS OMP} Row 62: the editor's "Reviewers" row on the due-date axis (U27 Rule 2's two "Overdue"
//             rows, Rule 3 / Rule 13 "Send Reminder", footnote b's overdue math, scenario 7's rows). One scratch
//             journal (press) per run, one reviewer, seven requests whose dates the Journal Manager (Press
//             manager) sets in the row's "Edit" window, both ends of each axis:
//               A0 accepted, review due yesterday   A1 accepted, review due today   A2 accepted, review due tomorrow
//               U0 unanswered, response due yesterday (review in two weeks)
//               U1 unanswered, response due today (review in two weeks)
//               U2 unanswered, response and review both due today
//               U3 unanswered, response and review both due tomorrow
//             Each row read (status, colour class, second line, "Actions" buttons, "More Actions" entries) as the
//             manager, again after a reload, and as the assigned Section editor (Series editor); "Send Reminder"
//             pressed and sent on A1 and U2 (window read, notice, "History").
//   complete  {OJS OMP} Row 63: "Mark as Complete" in "Review Details" (Rule 14a): a review whose "Publicly Show
//             Reviewer Comments" box is ticked in "Edit" (B1, manager; B3, assigned section editor) and one left
//             private (B2, manager). The dialog read, "Cancel" pressed, then confirmed; the window and the row read
//             after, and after a reload. Sweep: the Edit window left once with the box changed and unsaved.
//   ops       {OPS} control: a scratch preprint's workflow has no "Reviewers" table.
// Run twice, each under its own PROBE_RUN:
//   PROBE_RUN=r1 PROBE_FEATURE=U27 PROBE_AGENT=ccI07 node bin/probe.js all shared/playwright/checks/U27/I07/i07.js
//   PROBE_RUN=r2 …          (PHASES=due,complete,ops narrows)
// No assertions: the script records, the reader judges. Database reads (SELECT) are evidence only.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag, sql} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'r0';
const PHASES = (process.env.PHASES || 'due,complete,ops').split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const T = 30_000;
const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php\//, '');
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOff = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };

function fact(key, value) {
    record('i07-facts', {[key]: value}, {merge: true});
    console.log(`[i07 ${RUN} +${Math.round((Date.now() - T0) / 1000)}s] [${key}]`, JSON.stringify(value).slice(0, 1500));
}

forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
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
        const n = `i07-${String(++snapN).padStart(3, '0')}-${name}`;
        record(n, s);
        await shot(page, n).catch(() => {});
        return {name: `${n}-${RUN}-${app.name}`, notices: (s.notices || []).map((x) => flat(typeof x === 'string' ? x : (x.text || JSON.stringify(x)), 200)), dialog: s.text && s.text.dialog};
    }
    async function sect(name, fn) {
        if (!on(name)) return;
        const t0 = Date.now();
        console.log(`[i07 ${RUN} ${app.name}] == ${name}`);
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

    async function mkCtx(key, extra = {}, roles = []) {
        const t = tag(`u27i07${key}`).slice(0, 28) + RUN;
        const base = [['mg', ['manager'], 'Mona', 'Manager'], ['au', ['author'], 'Ada', 'Author'], ...roles];
        const {context: cx = {}, ...rest} = extra;
        const res = await app.api.createContext({tag: t, context: {name: `U27 I07 ${key} ${t}`, contactName: 'Pat Principal', contactEmail: `${t}pc@mail.test`, country: 'CA', ...cx},
            users: base.map(([u, r, g, f]) => ({username: `${t}${u}`, roles: r, givenName: g, familyName: f})), ...rest});
        const C = {path: res.path || t, id: res.contextId, u: Object.fromEntries(base.map(([u]) => [u, `${t}${u}`])), subs: {}};
        fact(`${key}.seed`, {path: C.path, id: C.id});
        return C;
    }
    async function mkSub(C, key, spec) {
        const title = spec.title || `I07 ${key} ${C.path}`;
        try {
            const {submitter, ...r} = spec;
            const res = await app.api.createSubmission({tag: `${C.path}${key}`.slice(0, 32), context: C.path, submitter: submitter || C.u.au, title, ...r});
            C.subs[key] = {id: res.submissionId, pub: res.publicationId, title};
        } catch (e) {
            C.subs[key] = {error: flat(e.message, 500), title};
        }
        return C.subs[key];
    }

    // ---------------------------------------------------------------- the workflow and its Reviewers panel
    async function openWf(ctx, sid) {
        await go(cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}`));
        await page.getByRole('heading', {name: /^Workflow:/}).waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await sleep(800);
    }
    const revTable = () => page.getByRole('table', {name: 'Reviewers', exact: true});
    const revRow = (name) => revTable().getByRole('row').filter({hasText: name}).first();
    async function rowRead(name) {
        const r = revRow(name);
        await r.waitFor({timeout: 15000}).catch(() => {});
        if (!(await r.count())) return {absent: true};
        return r.evaluate((el) => {
            const cells = [...el.querySelectorAll('th,td')];
            const title = el.querySelector('span.text-base-bold');
            const statusCell = title ? title.closest('td,th') : null;
            return {cells: cells.map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
                status: title ? title.innerText.trim() : null, statusClass: title ? title.className : null,
                statusCellText: statusCell ? statusCell.innerText.replace(/\s+/g, ' ').trim() : null,
                buttons: [...el.querySelectorAll('button')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean)};
        });
    }
    async function menuItems(name) {
        const r = revRow(name);
        await r.getByRole('button', {name: 'More Actions'}).click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        await sleep(300);
        const items = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
        await r.getByRole('button', {name: 'More Actions'}).click().catch(() => {});
        await page.getByRole('menu').waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
        await sleep(300);
        return items;
    }
    async function openEdit(ctx, sid, reviewer) {
        await openWf(ctx, sid);
        await revRow(reviewer).waitFor({timeout: T});
        await revRow(reviewer).getByRole('button', {name: 'More Actions'}).click();
        await sleep(500);
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const edit = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')});
        await edit.locator('form#editReviewForm input.datepicker').first().waitFor({timeout: T});
        await idle(page); await sleep(600);
        return edit;
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
        await idle(page); await sleep(700);
        return {status: r ? r.status() : null, refused: !!(body && /"status":\s*false/.test(body)), closed, errors: closed ? [] : await edit.locator('.error, .pkp_form_error, label.error').allInnerTexts().catch(() => []), traffic: since(net, t0).filter((x) => x.m !== 'GET')};
    }
    const legacy = (formId) => page.getByRole('dialog').filter({has: page.locator(`form#${formId}`)}).last();

    // ================================================================ Row 62 (OJS, OMP): the due day on the editor's row
    await sect('due', async () => {
        if (isOPS) return;
        const RV = 'Rhea Duetest';
        const J = await mkCtx('d', {}, [['rv', ['externalReviewer'], 'Rhea', 'Duetest'], ['se', ['sectionEditor'], 'Sam', 'Sectioneditor']]);
        const today = dayOff(0), yesterday = dayOff(-1), tomorrow = dayOff(1), later = dayOff(14);
        const plan = {
            A0: {status: 'accepted', response: dayOff(-10), review: yesterday, label: 'accepted, review due yesterday'},
            A1: {status: 'accepted', response: dayOff(-10), review: today, label: 'accepted, review due today'},
            A2: {status: 'accepted', response: dayOff(-10), review: tomorrow, label: 'accepted, review due tomorrow'},
            U0: {status: 'invited', response: yesterday, review: later, label: 'unanswered, response due yesterday'},
            U1: {status: 'invited', response: today, review: later, label: 'unanswered, response due today'},
            U2: {status: 'invited', response: today, review: today, label: 'unanswered, response and review both due today'},
            U3: {status: 'invited', response: tomorrow, review: tomorrow, label: 'unanswered, response and review both due tomorrow'},
        };
        for (const [k, p] of Object.entries(plan)) {
            await mkSub(J, k, {title: `I07 ${k} due ${J.path}`, decisions: ['sendExternalReview'], participants: [{username: J.u.se, role: 'sectionEditor'}],
                reviewRounds: [{reviewers: [{username: J.u.rv, status: p.status}]}]});
        }
        fact('due.subs', {today: ymd(today), serverNow: db('select now()'), phpTz: db("select setting_value from site_settings where setting_name like '%imeZone%'"), subs: J.subs});
        if (Object.values(J.subs).some((s) => s.error)) return;
        await as(J.u.mg, J.path);
        const edits = {};
        for (const [k, p] of Object.entries(plan)) {
            const s = J.subs[k];
            const edit = await openEdit(J.path, s.id, RV);
            if (p.response) await pickDate(edit, 'responseDueDate', p.response);
            if (p.review) await pickDate(edit, 'reviewDueDate', p.review);
            const values = await edit.locator('input.datepicker').evaluateAll((els) => els.map((e) => ({id: e.id.replace(/-[^-]*$/, ''), value: e.value})));
            const saved = await saveEdit(edit);
            if (!saved.closed) { await snap(`due-edit-${k}-refused`); await edit.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {}); await sleep(800); }
            edits[k] = {label: p.label, values, saved, db: db(`select date_response_due, date_due, date_confirmed is not null as accepted from review_assignments where submission_id=${s.id}`)};
        }
        fact('due.edits', edits);
        // the manager's reads: landed, then after a reload
        const reads = {};
        for (const k of Object.keys(plan)) {
            const s = J.subs[k];
            await openWf(J.path, s.id);
            const r = {first: await rowRead(RV)};
            r.menu = await menuItems(RV);
            r.snap = (await snap(`due-mgr-row-${k}`, {k, label: plan[k].label})).name;
            await page.reload(); await idle(page); await sleep(800);
            await revRow(RV).waitFor({timeout: T}).catch(() => {});
            r.reload = await rowRead(RV);
            r.reloadSnap = (await snap(`due-mgr-row-${k}-reload`)).name;
            reads[k] = r;
        }
        fact('due.mgrReads', reads);
        await openWf(J.path, J.subs.A1.id);
        await loc(page, 'Reviewers row: status title (span.text-base-bold) on the due-today accepted row', revRow(RV).locator('span.text-base-bold'));
        await loc(page, 'Reviewers row: "Send Reminder" button (due-today accepted row)', revRow(RV).getByRole('button', {name: 'Send Reminder', exact: true}));
        // "Send Reminder" on A1 and U2: the window, then sent
        const rem = {};
        for (const k of ['A1', 'U2']) {
            const s = J.subs[k];
            const o = {};
            await openWf(J.path, s.id);
            const b = revRow(RV).getByRole('button', {name: 'Send Reminder', exact: true});
            o.offered = await b.count();
            if (!o.offered) { rem[k] = o; continue; }
            await b.click();
            const w = legacy('sendReminderForm');
            await w.getByText('Review Schedule').first().waitFor({timeout: T}).catch(() => {});
            await page.waitForFunction(() => { const m = window.tinymce || window.tinyMCE; const ta = document.querySelector('#sendReminderForm textarea[name="message"], #sendReminderForm textarea'); return !ta || (m && m.get(ta.id) && m.get(ta.id).initialized); }, null, {timeout: 20000}).catch(() => {});
            await idle(page); await sleep(600);
            const ws = await snap(`due-reminder-window-${k}`);
            o.window = {snap: ws.name, formFound: await w.count(), text: flat(ws.dialog, 900),
                schedule: flat(await w.locator('form').evaluate((f) => { const h = [...f.querySelectorAll('*')].find((x) => x.children.length === 0 && x.textContent.trim() === 'Review Schedule'); const box = h ? h.closest('fieldset, .section, div') : null; return box ? box.innerText : null; }).catch(() => null), 400),
                template: await w.locator('select').first().evaluate((s) => (s.selectedOptions[0] || {}).text).catch(() => null),
                buttons: (await w.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40)).filter(Boolean)};
            const t0 = Date.now();
            await w.locator('form').getByRole('button', {name: 'Send Reminder', exact: true}).click();
            await w.locator('form#sendReminderForm').waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(900); await idle(page);
            const after = await snap(`due-reminder-sent-${k}`);
            o.sent = {notices: after.notices, stillOpen: await legacy('sendReminderForm').locator('form').isVisible().catch(() => false), traffic: since(net, t0).filter((x) => x.m !== 'GET')};
            o.rowAfter = await rowRead(RV);
            // History
            await revRow(RV).getByRole('button', {name: 'More Actions'}).click();
            await page.getByRole('menuitem', {name: 'History', exact: true}).click();
            const hb = page.locator('.pkp_review_history').last();
            await hb.waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(500);
            o.history = (await hb.locator(':scope > div').allInnerTexts().catch(() => [])).map((x) => flat(x, 120));
            o.historySnap = (await snap(`due-history-${k}`)).name;
            const hw = page.getByRole('dialog').filter({has: page.locator('.pkp_review_history')}).last();
            await hw.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await sleep(900);
            o.emailLog = db(`select event_type, count(*) from email_log where assoc_id=${s.id} group by event_type order by 1`);
            rem[k] = o;
        }
        fact('due.reminders', rem);
        // the assigned Section editor (sub-editor level)
        await as(J.u.se, J.path);
        const se = {};
        for (const k of ['A0', 'A1', 'A2', 'U1', 'U2', 'U3']) {
            await openWf(J.path, J.subs[k].id);
            se[k] = await rowRead(RV);
            if (k === 'A1' || k === 'U2' || k === 'U3') se[k].snap = (await snap(`due-se-row-${k}`)).name;
        }
        fact('due.seReads', se);
        fact('due.db', db(`select ra.submission_id, ra.date_response_due, ra.date_due, ra.date_confirmed is not null, ra.date_reminded from review_assignments ra join submissions s on s.submission_id=ra.submission_id where s.context_id=${J.id} order by 1`));
    });

    // ================================================================ Row 63 (OJS, OMP): "Mark as Complete" on a public review
    await sect('complete', async () => {
        if (isOPS) return;
        const J = await mkCtx('c', {review: {defaultReviewPublicVisibility: false}},
            [['rv1', ['externalReviewer'], 'Rhea', 'Openone'], ['rv2', ['externalReviewer'], 'Ravi', 'Closedtwo'], ['rv3', ['externalReviewer'], 'Rosa', 'Openthree'], ['se', ['sectionEditor'], 'Sam', 'Sectioneditor']]);
        const P = {B1: ['rv1', 'Rhea Openone', true, 'mg'], B2: ['rv2', 'Ravi Closedtwo', false, 'mg'], B3: ['rv3', 'Rosa Openthree', true, 'se']};
        for (const [k, [u]] of Object.entries(P)) {
            await mkSub(J, k, {title: `I07 ${k} review ${J.path}`, decisions: ['sendExternalReview'], participants: [{username: J.u.se, role: 'sectionEditor'}],
                reviewRounds: [{reviewers: [{username: J.u[u], status: 'completed', comments: `I07 ${k} review comments.`}]}]});
        }
        const dbRev = (sid) => db(`select review_id, review_method, is_review_publicly_visible, considered, date_completed is not null from review_assignments where submission_id=${sid}`);
        fact('complete.seed', Object.fromEntries(Object.keys(P).map((k) => [k, {...J.subs[k], db: J.subs[k].id ? dbRev(J.subs[k].id) : null}])));
        if (Object.values(J.subs).some((s) => s.error)) return;
        await as(J.u.mg, J.path);
        // B1: the Edit window left once with the box ticked and unsaved, then ticked and saved; B3 ticked and saved
        const ed = {};
        {
            const edit = await openEdit(J.path, J.subs.B1.id, P.B1[1]);
            const box = edit.locator('input[name="isReviewPubliclyVisible"]');
            ed.boxCount = await box.count();
            ed.was = ed.boxCount ? await box.isChecked() : null;
            ed.label = flat(await edit.locator('form#editReviewForm').evaluate((f) => { const b = f.querySelector('input[name="isReviewPubliclyVisible"]'); if (!b) return null; const l = b.closest('label'); return l ? l.innerText : null; }).catch(() => null), 200);
            ed.snap = (await snap('complete-B1-edit-window', {was: ed.was})).name;
            await loc(page, 'Reviewer row "Edit": "Publicly Show Reviewer Comments" box', box);
            if (ed.boxCount) {
                await box.check(); await box.blur().catch(() => {}); await sleep(400);
                const t0 = Date.now();
                await edit.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                await sleep(2000);
                ed.leave = {dialogs: since(jsDialogs, t0), stillOpenAfterDismiss: await edit.locator('form#editReviewForm').isVisible().catch(() => false)};
                ed.leave.snap = (await snap('complete-B1-edit-close-dismissed')).name;
                if (ed.leave.stillOpenAfterDismiss) {
                    dialogAnswer = 'accept';
                    const t1 = Date.now();
                    await edit.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                    await sleep(2000);
                    dialogAnswer = null;
                    ed.leave.accepted = {dialogs: since(jsDialogs, t1), stillOpen: await edit.locator('form#editReviewForm').isVisible().catch(() => false)};
                }
                ed.leave.db = dbRev(J.subs.B1.id);
                const again = await openEdit(J.path, J.subs.B1.id, P.B1[1]);
                ed.leave.reopened = await again.locator('input[name="isReviewPubliclyVisible"]').isChecked().catch(() => null);
                await again.locator('input[name="isReviewPubliclyVisible"]').check();
                ed.save = await saveEdit(again);
                ed.save.db = dbRev(J.subs.B1.id);
            }
            const e3 = await openEdit(J.path, J.subs.B3.id, P.B3[1]);
            await e3.locator('input[name="isReviewPubliclyVisible"]').check();
            ed.saveB3 = await saveEdit(e3);
            ed.saveB3.db = dbRev(J.subs.B3.id);
        }
        fact('complete.edit', ed);
        const rd = () => page.getByRole('dialog', {name: /^Review Details:/}).last();
        async function settleRD() {
            await rd().waitFor({timeout: T});
            await page.waitForFunction(() => {
                const dd = [...document.querySelectorAll('[role=dialog]')].filter((x) => /^Review Details:/.test(x.getAttribute('aria-label') || '')).pop()
                    || [...document.querySelectorAll('[role=dialog]')].filter((x) => /Review Details:/.test(x.innerText)).pop();
                if (!dd) return false;
                const b = [...dd.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Modify Review');
                return b && !b.disabled;
            }, null, {timeout: T}).catch(() => {});
            await idle(page); await sleep(500);
        }
        const rdButtons = async () => rd().evaluate((el) => [...el.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => ({t: (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), disabled: b.disabled})).filter((b) => /Mark as Complete|Modify Review|Cancel/.test(b.t))).catch(() => null);
        const out = {};
        for (const k of ['B1', 'B2', 'B3']) {
            const [, name, pub, role] = P[k];
            await as(J.u[role], J.path);
            const o = {pub, role};
            await openWf(J.path, J.subs[k].id);
            o.rowBefore = await rowRead(name);
            const read = revRow(name).getByRole('button', {name: 'Read Review', exact: true});
            if (!(await read.count())) { o.noRead = true; o.snap = (await snap(`complete-${k}-noread`)).name; out[k] = o; continue; }
            await read.click();
            await settleRD();
            o.window = {snap: (await snap(`complete-${k}-review-details`)).name, buttons: await rdButtons()};
            const mac = rd().getByRole('button', {name: 'Mark as Complete', exact: true});
            await mac.click();
            const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Mark this review as complete?'}).last();
            await dlg.waitFor({timeout: T}).catch(() => {});
            await sleep(400);
            o.dialog = {found: await dlg.count(), text: await dlg.innerText().catch(() => null), buttons: (await dlg.getByRole('button').allInnerTexts().catch(() => [])).map((x) => x.trim())};
            o.dialog.snap = (await snap(`complete-${k}-mark-dialog`)).name;
            if (k === 'B1') await loc(page, '"Mark this review as complete?" dialog ([data-cy="dialog"] filtered by its title)', dlg);
            const tC = Date.now();
            await dlg.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
            await sleep(1200);
            o.cancel = {traffic: since(net, tC).filter((x) => x.m !== 'GET'), dialogGone: !(await dlg.isVisible().catch(() => false)), buttons: await rdButtons(), snap: (await snap(`complete-${k}-after-cancel`)).name};
            o.cancel.db = dbRev(J.subs[k].id);
            await mac.click();
            await dlg.waitFor({timeout: T}).catch(() => {});
            await sleep(400);
            const tM = Date.now();
            await dlg.getByRole('button', {name: 'Mark as Complete', exact: true}).click().catch(() => {});
            await page.getByText('The review has been marked as complete.').first().waitFor({timeout: 15000}).catch(() => {});
            await sleep(800); await idle(page);
            const am = await snap(`complete-${k}-marked`);
            o.marked = {notices: am.notices, traffic: since(net, tM).filter((x) => x.m !== 'GET'), buttons: await rdButtons(), snap: am.name, db: dbRev(J.subs[k].id)};
            await rd().getByRole('button', {name: 'Cancel', exact: true}).last().click().catch(() => {});
            await rd().waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
            await sleep(1200); await idle(page);
            o.rowAfter = await rowRead(name);
            o.rowAfterSnap = (await snap(`complete-${k}-row-after`)).name;
            await page.reload(); await idle(page); await sleep(800);
            o.rowReload = await rowRead(name);
            o.rowReloadSnap = (await snap(`complete-${k}-row-reload`)).name;
            out[k] = o;
        }
        fact('complete.marks', out);
    });

    // ================================================================ OPS control: no Reviewers panel
    await sect('ops', async () => {
        if (!isOPS) return;
        const J = await mkCtx('o');
        const s = await mkSub(J, 'O1', {title: `I07 O1 preprint ${J.path}`});
        fact('ops.seed', s);
        if (s.error) return;
        await as(J.u.mg, J.path);
        await openWf(J.path, s.id);
        const sn = await snap('ops-workflow');
        fact('ops.read', {snap: sn.name, reviewersTable: await revTable().count(), sendReminder: await page.getByRole('button', {name: 'Send Reminder'}).count(),
            addReviewer: await page.getByRole('button', {name: 'Add Reviewer'}).count(), tabs: (await page.getByRole('dialog').first().getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40)).filter(Boolean).slice(0, 30)});
    });

    await close();
});
