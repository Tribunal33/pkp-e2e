// U27 claim check I05 (housekeeping 2026-10-05): the four incidentals rows of
// .reports/hk05/drive/U27/rows.md, one phase each. OJS and OMP (OPS has no review
// stage: it gets the read-only "email" control only). Every phase seeds its own
// scratch context (nothing is changed on publicknowledge; OPS reads it only).
//
//   dates  (R123, register A8; Fields "Response/Review Due Date" and the Edit
//          window, Rule 9, scenarios 5 and 6, note f): the review due date set
//          before the response due date in "Add Reviewer", a row's "Edit" and a
//          declined row's "Resend Review Request", at both permission levels
//          (mg = the manager level, se = the sub-editor level, a participant);
//          what the screen says the instant the save answers (page notices
//          polled every 200 ms, a screenshot while one shows), the window after,
//          the row on the page and after a reload. Other end: equal dates (the
//          rule says "equal or greater"), which is also the control.
//   resent (R121, Rule 2's status table, A2): "Request Resent" rows whose
//          response due date has passed (picked in the Resend window, or moved
//          by "Edit" after the resend), the default future date as the other
//          end, both dates past, and an unanswered first request moved past its
//          response date as the control ("Overdue"). Rows read on the page and
//          after a reload.
//   status (R121's neighbours): "Request Accepted", an accepted request moved past its review
//          date by "Edit" ("Overdue"), and the "Request Declined" hover.
//   email  (R126): Settings › Workflow › Emails, "Reviewer Unassign" and the
//          "Review Cancel" control, read in English and French on a fresh
//          context with French as a form language; the stored default rows;
//          the "Unassign Reviewer" window's message with the interface in French
//          (then sent, scratch data) and in English. OPS: is the email listed.
//   crash  (R023): CPU x6 (CDP), the U31 S2 window sequence repeated
//          (suggestion row › "Add Reviewer": "Cancel"; again, type in the
//          message, header "Close"; again, "Add Reviewer"), and the Reviewers
//          panel's own "Add Reviewer" in the same shape; every uncaught page
//          error kept with its stack. SUG / PAN set the iteration counts.
//
// Run twice, each under its own PROBE_RUN (r1, r2), main and stable-3_5_0 (2026-10-05 runs):
//   PROBE_RUN=r1 PHASES=dates,resent,email PROBE_FEATURE=U27 PROBE_AGENT=ccI05 node bin/probe.js all shared/playwright/checks/U27/I05/i05.js
//   PROBE_RUN=r1 PHASES=crash SUG=25 PAN=12 … node bin/probe.js ojs …   (and omp; crash is main only)
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r1-35 PHASES=dates,resent,email … node bin/probe.js all …
// No assertions: every screen is recorded with screen()/shot(); i05-facts-<run>-<app>.json
// collects the structured reads; the console carries [i05 …] lines.
const {forEachApp, launch, signIn, signOut, switchLanguage, screen, shot, record, loc, idle, tag, sql} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'r1';
const PHASES = (process.env.PHASES || 'dates,resent,status,email,crash').split(',');
const SUG = Number(process.env.SUG || 6);
const PAN = Number(process.env.PAN || 4);
const T = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const pad = (n) => String(n).padStart(2, '0');
const day = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ROOT = '../../../../../';

forEachApp(async (app) => {
    const A = app.name;
    const LINE = process.env.PKP_E2E_LINE || 'main';
    const on = (p) => PHASES.includes(p);
    const T0 = Date.now();
    const log = (...a) => console.log(`[i05 ${RUN} ${LINE} ${A} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const fact = (k, v) => { record(`i05-facts-${RUN}`, {[k]: v}, {merge: true}); log(`[${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const db = (q) => { try { return sql(app, q).split('\n').filter(Boolean); } catch (e) { return [`ERROR ${flat(e.message, 200)}`]; } };
    const R = () => require(`${ROOT}apps/omp/playwright/pages/ReviewerAssignmentPages.js`);

    // ---- browser, shared by every phase of this app --------------------------
    const {page, context} = await launch(app);
    const pageErrors = [], net = [], jsDialogs = [];
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), message: flat(e.message, 300), stack: String(e.stack || '').slice(0, 3000), url: page.url().replace(/^https?:\/\/[^/]+/, '')}));
    page.on('console', (m) => { if (m.type() === 'error' && /serialize/.test(m.text())) pageErrors.push({at: Date.now(), console: true, message: flat(m.text(), 600)}); });
    page.on('response', (r) => { if (r.status() >= 500 || (r.request().method() !== 'GET' && /\$\$\$call\$\$\$|\/api\//.test(r.url()))) net.push({at: Date.now(), m: r.request().method(), s: r.status(), u: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 200)}); });
    page.on('dialog', async (d) => { jsDialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300)}); await d.accept().catch(() => {}); });
    const since = (arr, t0) => arr.filter((x) => x.at >= t0).map(({at, ...x}) => ({ms: at - t0, ...x}));
    const crashesSince = (t0) => ({server: since(net, t0).filter((x) => x.s >= 500), script: since(pageErrors, t0)});
    let snapN = 0;
    async function snap(label, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const name = `i05-${String(++snapN).padStart(3, '0')}-${label}`;
        record(name, s);
        await shot(page, name).catch(() => {});
        return `${name}-${RUN}-${A}`;
    }
    async function quickShot(label) {
        const name = `i05-${String(++snapN).padStart(3, '0')}-${label}`;
        await shot(page, name).catch(() => {});
        return `${name}-${RUN}-${A}`;
    }

    // ---- shared workflow helpers ---------------------------------------------
    const wfUrl = (ctx, sub) => {
        const rr = sub.reviewRounds[0];
        return app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${sub.submissionId}&workflowMenuKey=workflow_${rr.stageId}_${rr.id}`);
    };
    async function openWf(ctx, sub) {
        await page.goto('about:blank');
        await page.goto(wfUrl(ctx, sub));
        const modal = page.locator('[data-cy="active-modal"]').first();
        await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: T});
        await idle(page);
        return modal;
    }
    const rowOf = (modal, name) => R().reviewerRow(modal, name).first();
    async function readRow(modal, name) {
        const row = rowOf(modal, name);
        if (!(await row.count())) return {absent: true};
        return row.evaluate((tr) => {
            const cells = [...tr.querySelectorAll('td, th')];
            const st = cells[1];
            const leaves = st ? [...st.querySelectorAll('span, div')].filter((s) => !s.querySelector('span, div')).map((s) => s.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
            const color = st ? [...st.querySelectorAll('*')].map((e) => e.className && String(e.className)).filter((c) => /negative|error|red|warning|attention/i.test(c || '')) : [];
            return {
                cells: cells.map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
                status: leaves,
                statusClasses: [...new Set(color)].slice(0, 5),
                statusTitles: st ? [...st.querySelectorAll('[title]')].map((e) => e.getAttribute('title')) : [], // a native hover tooltip
                buttons: [...tr.querySelectorAll('button')].map((b) => (b.innerText.trim() || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ')),
            };
        });
    }
    async function menuOf(modal, name) {
        // the row's last button is "More Actions" whatever the interface language
        await rowOf(modal, name).getByRole('button').last().click();
        const menu = page.getByRole('menu').last();
        await R().menuEntries(menu).first().waitFor({timeout: 10000}).catch(() => {});
        const entries = (await R().menuEntries(menu).allInnerTexts()).map((t) => flat(t, 80));
        return {menu, entries};
    }
    async function closeMenu(modal, name) {
        await rowOf(modal, name).getByRole('button').last().click().catch(() => {});
        await sleep(400);
    }
    // Page notices polled from the moment of the press: they expire after five
    // seconds, so a settled read alone cannot rest a "no message" claim.
    async function pollNotices(ms, label) {
        const seen = []; const t0 = Date.now(); let during = null;
        while (Date.now() - t0 < ms) {
            const texts = await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => []);
            for (const t of texts.map((x) => flat(x, 300)).filter(Boolean)) {
                if (!seen.find((s) => s.text === t)) {
                    seen.push({text: t, atMs: Date.now() - t0});
                    if (!during) during = await quickShot(`${label}-during-notice`);
                }
            }
            await sleep(200);
        }
        return {notices: seen, duringShot: during};
    }
    // Press a legacy window's submit, read the answer the browser got, the
    // notices as they come, then the window's own state.
    async function pressSubmit(win, buttonName, urlRe, formSel, label) {
        const t0 = Date.now();
        const respP = page.waitForResponse((r) => urlRe.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await win.getByRole('button', {name: buttonName, exact: true}).last().click();
        const r = await respP;
        let body = null;
        if (r) { try { body = await r.json(); } catch { body = null; } }
        const n = await pollNotices(6000, label);
        const out = {
            http: r ? r.status() : null,
            url: r ? r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*/, '').slice(0, 160) : null,
            answer: body ? {status: body.status, contentLength: body.content ? String(body.content).length : 0, content: typeof body.content === 'string' ? flat(body.content.replace(/<[^>]+>/g, ' '), 300) : null, event: body.event ? flat(JSON.stringify(body.event), 200) : null} : null,
            ...n,
            windowOpen: await page.locator(formSel).first().isVisible().catch(() => false),
        };
        out.inFormErrors = out.windowOpen ? await page.locator(formSel).first().evaluate((f) => [...f.querySelectorAll('.pkp_form_error, .notifyFormError, label.error, .error, [class*=Error]')].filter((e) => e.getClientRects().length && e.innerText.trim()).map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 200))).catch(() => []) : [];
        out.dialogs = since(jsDialogs, t0);
        out.crashes = crashesSince(t0);
        return out;
    }
    const dateRead = async (formSel) => page.locator(formSel).first().evaluate((f) => ({
        response: f.querySelector('input[type="hidden"][name="responseDueDate"]')?.value || null,
        review: f.querySelector('input[type="hidden"][name="reviewDueDate"]')?.value || null,
        responseShown: f.querySelector('input[name="responseDueDate-removed"]')?.value || null,
        reviewShown: f.querySelector('input[name="reviewDueDate-removed"]')?.value || null,
        guidance: /Review due date must be greater or equal to response due date\./.test(f.innerText),
    })).catch((e) => ({error: flat(e.message, 200)}));
    const cancelLink = (formSel) => page.locator(formSel).first().locator('xpath=ancestor::*[@data-cy="active-modal"][1]').getByRole('link', {name: 'Cancel', exact: true}).first();
    const assignDb = (sid, username) => db(`select ra.review_id, ra.declined, ra.request_resent, ra.date_confirmed, ra.date_response_due::date, ra.date_due::date, ra.cancelled from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${sid} and u.username = '${username}' order by ra.review_id`);

    try {
        // =================================================================== dates (R123)
        if (on('dates') && A !== 'ops') {
            const t = tag('u27i05d');
            const N = {mg: ['Mona', 'Manager'], se: ['Seth', 'Subeditor'], au: ['Ava', 'Author'],
                aM: ['Adda', 'Addmgr'], aS: ['Addy', 'Addsub'], eM: ['Edna', 'Editmgr'], eS: ['Eddy', 'Editsub'],
                dM: ['Dina', 'Declmgr'], dS: ['Dino', 'Declsub']};
            const full = (k) => N[k].join(' ');
            const u = Object.fromEntries(Object.keys(N).map((k) => [k, `${t}${k.toLowerCase()}`])); // distinct case-insensitively (screen notes)
            const person = (k, roles) => ({username: u[k], roles, givenName: N[k][0], familyName: N[k][1]});
            const revKeys = ['aM', 'aS', 'eM', 'eS', 'dM', 'dS'];
            const C = await app.api.createContext({tag: t, context: {name: `I05 dates ${t}`}, users: [person('mg', ['manager']), person('se', ['sectionEditor']), person('au', ['author']), ...revKeys.map((k) => person(k, ['externalReviewer']))]});
            const ctx = C.path;
            const sub = await app.api.createSubmission({tag: `${t}s`, context: ctx, submitter: u.au, title: `I05 dates ${t}`,
                decisions: ['sendExternalReview'], participants: [{username: u.se, role: 'sectionEditor'}],
                reviewRounds: [{reviewers: [{username: u.eM, status: 'invited'}, {username: u.eS, status: 'invited'}, {username: u.dM, status: 'declined'}, {username: u.dS, status: 'declined'}]}]});
            fact('dates-seed', {ctx, submissionId: sub.submissionId, round: sub.reviewRounds[0]});
            for (const lvl of ['mg', 'se']) {
                const L = lvl === 'mg' ? 'M' : 'S';
                await signIn(page, u[lvl], {contextPath: ctx});
                await idle(page);
                // ---- Add Reviewer
                const out = {level: lvl};
                const tA = Date.now();
                try {
                    let modal = await openWf(ctx, sub);
                    out.stageSnap = await snap(`dates-${lvl}-stage`);
                    const add = await R().openAddReviewer(page, modal);
                    await R().searchReviewerList(page, add, N[`a${L}`][1]);
                    await R().selectReviewerAndAwaitForm(page, add, full(`a${L}`));
                    out.formSnap = await snap(`dates-${lvl}-add-form`);
                    out.preset = await dateRead('#regularReviewerForm');
                    if (lvl === 'mg' && RUN === 'r1') {
                        await loc(page, 'Add Reviewer window (selected reviewer): the request form', page.locator('#regularReviewerForm'));
                        await loc(page, 'Add Reviewer window: visible "Response Due Date" box', page.locator('#regularReviewerForm input[name="responseDueDate-removed"]'));
                        await loc(page, 'Page notices (top right)', page.locator('.app__notifications .pkpNotification'));
                    }
                    await R().pickDate(page, add, 'responseDueDate', day(14));
                    await R().pickDate(page, add, 'reviewDueDate', day(7));
                    out.invertedPicked = await dateRead('#regularReviewerForm');
                    out.inverted = await pressSubmit(add, 'Add Reviewer', /reviewer-grid\//, '#regularReviewerForm', `dates-${lvl}-add-inverted`);
                    out.inverted.rowOnPage = await readRow(modal, full(`a${L}`)).catch(() => ({unreadable: true}));
                    out.invertedSnap = await snap(`dates-${lvl}-add-inverted-settled`, out.inverted);
                    out.inverted.db = assignDb(sub.submissionId, u[`a${L}`]);
                    // other end: equal dates (also the control)
                    if (out.inverted.windowOpen) {
                        await R().pickDate(page, add, 'reviewDueDate', day(14));
                        out.equalPicked = await dateRead('#regularReviewerForm');
                        out.equal = await pressSubmit(add, 'Add Reviewer', /reviewer-grid\//, '#regularReviewerForm', `dates-${lvl}-add-equal`);
                        await sleep(1200);
                        out.equal.rowOnPage = await readRow(modal, full(`a${L}`)).catch(() => ({unreadable: true}));
                        out.equalSnap = await snap(`dates-${lvl}-add-equal-settled`, out.equal);
                    }
                    modal = await openWf(ctx, sub);
                    out.afterReload = await readRow(modal, full(`a${L}`));
                    out.db = assignDb(sub.submissionId, u[`a${L}`]);
                    out.reloadSnap = await snap(`dates-${lvl}-add-after-reload`);
                } catch (e) {
                    out.FAILED = flat(e.stack || e, 800);
                    out.failSnap = await snap(`dates-${lvl}-add-failed`).catch(() => null);
                }
                out.crashes = crashesSince(tA);
                fact(`dates-add-${lvl}`, out);

                // ---- a row's "Edit"
                const ed = {level: lvl};
                const tE = Date.now();
                try {
                    let modal = await openWf(ctx, sub);
                    ed.before = assignDb(sub.submissionId, u[`e${L}`]);
                    const win = await R().openEditReview(page, rowOf(modal, full(`e${L}`)));
                    ed.openSnap = await snap(`dates-${lvl}-edit-open`);
                    ed.shown = await dateRead('form#editReviewForm');
                    await R().pickDate(page, win, 'responseDueDate', day(21));
                    await R().pickDate(page, win, 'reviewDueDate', day(10));
                    ed.inverted = await pressSubmit(win, 'OK', /reviewer-grid\//, 'form#editReviewForm', `dates-${lvl}-edit-inverted`);
                    ed.invertedSnap = await snap(`dates-${lvl}-edit-inverted-settled`, ed.inverted);
                    if (ed.inverted.windowOpen) {
                        // other end: equal dates
                        await R().pickDate(page, win, 'reviewDueDate', day(21));
                        ed.equal = await pressSubmit(win, 'OK', /reviewer-grid\//, 'form#editReviewForm', `dates-${lvl}-edit-equal`);
                        ed.equalSnap = await snap(`dates-${lvl}-edit-equal-settled`, ed.equal);
                        if (ed.equal.windowOpen) await cancelLink('form#editReviewForm').click().catch(() => {});
                    }
                    await sleep(1200);
                    ed.rowOnPage = await readRow(modal, full(`e${L}`));
                    modal = await openWf(ctx, sub);
                    ed.afterReload = await readRow(modal, full(`e${L}`));
                    await R().openEditReview(page, rowOf(modal, full(`e${L}`)));
                    ed.reopenedAfterReload = await dateRead('form#editReviewForm');
                    await cancelLink('form#editReviewForm').click().catch(() => {});
                    ed.db = assignDb(sub.submissionId, u[`e${L}`]);
                } catch (e) {
                    ed.FAILED = flat(e.stack || e, 800);
                    ed.failSnap = await snap(`dates-${lvl}-edit-failed`).catch(() => null);
                }
                ed.crashes = crashesSince(tE);
                fact(`dates-edit-${lvl}`, ed);

                // ---- a declined row's "Resend Review Request"
                const rs = {level: lvl};
                const tR = Date.now();
                try {
                    let modal = await openWf(ctx, sub);
                    rs.rowBefore = await readRow(modal, full(`d${L}`));
                    const {menu, entries} = await menuOf(modal, full(`d${L}`));
                    rs.menu = entries;
                    await R().menuEntry(menu, 'Resend Review Request').click();
                    const form = 'form#resendRequestReviewerForm';
                    await page.locator(form).waitFor({timeout: T});
                    await R().awaitTinyMce(page, 'personalMessage');
                    const win = page.locator('[data-cy="active-modal"]').filter({has: page.locator(form)}).last();
                    rs.openSnap = await snap(`dates-${lvl}-resend-open`);
                    rs.preset = await dateRead(form);
                    await R().pickDate(page, win, 'responseDueDate', day(21));
                    await R().pickDate(page, win, 'reviewDueDate', day(10));
                    rs.inverted = await pressSubmit(win, 'Resend Review Request', /reviewer-grid\//, form, `dates-${lvl}-resend-inverted`);
                    rs.invertedSnap = await snap(`dates-${lvl}-resend-inverted-settled`, rs.inverted);
                    if (rs.inverted.windowOpen) {
                        await R().pickDate(page, win, 'reviewDueDate', day(21));
                        rs.equal = await pressSubmit(win, 'Resend Review Request', /reviewer-grid\//, form, `dates-${lvl}-resend-equal`);
                        rs.equalSnap = await snap(`dates-${lvl}-resend-equal-settled`, rs.equal);
                    }
                    await sleep(1200);
                    rs.rowOnPage = await readRow(modal, full(`d${L}`));
                    modal = await openWf(ctx, sub);
                    rs.afterReload = await readRow(modal, full(`d${L}`));
                    rs.db = assignDb(sub.submissionId, u[`d${L}`]);
                } catch (e) {
                    rs.FAILED = flat(e.stack || e, 800);
                    rs.failSnap = await snap(`dates-${lvl}-resend-failed`).catch(() => null);
                }
                rs.crashes = crashesSince(tR);
                fact(`dates-resend-${lvl}`, rs);
                await signOut(page).catch(() => {});
            }
        }

        // =================================================================== resent (R121)
        if (on('resent') && A !== 'ops') {
            const t = tag('u27i05r');
            const N = {mg: ['Mira', 'Manager'], au: ['Abe', 'Author'], w: ['Wren', 'Futureresent'], x: ['Xena', 'Pastresent'],
                y: ['Yuri', 'Editedresent'], z: ['Zoe', 'Bothpast'], c: ['Cato', 'Firstrequest']};
            const full = (k) => N[k].join(' ');
            const u = Object.fromEntries(Object.keys(N).map((k) => [k, `${t}${k}`]));
            const person = (k, roles) => ({username: u[k], roles, givenName: N[k][0], familyName: N[k][1]});
            const C = await app.api.createContext({tag: t, context: {name: `I05 resent ${t}`}, users: [person('mg', ['manager']), person('au', ['author']), ...['w', 'x', 'y', 'z', 'c'].map((k) => person(k, ['externalReviewer']))]});
            const ctx = C.path;
            const sub = await app.api.createSubmission({tag: `${t}s`, context: ctx, submitter: u.au, title: `I05 resent ${t}`, decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: [...['w', 'x', 'y', 'z'].map((k) => ({username: u[k], status: 'declined'})), {username: u.c, status: 'invited'}]}]});
            fact('resent-seed', {ctx, submissionId: sub.submissionId, today: iso(day(0))});
            await signIn(page, u.mg, {contextPath: ctx});
            await idle(page);
            const form = 'form#resendRequestReviewerForm';
            async function resend(k, response, review) {
                const out = {reviewer: full(k), picked: response ? {response: iso(response), review: iso(review)} : 'defaults'};
                const t0 = Date.now();
                try {
                    const modal = await openWf(ctx, sub);
                    out.rowBefore = await readRow(modal, full(k));
                    const {menu, entries} = await menuOf(modal, full(k));
                    out.menuBefore = entries;
                    await R().menuEntry(menu, 'Resend Review Request').click();
                    await page.locator(form).waitFor({timeout: T});
                    await R().awaitTinyMce(page, 'personalMessage');
                    const win = page.locator('[data-cy="active-modal"]').filter({has: page.locator(form)}).last();
                    out.preset = await dateRead(form);
                    if (response) {
                        await R().pickDate(page, win, 'responseDueDate', response);
                        await R().pickDate(page, win, 'reviewDueDate', review);
                    }
                    out.sent = await pressSubmit(win, 'Resend Review Request', /reviewer-grid\//, form, `resent-${k}-send`);
                    await sleep(1200);
                    out.rowOnPage = await readRow(modal, full(k));
                    out.pageSnap = await snap(`resent-${k}-after-send`, out.rowOnPage);
                } catch (e) {
                    out.FAILED = flat(e.stack || e, 800);
                    out.failSnap = await snap(`resent-${k}-failed`).catch(() => null);
                }
                out.crashes = crashesSince(t0);
                return out;
            }
            async function editResponse(k, response) {
                const out = {reviewer: full(k), response: iso(response)};
                const t0 = Date.now();
                try {
                    const modal = await openWf(ctx, sub);
                    out.rowBefore = await readRow(modal, full(k));
                    const win = await R().openEditReview(page, rowOf(modal, full(k)));
                    out.shown = await dateRead('form#editReviewForm');
                    await R().pickDate(page, win, 'responseDueDate', response);
                    out.saved = await pressSubmit(win, 'OK', /reviewer-grid\//, 'form#editReviewForm', `resent-${k}-edit`);
                    await sleep(1200);
                    out.rowOnPage = await readRow(modal, full(k));
                    out.pageSnap = await snap(`resent-${k}-after-edit`, out.rowOnPage);
                } catch (e) {
                    out.FAILED = flat(e.stack || e, 800);
                    out.failSnap = await snap(`resent-${k}-edit-failed`).catch(() => null);
                }
                out.crashes = crashesSince(t0);
                return out;
            }
            fact('resent-w-future', await resend('w', null, null));
            fact('resent-x-past-response', await resend('x', day(-1), day(20)));
            fact('resent-y-default', await resend('y', null, null));
            fact('resent-y-edit-past', await editResponse('y', day(-1)));
            fact('resent-z-both-past', await resend('z', day(-3), day(-1)));
            fact('resent-c-control-edit-past', await editResponse('c', day(-1)));
            // after a reload: every row, its "More Actions" entries, and the stored state
            const modal = await openWf(ctx, sub);
            const rows = {};
            for (const k of ['w', 'x', 'y', 'z', 'c']) {
                rows[k] = await readRow(modal, full(k));
                const m = await menuOf(modal, full(k)).catch(() => ({entries: null}));
                rows[k].menu = m.entries;
                await closeMenu(modal, full(k));
                rows[k].db = assignDb(sub.submissionId, u[k]);
            }
            rows.snap = await snap('resent-all-after-reload');
            fact('resent-after-reload', rows);
            if (RUN === 'r1') await loc(page, 'Reviewers table row status cell (second column)', rowOf(modal, full('x')).locator('td').nth(1));
            await signOut(page).catch(() => {});
        }

        // =================================================================== status (R121's neighbours in Rule 2's table)
        // "Request Accepted", "Overdue" on an accepted request whose review date passed, and the
        // "Request Declined" hover, the table rows R121's triage names besides the resent one.
        if (on('status') && A !== 'ops') {
            const t = tag('u27i05s');
            const N = {mg: ['Mavis', 'Manager'], au: ['Aldo', 'Author'], acc: ['Abel', 'Accepted'], dec: ['Dora', 'Declined']};
            const full = (k) => N[k].join(' ');
            const u = Object.fromEntries(Object.keys(N).map((k) => [k, `${t}${k}`]));
            const person = (k, roles) => ({username: u[k], roles, givenName: N[k][0], familyName: N[k][1]});
            const C = await app.api.createContext({tag: t, context: {name: `I05 status ${t}`}, users: [person('mg', ['manager']), person('au', ['author']), person('acc', ['externalReviewer']), person('dec', ['externalReviewer'])]});
            const ctx = C.path;
            const sub = await app.api.createSubmission({tag: `${t}s`, context: ctx, submitter: u.au, title: `I05 status ${t}`, decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: [{username: u.acc, status: 'accepted'}, {username: u.dec, status: 'declined'}]}]});
            fact('status-seed', {ctx, submissionId: sub.submissionId, today: iso(day(0))});
            await signIn(page, u.mg, {contextPath: ctx});
            await idle(page);
            const out = {};
            const t0 = Date.now();
            try {
                let modal = await openWf(ctx, sub);
                out.accepted = await readRow(modal, full('acc'));
                out.accepted.db = assignDb(sub.submissionId, u.acc);
                out.declined = await readRow(modal, full('dec'));
                // the declined row's hover: every control or icon in its status cell, hovered in turn
                const cell = rowOf(modal, full('dec')).locator('td, th').nth(1);
                const targets = cell.locator('button, [aria-describedby], [title], svg, [class*=icon], [class*=Icon]');
                out.hoverTargets = await targets.count();
                out.hover = [];
                for (let i = 0; i < Math.min(out.hoverTargets, 4); i++) {
                    const el = targets.nth(i);
                    const desc = await el.evaluate((e) => ({tag: e.tagName, aria: e.getAttribute('aria-label'), title: e.getAttribute('title'), cls: String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).slice(0, 80)})).catch(() => null);
                    await el.hover({timeout: 5000}).catch(() => {});
                    await sleep(800);
                    const tips = await page.locator('[role="tooltip"], .tooltip, [data-popper-placement], .v-popper__popper').allInnerTexts().catch(() => []);
                    out.hover.push({desc, tips: tips.map((x) => flat(x, 200)).filter(Boolean)});
                }
                out.hoverSnap = await snap('status-declined-hover', out.hover);
                await page.mouse.move(5, 5);
                // the accepted request's review date moved into the past through "Edit"
                const win = await R().openEditReview(page, rowOf(modal, full('acc')));
                out.editShown = await dateRead('form#editReviewForm');
                await R().pickDate(page, win, 'responseDueDate', day(-2));
                await R().pickDate(page, win, 'reviewDueDate', day(-1));
                out.saved = await pressSubmit(win, 'OK', /reviewer-grid\//, 'form#editReviewForm', 'status-acc-edit');
                await sleep(1200);
                out.acceptedPastOnPage = await readRow(modal, full('acc'));
                modal = await openWf(ctx, sub);
                out.acceptedPastAfterReload = await readRow(modal, full('acc'));
                out.acceptedPastDb = assignDb(sub.submissionId, u.acc);
                out.reloadSnap = await snap('status-after-reload', out.acceptedPastAfterReload);
            } catch (e) {
                out.FAILED = flat(e.stack || e, 800);
                out.failSnap = await snap('status-failed').catch(() => null);
            }
            out.crashes = crashesSince(t0);
            fact('status', out);
            await signOut(page).catch(() => {});
        }

        // =================================================================== email (R126)
        if (on('email')) {
            if (A === 'ops') {
                await signIn(page, 'manager.maya', {contextPath: app.contextPath});
                await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/manageEmails`));
                await idle(page);
                await page.locator('main').getByRole('button', {name: /^Edit /}).first().waitFor({timeout: T}).catch(() => {});
                const names = await page.evaluate(() => [...document.querySelectorAll('main button')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter((s) => /^Edit /.test(s)).map((s) => s.replace(/^Edit (Edit )?/, '')));
                fact('email-ops-control', {listedReviewerUnassign: names.includes('Reviewer Unassign'), reviewNamed: names.filter((n) => /review/i.test(n)), count: names.length, snap: await snap('email-ops-manage-emails')});
                fact('email-ops-db', db(`select email_key, locale, length(coalesce(subject,'')), length(coalesce(body,'')) from email_templates_default_data where email_key in ('REVIEWER_UNASSIGN','REVIEW_CANCEL') order by 1,2`));
                await signOut(page).catch(() => {});
            } else {
                const t = tag('u27i05e');
                const N = {mg: ['Mila', 'Manager'], au: ['Ari', 'Author'], ru: ['Remi', 'Frenchunassign'], rv: ['Rosa', 'Englishunassign']};
                const full = (k) => N[k].join(' ');
                const u = Object.fromEntries(Object.keys(N).map((k) => [k, `${t}${k}`]));
                const person = (k, roles) => ({username: u[k], roles, givenName: N[k][0], familyName: N[k][1]});
                const C = await app.api.createContext({tag: t, context: {name: `I05 email ${t}`, supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
                    users: [person('mg', ['manager']), person('au', ['author']), person('ru', ['externalReviewer']), person('rv', ['externalReviewer'])]});
                const ctx = C.path;
                const sub = await app.api.createSubmission({tag: `${t}s`, context: ctx, submitter: u.au, title: `I05 email ${t}`, decisions: ['sendExternalReview'],
                    reviewRounds: [{reviewers: [{username: u.ru, status: 'invited'}, {username: u.rv, status: 'invited'}]}]});
                fact('email-seed', {ctx, submissionId: sub.submissionId});
                fact('email-db-default-data', db(`select email_key, locale, length(coalesce(subject,'')) as subj, length(coalesce(body,'')) as body from email_templates_default_data where email_key in ('REVIEWER_UNASSIGN','REVIEW_CANCEL') order by 1,2`));
                fact('email-db-installed-locales', db(`select setting_value from site_settings where setting_name in ('installedLocales','supportedLocales')`));
                await signIn(page, u.mg, {contextPath: ctx});
                await page.goto(app.url(`/index.php/${ctx}/management/settings/manageEmails`));
                await idle(page);
                await page.locator('main').getByRole('button', {name: /^Edit /}).first().waitFor({timeout: T});
                const names = await page.evaluate(() => [...document.querySelectorAll('main button')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter((s) => /^Edit /.test(s)).map((s) => s.replace(/^Edit (Edit )?/, '')));
                fact('email-list', {listed: names.filter((n) => /review/i.test(n)), count: names.length, snap: await snap('email-manage-emails')});
                for (const mailable of ['Reviewer Unassign', 'Review Cancel']) {
                    const out = {mailable};
                    const btn = page.locator('main').getByRole('button', {name: `Edit ${mailable}`, exact: true});
                    if (!(await btn.count())) { out.absent = true; fact(`email-${mailable}`, out); continue; }
                    const respP = page.waitForResponse((r) => /api\/v1\/(mailables|emailTemplates)\//.test(r.url()) && r.request().method() === 'GET', {timeout: 20000}).catch(() => null);
                    await btn.click();
                    const r = await respP;
                    const data = r ? await r.json().catch(() => null) : null;
                    const kind = r && /mailables/.test(r.url()) ? 'multi' : 'single';
                    out.kind = kind; out.http = r && r.status();
                    out.fetched = data ? (kind === 'multi' ? (data.emailTemplates || []).map((x) => ({key: x.key, name: x.name, subject: x.subject, bodyLen: Object.fromEntries(Object.entries(x.body || {}).map(([l, v]) => [l, (v || '').length]))})) : {key: data.key, subject: data.subject}) : null;
                    await idle(page);
                    out.windowSnap = await snap(`email-${mailable.replace(/\s/g, '')}-window`);
                    if (kind === 'multi') {
                        const dlg = page.getByRole('dialog', {name: mailable, exact: true}).last();
                        await dlg.getByRole('button', {name: 'Edit', exact: true}).first().click();
                        const et = page.getByRole('dialog', {name: 'Edit Template'}).last();
                        await et.waitFor({timeout: 15000});
                        await idle(page);
                        await page.waitForFunction(() => window.tinymce && window.tinymce.get().filter((e) => /editEmailTemplate-body/.test(e.id)).every((e) => e.initialized), null, {timeout: 15000}).catch(() => {});
                        await sleep(800);
                        out.edit = await et.evaluate((el) => ({
                            inputs: [...el.querySelectorAll('input')].filter((e) => /^(subject|name)-/.test(e.name)).map((e) => ({name: e.name, value: (e.value || '').slice(0, 200)})),
                            bodies: (window.tinymce ? window.tinymce.get() : []).filter((e) => /editEmailTemplate-body/.test(e.id)).map((e) => ({id: e.id, length: e.getContent().length, start: e.getContent().slice(0, 200)})),
                            text: el.innerText.slice(0, 1500),
                        }));
                        // the French side: press the form's French tab/toggle when there is one
                        const fr = et.getByRole('button', {name: /French|Français/}).first();
                        if (await fr.count()) { await fr.click().catch(() => {}); await sleep(600); }
                        out.editSnap = await snap(`email-${mailable.replace(/\s/g, '')}-edit-template`, out.edit);
                        await et.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                        await sleep(900);
                        await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                        await sleep(900);
                    } else {
                        await page.getByRole('dialog').last().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                        await sleep(900);
                    }
                    fact(`email-${mailable}`, out);
                }
                // the Unassign window's message, interface in French, then in English
                for (const [k, lang] of [['ru', 'fr_CA'], ['rv', 'en']]) {
                    const out = {lang, reviewer: full(k)};
                    const t0 = Date.now();
                    try {
                        await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial`));
                        await idle(page);
                        if (lang === 'fr_CA') await switchLanguage(page, 'fr_CA');
                        else if (/\/fr_CA\//.test(page.url())) await switchLanguage(page, 'en');
                        const modal = await openWf(ctx, sub);
                        const {menu, entries} = await menuOf(modal, full(k));
                        out.menu = entries;
                        const entry = R().menuEntries(menu).filter({hasText: lang === 'fr_CA' ? /Retirer l'assignation/ : /^\s*Unassign Reviewer\s*$/}).first();
                        await entry.click();
                        const form = page.locator('form#unassignReviewerForm, form[id*="nassign"]').first();
                        await form.waitFor({timeout: T});
                        await idle(page);
                        await page.waitForFunction(() => {
                            const ta = document.querySelector('textarea[name="personalMessage"]');
                            const ed = ta && window.tinymce && window.tinymce.get(ta.id);
                            return !!(ed && ed.initialized);
                        }, null, {timeout: 20000}).catch(() => {});
                        await sleep(2500);
                        out.window = await form.evaluate((f) => {
                            const ta = f.querySelector('textarea[name="personalMessage"]');
                            const ed = ta && window.tinymce && window.tinymce.get(ta.id);
                            const sel = f.querySelector('select[name="template"]');
                            return {
                                formId: f.id,
                                template: sel ? {options: [...sel.options].map((o) => o.text.trim()), selected: sel.selectedOptions[0] && sel.selectedOptions[0].text.trim()} : null,
                                messageLength: ed ? ed.getContent().length : null,
                                messageStart: ed ? ed.getContent({format: 'text'}).slice(0, 300) : null,
                                buttons: [...f.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean),
                                text: f.innerText.slice(0, 800),
                            };
                        });
                        out.windowSnap = await snap(`email-unassign-${lang}-window`, out.window);
                        const submitName = out.window.buttons.find((b) => /assign|Retirer/i.test(b)) || out.window.buttons.slice(-1)[0];
                        const win = page.locator('[data-cy="active-modal"]').filter({has: form}).last();
                        out.sent = await pressSubmit(win, submitName, /reviewer-grid\//, `form#${out.window.formId}`, `email-unassign-${lang}-send`);
                        await sleep(1200);
                        out.rowOnPage = await readRow(modal, full(k));
                        out.afterSnap = await snap(`email-unassign-${lang}-after`, out.sent);
                        out.db = assignDb(sub.submissionId, u[k]);
                    } catch (e) {
                        out.FAILED = flat(e.stack || e, 800);
                        out.failSnap = await snap(`email-unassign-${lang}-failed`).catch(() => null);
                    }
                    out.crashes = crashesSince(t0);
                    fact(`email-unassign-${lang}`, out);
                }
                try { if (/\/fr_CA\//.test(page.url())) await switchLanguage(page, 'en'); } catch { /* best effort */ }
                await signOut(page).catch(() => {});
            }
        }

        // =================================================================== crash (R023)
        if (on('crash') && A !== 'ops' && LINE === 'main') {
            const S = require('../../../pages/ReviewerSuggestionPages.js');
            const t = tag('u27i05c');
            const people = [];
            for (let i = 0; i < SUG; i++) people.push({key: `k${i}`, givenName: `Kay${String.fromCharCode(97 + i)}`, familyName: 'Suggested'});
            const panelPeople = [];
            for (let i = 0; i < PAN; i++) panelPeople.push({key: `p${i}`, givenName: `Pia${String.fromCharCode(97 + i)}`, familyName: 'Panelpick'});
            const uname = (k) => `${t}${k}`;
            const C = await app.api.createContext({tag: t, context: {name: `I05 crash ${t}`}, review: {reviewerSuggestionEnabled: true},
                users: [{username: uname('mg'), roles: ['manager'], givenName: 'Max', familyName: 'Manager'}, {username: uname('au'), roles: ['author'], givenName: 'Amy', familyName: 'Author'},
                    ...people.concat(panelPeople).map((p) => ({username: uname(p.key), roles: ['externalReviewer'], givenName: p.givenName, familyName: p.familyName}))]});
            const ctx = C.path;
            const sub = await app.api.createSubmission({tag: `${t}s`, context: ctx, submitter: uname('au'), title: `I05 crash ${t}`, decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: []}],
                reviewerSuggestions: people.map((p) => ({givenName: p.givenName, familyName: p.familyName, email: `${uname(p.key)}@mail.test`, affiliation: 'Suggested University', suggestionReason: 'Knows the field.'}))});
            fact('crash-seed', {ctx, submissionId: sub.submissionId, sug: SUG, pan: PAN});
            await signIn(page, uname('mg'), {contextPath: ctx});
            await idle(page);
            const cdp = await context.newCDPSession(page);
            await cdp.send('Emulation.setCPUThrottlingRate', {rate: 6});
            const results = [];
            const panel = new S.SuggestedReviewersPanel(page);
            let modal = await openWf(ctx, sub);
            await panel.loaded();
            fact('crash-start', {snap: await snap('crash-stage'), rows: await panel.rows().count()});
            for (const p of people) {
                const name = `${p.givenName} ${p.familyName}`;
                const t0 = Date.now();
                const it = {route: 'suggestion', name, steps: []};
                try {
                    let w = await panel.addReviewerFromRow(name);
                    if (p === people[0]) it.windowSnap = await snap('crash-selected-reviewer-window');
                    await w.cancel(); it.steps.push('cancel');
                    w = await panel.addReviewerFromRow(name);
                    await w.appendToMessage('Please reply within a week.'); it.steps.push('typed');
                    await w.close(); it.steps.push('close');
                    w = await panel.addReviewerFromRow(name);
                    await w.submit(); it.steps.push('submit');
                    await page.getByRole('dialog', {name: /Add Reviewer/i}).first().waitFor({state: 'detached', timeout: T}).catch(() => {});
                    await idle(page);
                    it.row = await readRow(modal, name).catch(() => null);
                } catch (e) {
                    it.FAILED = flat(e.message, 400);
                    it.failSnap = await snap(`crash-${p.key}-failed`).catch(() => null);
                    modal = await openWf(ctx, sub).catch(() => modal);
                    await panel.loaded().catch(() => {});
                }
                it.errors = since(pageErrors, t0);
                it.server = since(net, t0).filter((x) => x.s >= 500);
                it.dialogs = since(jsDialogs, t0);
                if (it.errors.length) it.errorSnap = await snap(`crash-${p.key}-error`);
                results.push(it);
                log(`suggestion ${name}: steps=${it.steps.join(',')} errors=${it.errors.length}${it.FAILED ? ' FAILED ' + it.FAILED : ''}`);
            }
            for (const p of panelPeople) {
                const name = `${p.givenName} ${p.familyName}`;
                const t0 = Date.now();
                const it = {route: 'panel', name, steps: []};
                try {
                    await sleep(700);
                    let add = await R().openAddReviewer(page, modal);
                    await R().searchReviewerList(page, add, p.givenName);
                    await R().selectReviewerAndAwaitForm(page, add, name);
                    if (p === panelPeople[0]) it.windowSnap = await snap('crash-panel-selected-window');
                    const body = add.frameLocator('iframe[id^="personalMessage"]:visible').first().locator('body');
                    await body.click();
                    await page.keyboard.press('Control+End');
                    await page.keyboard.type('Please reply within a week.');
                    it.steps.push('typed');
                    await add.getByRole('button', {name: /^Close$/}).first().click();
                    await page.locator('#regularReviewerForm').waitFor({state: 'detached', timeout: T}).catch(() => {});
                    it.steps.push('close');
                    await sleep(700);
                    add = await R().openAddReviewer(page, modal);
                    await R().searchReviewerList(page, add, p.givenName);
                    await R().selectReviewerAndAwaitForm(page, add, name);
                    const answered = page.waitForResponse((r) => /reviewer-grid\//.test(r.url()) && r.request().method() === 'POST', {timeout: 45000}).catch(() => null);
                    await add.getByRole('button', {name: 'Add Reviewer', exact: true}).last().click();
                    const r = await answered;
                    it.steps.push(`submit:${r ? r.status() : 'none'}`);
                    await page.locator('#regularReviewerForm').waitFor({state: 'detached', timeout: T}).catch(() => {});
                    await idle(page);
                    it.row = await readRow(modal, name).catch(() => null);
                } catch (e) {
                    it.FAILED = flat(e.message, 400);
                    it.failSnap = await snap(`crash-${p.key}-failed`).catch(() => null);
                    modal = await openWf(ctx, sub).catch(() => modal);
                }
                it.errors = since(pageErrors, t0);
                it.server = since(net, t0).filter((x) => x.s >= 500);
                it.dialogs = since(jsDialogs, t0);
                if (it.errors.length) it.errorSnap = await snap(`crash-${p.key}-error`);
                results.push(it);
                log(`panel ${name}: steps=${it.steps.join(',')} errors=${it.errors.length}${it.FAILED ? ' FAILED ' + it.FAILED : ''}`);
            }
            await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1}).catch(() => {});
            modal = await openWf(ctx, sub);
            fact('crash-results', {iterations: results.length, withErrors: results.filter((x) => x.errors.length).length, failed: results.filter((x) => x.FAILED).length, results, endSnap: await snap('crash-end')});
            await signOut(page).catch(() => {});
        }
    } catch (e) {
        log('FAILED', flat(e.stack || e, 1500));
        await snap('phase-failed').catch(() => {});
    }
});
