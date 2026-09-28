// U24 claim check, chunk I28: the housekeeping session's incidental rows for the workflow-screen spec.
// Chunk: .reports/hk28/chunks/U24.md (incidentals L38b, L46b, L66, L72b, L99, L145, L146a, L146b-OJS).
//
// One scratch context per app and run (tag u24i28…), users:
//   OJS/OMP  mgr (manager), ed (editor: manager-level), se2 (sectionEditor, assigned as participant),
//            se (sectionEditor, assigned to nothing), ce (copyeditor, assigned on C), au (author, submitter),
//            rv (externalReviewer, invited on R), rv2 (a spare reviewer for the Add Reviewer search)
//   OPS      mgr, se2 (Moderator, assigned), se (Moderator, assigned to nothing), au
// Submissions:
//   R  (OJS/OMP) External Review Round 1, rv invited; ed, se2 participants
//   C  (OJS/OMP) Copyediting (skipExternalReview); ed, se2, ce participants
//   P  (OPS)     a queued preprint in Production; se2 participant
// Phases (PHASES=…, default all):
//   review  L38b, L66, L146a: the editorial "Review" / "External Review" entry pressed 5x and typed 5x (script
//           errors), "Add Reviewer" on it and on "Review Round 1" (the control); as ed and se2
//   author  L72b, L146b: the Author's "Review" / "External Review" entry pressed and typed, control the round key
//   noacc   L46b, L99: the unassigned se at the dashboard address (reads at 0.3/1/3/6 s, then "OK") and at
//           workflow/access/{id}; the assigned ce selecting "Submission" / "Review" on C, and "Preview"
//   noid    L145: workflow/{submission,externalReview,editorial,production,internalReview,access,index} typed
//           with no number, as mgr, ed, se2, au; controls with the number
//   a5      register A5's own addresses (workflow/index/{id} and /9) as mgr, the control /index/{id}/{stage}
//   opsw    (OPS) the stage-naming addresses WITH the number for stages a preprint server lacks, as mgr, se2, au
//
//   RUN=r1 PROBE_FEATURE=U24 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U24/I28/i28.js
//   RUN=r2 …  (the second, independent run: its own scratch context and facts names)
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} =
    require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL = ['review', 'author', 'noacc', 'noid', 'opsw', 'a5'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(`[${RUN}]`, ...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));

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
// Every visible dialog: its name and text (the Error dialog, the Add Reviewer window, the workflow panel).
const dialogs = (page) => page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((d) => ({
    name: d.getAttribute('aria-label') || (d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.innerText) || null,
    hidden: d.closest('[aria-hidden="true"]') ? true : false,
    text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 800),
}))).catch(() => []);
// The workflow panel as data, through CSS (the panel goes aria-hidden under a stacked dialog).
const wfInfo = (page) => page.evaluate(() => {
    const vis = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const header = document.querySelector('[data-cy="sidemodal-header"]');
    const root = header ? header.closest('[role=dialog]') || header.parentElement : null;
    if (!root) return {panel: false};
    const hdrButtons = [...header.querySelectorAll('button, a[role=button]')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean);
    const hs = [...root.querySelectorAll('h1,h2,h3,h4')].filter(vis);
    const statusH = hs.find((x) => /Status$/.test(x.innerText.trim()));
    const nav = root.querySelector('nav');
    const region = (cy) => root.querySelector(`[data-cy="${cy}"]`);
    const act = region('workflow-action-items');
    const prim = region('workflow-primary-items');
    const sec = region('workflow-secondary-items');
    const tables = [...root.querySelectorAll('table')].filter(vis).map((t) => ({
        name: t.getAttribute('aria-label') || (t.getAttribute('aria-labelledby') && document.getElementById(t.getAttribute('aria-labelledby'))?.innerText.trim()) || null,
        rows: [...t.querySelectorAll('tbody tr')].filter(vis).map((tr) => txt(tr).slice(0, 160)),
    }));
    return {
        panel: true,
        headerText: txt(header),
        headerButtons: hdrButtons,
        h1: txt(root.querySelector('h1')),
        headings: hs.map((h) => txt(h)).filter(Boolean).slice(0, 30),
        status: statusH ? {heading: txt(statusH), text: txt(statusH.parentElement).slice(0, 400)} : null,
        menu: nav ? [...nav.querySelectorAll('a, button, [role=menuitem], li > span')].filter(vis).map((a) => ({t: txt(a), stripe: !!a.querySelector('[class*="stripe"], [class*="bg-stage"]'), cur: a.getAttribute('aria-current') || null, exp: a.getAttribute('aria-expanded')})).filter((a) => a.t).slice(0, 40) : null,
        actionButtons: act ? [...act.querySelectorAll('button, a')].filter(vis).map((b) => txt(b)).filter(Boolean) : null,
        primaryText: txt(prim) && txt(prim).slice(0, 900),
        secondaryText: txt(sec) && txt(sec).slice(0, 400),
        tables,
        mainText: (() => { const m = root.querySelector('main') || root; return txt(m).slice(0, 1500); })(),
    };
}).catch((e) => ({error: String(e.message)}));

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const t = tag(`u24i28${RUN}`);
    const u = (k) => `${t}${k}`;
    const ctxUrl = (p) => app.url(`/index.php/${t}${p}`);
    const wf = (id, key) => ctxUrl(`/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const awf = (id, key) => ctxUrl(`/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const REVIEW = isOMP ? 'External Review' : 'Review';
    const facts = {};
    const fact = (k, v) => { facts[k] = v; log(app.name, k, typeof v === 'string' ? v : JSON.stringify(v).slice(0, 900)); };

    // ---------------------------------------------------------------- seed
    const users = isOPS
        ? [['mgr', 'manager'], ['se2', 'sectionEditor'], ['se', 'sectionEditor'], ['au', 'author']]
        : [['mgr', 'manager'], ['ed', 'editor'], ['se2', 'sectionEditor'], ['se', 'sectionEditor'], ['ce', 'copyeditor'], ['au', 'author'], ['rv', 'externalReviewer'], ['rv2', 'externalReviewer']];
    await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`}, users: users.map(([k, r]) => ({username: u(k), roles: [r]}))});
    const subs = {};
    const parts = (list) => list.map(([k, role]) => ({username: u(k), role}));
    if (isOPS) {
        const p = await app.api.createSubmission({tag: `${t}P`, context: t, submitter: u('au'), title: `P preprint ${t}`, participants: parts([['se2', 'sectionEditor']])});
        subs.P = {id: p.submissionId};
    } else {
        const r = await app.api.createSubmission({tag: `${t}R`, context: t, submitter: u('au'), title: `R review ${t}`,
            decisions: [isOMP ? 'skipInternalReview' : 'sendExternalReview'],
            reviewRounds: [{...(isOMP ? {stage: 'external'} : {}), reviewers: [{username: u('rv'), status: 'invited'}]}],
            participants: parts([['ed', 'editor'], ['se2', 'sectionEditor']])});
        subs.R = {id: r.submissionId, rounds: r.reviewRounds};
        const c = await app.api.createSubmission({tag: `${t}C`, context: t, submitter: u('au'), title: `C copyediting ${t}`,
            decisions: ['skipExternalReview'], participants: parts([['ed', 'editor'], ['se2', 'sectionEditor'], ['ce', 'copyeditor']])});
        subs.C = {id: c.submissionId};
    }
    fact('seed', {context: t, subs});
    const rkey = () => { const r = subs.R.rounds && subs.R.rounds[0]; return r ? `workflow_${r.stageId || 3}_${r.id}` : null; };

    const {page, close} = await launch(app);
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push({at: page.url().replace(/^https?:\/\/[^/]+/, ''), console: m.text().slice(0, 300)}); });
    page.on('pageerror', (e) => errs.push({at: page.url().replace(/^https?:\/\/[^/]+/, ''), pageerror: String(e.message).slice(0, 300), stack: String(e.stack || '').split('\n').slice(0, 3).join(' | ').slice(0, 400)}));
    const resp = [];
    page.on('response', (r) => { const rt = r.request().resourceType(); if (r.status() >= 400 || /\/api\/v1\//.test(r.url()) || rt === 'xhr' || rt === 'fetch') resp.push({status: r.status(), method: r.request().method(), type: rt, url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 220)}); });
    const browserDialogs = [];
    page.on('dialog', async (d) => { browserDialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
    const as = async (who) => { await signIn(page, u(who), {contextPath: t}); await idle(page); };

    async function settle() {
        await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 20000}).catch(() => {});
        await page.waitForFunction(() => !/Loading|Refreshing data/.test(document.querySelector('[data-cy="sidemodal-header"]')?.closest('[role=dialog]')?.innerText || ''), null, {timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(700); await idle(page);
    }
    async function view(url, label, extra) {
        const e0 = errs.length; const r0 = resp.length;
        const r = await page.goto(url); await settle();
        const info = await wfInfo(page);
        const s = await snap(page, label, {info, httpStatus: r && r.status(), consoleErrors: errs.slice(e0), responses: resp.slice(r0).filter((x) => x.status >= 400), ...(extra || {})});
        const out = {status: r && r.status(), url: page.url().replace(/^https?:\/\/[^/]+/, ''), h1: info.h1, headerButtons: info.headerButtons, headings: (info.headings || []).slice(0, 6), statusBox: info.status, actions: info.actionButtons, tables: (info.tables || []).map((x) => `${x.name}:${x.rows.length}`), primary: flat(info.primaryText, 300), dialogs: (await dialogs(page)).filter((d) => !/sidemodal/.test(d.text)).map((d) => ({name: d.name, text: flat(d.text, 200)})), errors: errs.slice(e0), bad: resp.slice(r0).filter((x) => x.status >= 400), title: s.title};
        return out;
    }
    async function pressEntry(name, label) {
        const nav = page.locator('[data-cy="sidemodal-header"]').first().locator('xpath=ancestor::*[@role="dialog"][1]').locator('nav');
        const e = nav.getByText(name, {exact: true}).first();
        await loc(page, `workflow side menu: the "${name}" entry`, e);
        const e0 = errs.length; const r0 = resp.length;
        await e.click({timeout: 10000}).catch((x) => log('click failed', name, String(x.message).slice(0, 100)));
        await idle(page); await page.waitForTimeout(1200); await idle(page);
        const info = await wfInfo(page);
        await snap(page, label, {info, consoleErrors: errs.slice(e0)});
        return {url: page.url().replace(/^https?:\/\/[^/]+/, '').replace(/^.*\?/, '?'), headings: (info.headings || []).slice(0, 5), statusBox: info.status, actions: info.actionButtons, tables: (info.tables || []).map((x) => `${x.name}:${x.rows.length}`), primary: flat(info.primaryText, 200), headerButtons: info.headerButtons, menu: (info.menu || []).map((m) => `${m.t}${m.exp ? `[${m.exp}]` : ''}`), errors: errs.slice(e0), bad: resp.slice(r0).filter((x) => x.status >= 400)};
    }
    // "Add Reviewer" on the open view: the window's text, then leave it with a phrase typed and unsaved.
    async function addReviewer(label) {
        const root = page.locator('[data-cy="sidemodal-header"]').first().locator('xpath=ancestor::*[@role="dialog"][1]');
        const btn = root.getByRole('button', {name: 'Add Reviewer', exact: true});
        await loc(page, `${label}: "Add Reviewer" in the Reviewers panel`, btn);
        if (!(await btn.count())) return {absent: true};
        const e0 = errs.length; const r0 = resp.length; const d0 = browserDialogs.length;
        await btn.first().click();
        await page.waitForTimeout(1500); await idle(page);
        const win = page.getByRole('dialog').filter({hasText: /Add Reviewer|Invalid review round|Error/}).last();
        await win.waitFor({timeout: 20000}).catch(() => {});
        await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog]')].some((d) => /Invalid review round|Search|Locate a Reviewer|reviewer/i.test(d.innerText) && !/sidemodal-header/.test(d.innerHTML.slice(0, 0))), null, {timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(800);
        const ds = await dialogs(page);
        await snap(page, `${label}-window`, {dialogs: ds});
        const out = {dialogs: ds.filter((d) => !d.text.includes('Close') || /Add Reviewer|Invalid/.test(d.text)).map((d) => ({name: d.name, text: flat(d.text, 400)})).slice(-2), errors: errs.slice(e0), requests: resp.slice(r0).filter((x) => !/\/api\/v1\/_/.test(x.url)).slice(0, 12), browserDialogs: browserDialogs.slice(d0)};
        // sweep: type into its search (if any) and leave by its own Cancel/Close
        const top = page.locator('[role="dialog"]:visible').last();
        const box = top.getByRole('textbox').first();
        if (await box.count()) { await box.fill('u24i28 unsaved').catch(() => {}); }
        const c = top.locator('button:visible, a:visible').filter({hasText: /^\s*(Cancel|Close|OK)\s*$/}).last();
        const how = (await c.count()) ? flat(await c.innerText(), 20) : null;
        if (how) await c.click({timeout: 5000}).catch(() => {});
        await page.waitForTimeout(900); await idle(page);
        out.leftBy = how;
        out.after = (await dialogs(page)).map((d) => ({name: d.name, text: flat(d.text, 160)}));
        out.browserDialogsOnLeave = browserDialogs.slice(d0);
        await snap(page, `${label}-window-left`, {out});
        return out;
    }

    try {
        // ------------------------------------------------ review: L38b, L66, L146a (editorial)
        if (on('review') && !isOPS) await sect('review', async () => {
            for (const who of ['ed', 'se2']) {
                await as(who);
                const out = {};
                out.landing = await view(wf(subs.R.id), `review-${who}-landing`);
                // five visits: each lands on the round afresh, then presses the stage entry
                out.pressed = [];
                for (let i = 1; i <= 5; i++) {
                    if (i > 1) await view(wf(subs.R.id, rkey()), `review-${who}-entry-pre-${i}`);
                    out.pressed.push(await pressEntry(REVIEW, `review-${who}-entry-pressed-${i}`));
                }
                // then the same entry pressed again and again on one visit (the fold toggle)
                out.toggled = [];
                for (let i = 1; i <= 3; i++) out.toggled.push(await pressEntry(REVIEW, `review-${who}-entry-toggled-${i}`));
                out.typed = [];
                for (let i = 1; i <= 5; i++) out.typed.push(await view(wf(subs.R.id, 'workflow_3'), `review-${who}-entry-typed-${i}`));
                out.addOnEntry = await addReviewer(`review-${who}-entry-add`);
                // the control: Review Round 1, typed and pressed
                out.roundTyped = [];
                for (let i = 1; i <= 3; i++) out.roundTyped.push(await view(wf(subs.R.id, rkey()), `review-${who}-round-typed-${i}`));
                out.roundPressed = [];
                await pressEntry(REVIEW, `review-${who}-round-fold-a`); // folds the rounds away / opens the entry
                const unfold = await pressEntry(REVIEW, `review-${who}-round-fold-b`);
                out.roundUnfold = unfold.menu;
                for (let i = 1; i <= 3; i++) out.roundPressed.push(await pressEntry('Review Round 1', `review-${who}-round-pressed-${i}`));
                out.addOnRound = await addReviewer(`review-${who}-round-add`);
                fact(`review-${who}`, {
                    landing: {url: out.landing.url, headings: out.landing.headings, errors: out.landing.errors.length},
                    pressed: out.pressed.map((p) => ({url: p.url, h: p.headings[1], status: p.statusBox && flat(p.statusBox.text, 90), actions: p.actions, tables: p.tables, errs: p.errors.map((e) => flat(e.pageerror || e.console, 110))})),
                    toggled: out.toggled.map((p) => ({url: p.url, h: p.headings[1], menu: p.menu.filter((m) => /Review/.test(m)).join(' / '), errs: p.errors.length})),
                    typed: out.typed.map((p) => ({url: p.url.replace(/^.*\?/, '?'), h: p.headings[1], actions: p.actions, tables: p.tables, status: p.statusBox && flat(p.statusBox.text, 90), errs: p.errors.map((e) => flat(e.pageerror || e.console, 110)), bad: p.bad})),
                    addOnEntry: out.addOnEntry,
                    roundTyped: out.roundTyped.map((p) => ({h: p.headings[1], status: p.statusBox && flat(p.statusBox.text, 90), actions: p.actions, errs: p.errors.length})),
                    roundPressed: out.roundPressed.map((p) => ({url: p.url, h: p.headings[1], errs: p.errors.length})),
                    addOnRound: out.addOnRound,
                });
                record(`${RUN}-review-${who}-summary`, out);
            }
        });

        // ------------------------------------------------ author: L72b, L146b
        if (on('author') && !isOPS) await sect('author', async () => {
            await as('au');
            const out = {};
            out.landing = await view(awf(subs.R.id), 'author-landing');
            out.pressed = [];
            for (let i = 1; i <= 3; i++) out.pressed.push(await pressEntry(REVIEW, `author-entry-pressed-${i}`));
            out.typed = [];
            for (let i = 1; i <= 3; i++) out.typed.push(await view(awf(subs.R.id, 'workflow_3'), `author-entry-typed-${i}`));
            out.round = await view(awf(subs.R.id, rkey()), 'author-round-typed');
            out.roundPressed = await pressEntry('Review Round 1', 'author-round-pressed');
            fact('author', {
                landing: {url: out.landing.url.replace(/^.*\?/, '?'), headings: out.landing.headings, status: out.landing.statusBox, errs: out.landing.errors.length},
                pressed: out.pressed.map((p) => ({url: p.url, h: p.headings, status: p.statusBox && flat(p.statusBox.text, 90), primary: flat(p.primary, 120), tables: p.tables, menu: p.menu.join(' / '), errs: p.errors.map((e) => flat(e.pageerror || e.console, 140))})),
                typed: out.typed.map((p) => ({h: p.headings, status: p.statusBox && flat(p.statusBox.text, 90), primary: flat(p.primary, 120), tables: p.tables, errs: p.errors.map((e) => flat(e.pageerror || e.console, 140))})),
                round: {h: out.round.headings, status: out.round.statusBox && flat(out.round.statusBox.text, 90), tables: out.round.tables, errs: out.round.errors.length},
                roundPressed: {url: out.roundPressed.url, h: out.roundPressed.headings, errs: out.roundPressed.errors.length},
            });
            record(`${RUN}-author-summary`, out);
        });

        // ------------------------------------------------ noacc: L99, L46b
        if (on('noacc')) await sect('noacc', async () => {
            const target = isOPS ? subs.P.id : subs.C.id;
            const out = {};
            await as('se');
            // the dashboard address, read at 0.3 / 1 / 3 / 6 s after the load event
            const e0 = errs.length; const r0 = resp.length;
            const t0 = Date.now();
            const r = await page.goto(wf(target));
            out.dashStatus = r && r.status();
            out.timeline = [];
            for (const ms of [300, 1000, 3000, 6000]) {
                const wait = ms - (Date.now() - t0);
                if (wait > 0) await page.waitForTimeout(wait);
                const ds = await dialogs(page);
                const info = await wfInfo(page);
                out.timeline.push({atMs: Date.now() - t0, panel: info.panel, header: flat(info.headerText, 120), headerButtons: info.headerButtons, dialogs: ds.map((d) => ({name: d.name, text: flat(d.text, 160)}))});
            }
            await idle(page);
            out.dash = await snap(page, 'noacc-se-dash', {timeline: out.timeline}).then((s) => ({url: s.url, dialog: flat(s.text && s.text.dialog, 200)}));
            out.dashResponses = resp.slice(r0).filter((x) => x.status >= 400);
            const ok = page.getByRole('button', {name: 'OK', exact: true});
            await loc(page, 'the "Error" dialog\'s "OK"', ok);
            if (await ok.count()) { await ok.first().click(); await page.waitForTimeout(1000); await idle(page); }
            const after = await wfInfo(page);
            await snap(page, 'noacc-se-dash-after-ok', {info: after});
            out.afterOk = {headerText: flat(after.headerText, 200), headerButtons: after.headerButtons, h1: after.h1, menu: after.menu, dialogs: (await dialogs(page)).map((d) => flat(d.text, 120))};
            await loc(page, 'the shell header after "OK"', page.locator('[data-cy="sidemodal-header"]'));
            out.dashErrors = errs.slice(e0);
            // the list behind: which view
            out.listUrl = page.url().replace(/^https?:\/\/[^/]+/, '');
            // the older address
            const e1 = errs.length; const r1 = resp.length;
            const t1 = Date.now();
            const ra = await page.goto(ctxUrl(`/workflow/access/${target}`));
            out.accessStatus = ra && ra.status();
            out.accessTimeline = [];
            for (const ms of [300, 1000, 3000, 6000]) {
                const wait = ms - (Date.now() - t1);
                if (wait > 0) await page.waitForTimeout(wait);
                const ds = await dialogs(page);
                out.accessTimeline.push({atMs: Date.now() - t1, url: page.url().replace(/^https?:\/\/[^/]+/, ''), dialogs: ds.map((d) => ({name: d.name, text: flat(d.text, 160)}))});
            }
            await idle(page);
            const sa = await snap(page, 'noacc-se-access');
            out.access = {url: sa.url, title: sa.title, main: flat(sa.text && sa.text.main, 300), dialog: flat(sa.text && sa.text.dialog, 200), responses: resp.slice(r1).filter((x) => x.status >= 400), errors: errs.slice(e1)};
            // the stage-numbered and a stage-word form, as a further door
            const ri = await page.goto(ctxUrl(`/workflow/index/${target}/${isOPS ? 5 : 4}`)); await idle(page);
            const si = await snap(page, 'noacc-se-index');
            out.index = {status: ri && ri.status(), url: si.url, main: flat(si.text && si.text.main, 200)};
            fact('noacc-se', out);

            // L46b (1): the assigned copyeditor on C selecting a stage outside the stage set
            if (!isOPS) {
                await as('ce');
                const o = {};
                o.landing = await view(wf(subs.C.id), 'noacc-ce-landing');
                o.submission = await pressEntry('Submission', 'noacc-ce-submission');
                o.review = await pressEntry(REVIEW, 'noacc-ce-review');
                o.copyediting = await pressEntry('Copyediting', 'noacc-ce-copyediting');
                o.submission2 = await pressEntry('Submission', 'noacc-ce-submission-2');
                // "Preview" from the no-access view
                const pv = page.locator('[data-cy="sidemodal-header"]').getByRole('button', {name: 'Preview', exact: true});
                await loc(page, 'header "Preview" on the no-access view', pv);
                const pages0 = page.context().pages().length;
                if (await pv.count()) {
                    await pv.click(); await page.waitForLoadState('load').catch(() => {}); await idle(page); await page.waitForTimeout(800);
                    const sp = await snap(page, 'noacc-ce-preview');
                    o.preview = {url: sp.url, sameTab: page.context().pages().length === pages0, notice: /This is a preview and has not been published\./.test((sp.text && sp.text.main) || JSON.stringify(sp.aria || ''))};
                }
                // the editor's header on the same stage entries, as the control
                await as('ed');
                o.edLanding = await view(wf(subs.C.id), 'noacc-ed-landing');
                o.edSubmission = await pressEntry('Submission', 'noacc-ed-submission');
                const pick = (x) => x && {url: x.url, headings: (x.headings || []).slice(0, 2), headerButtons: x.headerButtons, primary: flat(x.primary, 120), status: x.statusBox && flat(x.statusBox.text, 90)};
                fact('noacc-ce', {landing: pick(o.landing), submission: pick(o.submission), review: pick(o.review), copyediting: pick(o.copyediting), submission2: pick(o.submission2), preview: o.preview, edLanding: pick(o.edLanding), edSubmission: pick(o.edSubmission)});
                // the unassigned se on R (a Review-stage submission: no Preview expected) as a second read of the shell
                await as('se');
                const rr = await view(wf(subs.R.id), 'noacc-se-dash-R', {});
                await page.waitForTimeout(2500);
                const ds = await dialogs(page);
                const okR = page.getByRole('button', {name: 'OK', exact: true});
                if (await okR.count()) { await okR.first().click(); await page.waitForTimeout(900); await idle(page); }
                const afterR = await wfInfo(page);
                await snap(page, 'noacc-se-dash-R-after-ok', {info: afterR});
                fact('noacc-se-R', {dialogs: ds.map((d) => flat(d.text, 140)), afterOk: {headerText: flat(afterR.headerText, 160), headerButtons: afterR.headerButtons}, bad: rr.bad});
            }
        });

        // ------------------------------------------------ noid: L145
        if (on('noid')) await sect('noid', async () => {
            const words = ['submission', 'externalReview', 'editorial', 'production', 'internalReview', 'access', 'index'];
            const who = isOPS ? ['mgr', 'se2', 'au'] : ['mgr', 'ed', 'se2', 'au'];
            const out = {};
            for (const w of who) {
                await as(w);
                for (const word of words) {
                    const e0 = errs.length;
                    const r = await page.goto(ctxUrl(`/workflow/${word}`)).catch((e) => ({status: () => `nav error ${String(e.message).slice(0, 80)}`}));
                    await idle(page).catch(() => {});
                    const s = await snap(page, `noid-${w}-${word}`, {httpStatus: r && r.status()});
                    out[`${w} ${word}`] = {status: r && r.status(), url: s.url.replace(/^https?:\/\/[^/]+/, ''), title: s.title, text: flat((s.text && s.text.main) || JSON.stringify(s.aria || '').slice(0, 300), 160), errs: errs.slice(e0).length};
                }
            }
            // controls with a number, as mgr
            await as('mgr');
            const id = isOPS ? subs.P.id : subs.C.id;
            for (const word of ['submission', 'externalReview', 'editorial', 'production', ...(isOMP ? ['internalReview'] : [])]) {
                const r = await page.goto(ctxUrl(`/workflow/${word}/${id}`)); await settle();
                const s = await snap(page, `noid-mgr-${word}-withid`, {httpStatus: r && r.status()});
                out[`mgr ${word}/${id}`] = {status: r && r.status(), url: s.url.replace(/^https?:\/\/[^/]+/, '')};
            }
            fact('noid', out);
        });
        // ------------------------------------------------ opsw: OPS stage-naming addresses for stages it has not
        if (on('opsw') && isOPS) await sect('opsw', async () => {
            const id = subs.P.id;
            const paths = ['submission', 'externalReview', 'editorial', 'production', 'internalReview'].map((w) => `/workflow/${w}/${id}`)
                .concat([1, 3, 4, 5].map((n) => `/workflow/index/${id}/${n}`), [`/workflow/access/${id}`]);
            const out = {};
            for (const w of ['mgr', 'se2', 'au']) {
                await as(w);
                for (const p of paths) {
                    const r = await page.goto(ctxUrl(p)); await idle(page);
                    if (/dashboard/.test(page.url())) await settle();
                    const s = await snap(page, `opsw-${w}-${p.replace(/\//g, '-').replace(/^-/, '')}`, {httpStatus: r && r.status()});
                    const m = (s.text && s.text.main) || '';
                    out[`${w} ${p}`] = {status: r && r.status(), url: s.url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/index.php\/[^/]+/, ''), says: flat(m.split('Home /').pop(), 90)};
                }
            }
            fact('opsw', out);
        });
        // ------------------------------------------------ a5: A5's own addresses, as the manager
        if (on('a5')) await sect('a5', async () => {
            const id = isOPS ? subs.P.id : subs.C.id;
            const out = {};
            await as('mgr');
            for (const p of [`/workflow/index/${id}`, `/workflow/index/${id}/9`, `/workflow/index/${id}/${isOPS ? 5 : 4}`]) {
                const r = await page.goto(ctxUrl(p)); await idle(page);
                if (/dashboard/.test(page.url())) await settle();
                const s = await snap(page, `a5-mgr-${p.replace(/\//g, '-').replace(/^-/, '')}`, {httpStatus: r && r.status()});
                out[p.replace(String(id), '{id}')] = {status: r && r.status(), url: s.url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/index.php\/[^/]+/, '').replace(String(id), '{id}'), title: s.title, main: flat((s.text && s.text.main) || '', 80)};
            }
            fact('a5', out);
        });
    } finally {
        record(`${RUN}-facts`, {facts, errs, badResponses: resp.filter((x) => x.status >= 400), browserDialogs});
        await close();
    }
});
