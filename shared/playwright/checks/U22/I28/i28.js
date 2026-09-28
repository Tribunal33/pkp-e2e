// U22 claim check, chunk I28 (housekeeping 2026-09-28): the incidental rows for My Submissions.
// Chunk: .reports/hk28/chunks/U22.md — L48 (a stale "Copyedited Files Uploaded" count after the file is deleted),
// L116b (inactive and editor-only sections in an Author's "Filters" › "Section"), and the U23 claim check's landing
// observation (a Site Administrator whose only role in the journal is Reader lands on the journal home).
// Spec: docs/specs/U22-my-submissions.md — Rule 3 "Landing" (fn-c), Rule 5 "Search and filters" (fn-j, A4, OMP1),
// Rule 7c "Copyediting" (fn-f), Rule 10 "Counts stay current".
//
//   PROBE_FEATURE=U22 PROBE_AGENT=ccI28 RUN=1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U22/I28/i28.js
//   PHASES=landing,copyed,sections (default: all three). RUN names the facts file (i28-facts-run<RUN>) and prefixes
//   every snapshot (r<RUN>-…), so two runs sit side by side; every run seeds its own scratch contexts (tag prefix
//   u22i28); state in i28-state-r<RUN>-<app>.json (RESEED=1 for a fresh seed).
//
// Scratch contexts per app and run:
//   LA  admin seeded with Author beside the auto-enrolled manager role; mg (manager), au (author-only control);
//       one submission by au, one by admin. The admin's manager role is ended on its own Users & Roles › Edit page
//       ("Remove Role"), then admin signs in again at the journal's login page: where it lands, what it gets there.
//   LR  the same with Reader in place of Author (the U23 observation, re-driven as the other end).
//   C   (OJS, OMP) mg, se (Section/Series editor, assigned), au; one submission at Copyediting through review. se
//       uploads one file to "Copyedited Files" on screen; au reads its My Submissions row, opens "View"; se (another
//       browser) deletes the file; au reads the row behind the panel, after "Close", after a reload. Then the same
//       with au on the list without the panel open. se's own editorial list row is read the same way (control).
//   S3  (OJS, OPS) sections "Active", "Inactive", "EdOnly", one submission by au in each; on screen "Inactive"
//       marked inactive and "EdOnly" editor-only. au: My Submissions › Filters › "Section"; each option applied.
//       mg: the dashboard's Filters (control).
//   S2  (OJS, OPS) sections "Open" and "Shut" ("Shut" marked inactive on screen): does the author get "Section"?
//   S1  (OJS, OPS) the one default section: the author's panel (the other end of the section count).
//   P   (OMP) a press with three series: the author's and the manager's Filters (Rule 5's series control, OMP1).
// publicknowledge is read only: author.alex's My Submissions Filters on every app.
// No assertions: the script records, the reader judges.
'use strict';

const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const MD = path.join(REPO, 'apps/ojs/playwright/fixtures/files/notes.md');
const T = 30_000;
const RUN = process.env.RUN || '1';
const PHASES = (process.env.PHASES || 'landing,copyed,sections').split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[i28 r${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const statePath = path.join(outDir(), `i28-state-r${RUN}-${app.name}.json`);
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i28-facts-run${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '').replace(/csrfToken=[^&]+/, '');
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const u = (p, k, roles, g, fam) => ({username: `${p}${k}`, roles, givenName: g, familyName: fam});

    await app.api.bootstrapProbe(app.contextPath);

    // One browser = one person. Each carries its own traffic, page errors and JS dialogs.
    async function person(label) {
        const b = await launch(app);
        const P = {label, page: b.page, close: b.close, traffic: [], errors: [], dialogs: []};
        P.page.on('dialog', (d) => { P.dialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300), url: strip(P.page.url())}); d.accept().catch(() => {}); });
        P.page.context().on('response', (r) => {
            const url = r.url();
            if (r.status() >= 400 || /\/api\/v1\//.test(url)) P.traffic.push({at: Date.now(), m: r.request().method(), s: r.status(), u: strip(url).replace(/^\/index\.php\//, '')});
        });
        P.page.on('pageerror', (e) => P.errors.push({at: Date.now(), msg: flat(e.message, 300)}));
        P.since = (t0) => P.traffic.filter((x) => x.at >= t0 && !/_i18n/.test(x.u)).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 200)}`);
        P.bad = (t0 = 0) => P.traffic.filter((x) => x.at >= t0 && x.s >= 400).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 200)}`);
        P.errs = (t0 = 0) => P.errors.filter((e) => e.at >= t0).map((e) => e.msg);
        P.as = async (user, ctx) => { await signIn(P.page, user, ctx ? {contextPath: ctx} : {}); await idle(P.page).catch(() => {}); };
        P.go = async (url) => {
            const r = await P.page.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)}));
            await idle(P.page).catch(() => {});
            return r && typeof r.status === 'function' ? r.status() : (r && r.err) || null;
        };
        P.snap = async (name, extra = {}, {png = false} = {}) => {
            let s;
            try { s = await screen(P.page); } catch (e) { s = {url: P.page.url(), error: String(e.message).slice(0, 200)}; }
            Object.assign(s, extra);
            record(`r${RUN}-${name}`, s);
            if (png) await shot(P.page, `r${RUN}-${name}`).catch(() => {});
            return s;
        };
        return P;
    }
    async function sect(name, fn) {
        log(`== ${name}`);
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
            return null;
        }
    }

    // The list page as data (main only, never the dialog): heading, sidebar, the rows' text.
    async function readList(page) {
        return page.evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const main = document.querySelector('main') || document.body;
            const rows = [...main.querySelectorAll('table tbody tr')].filter((tr) => !tr.closest('[role=dialog]')).map((tr) => t(tr.innerText).slice(0, 220));
            const nav = document.querySelector('#app-nav');
            const dlg = [...document.querySelectorAll('[role=dialog]')].filter((d) => d.getClientRects().length);
            return {url: location.pathname + location.search, h1: t((main.querySelector('h1') || {}).innerText), rows,
                sideNav: nav ? t(nav.innerText).slice(0, 900) : null, dialogOpen: dlg.length, dialogHead: dlg.length ? t(dlg[dlg.length - 1].innerText).slice(0, 200) : null};
        });
    }
    // The row for a title, read by CSS (a role read behind an open dialog returns nothing, patterns pitfall 6).
    async function rowText(page, title) {
        return page.evaluate((title) => {
            const main = document.querySelector('main') || document.body;
            const tr = [...main.querySelectorAll('table tbody tr')].filter((x) => !x.closest('[role=dialog]')).find((x) => x.innerText.includes(title));
            return tr ? tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 260) : null;
        }, title).catch((e) => `err ${String(e.message).slice(0, 80)}`);
    }
    // The row over time: 0.5 s, 2 s, 6 s after an action.
    async function rowOverTime(page, title) {
        const out = [];
        for (const ms of [500, 1500, 4000]) { await sleep(ms); out.push({at: out.length ? [500, 2000, 6000][out.length] : 500, row: await rowText(page, title)}); }
        return out;
    }

    // The Filters window as data: every field's label and its options (checkboxes), the slider.
    const filtersWin = (page) => page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Apply Filters', exact: true})}).last();
    async function openFilters(page) {
        const btn = page.locator('main').first().getByRole('button', {name: 'Filters', exact: true}).first();
        await btn.waitFor({timeout: T}).catch(() => {});
        if (!(await btn.count())) return false;
        await btn.click();
        await filtersWin(page).getByRole('button', {name: 'Apply Filters', exact: true}).waitFor({timeout: T});
        await idle(page); await sleep(700);
        return true;
    }
    async function readFilters(page) {
        return filtersWin(page).evaluate((d) => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            const sets = [...d.querySelectorAll('fieldset, .pkpFormField')].filter(vis).map((f) => ({
                label: t((f.querySelector('legend, .pkpFormFieldLabel, label') || {}).innerText),
                options: [...f.querySelectorAll('input[type=checkbox]')].map((b) => ({label: t((b.closest('label') || b.parentElement).innerText), checked: b.checked})),
            })).filter((x) => x.options.length);
            return {labels: [...d.querySelectorAll('legend, .pkpFormFieldLabel')].filter(vis).map((x) => t(x.innerText)),
                buttons: [...d.querySelectorAll('button')].filter(vis).map((b) => t(b.innerText || b.getAttribute('aria-label'))).filter(Boolean), sets};
        });
    }
    async function closeFilters(page) {
        await filtersWin(page).getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(700); await idle(page).catch(() => {});
    }
    async function filtersAt(P, url, name) {
        if (url) await P.go(url);
        await sleep(500);
        const t0 = Date.now();
        const list = await readList(P.page);
        if (!(await openFilters(P.page))) { await P.snap(name, {list, filters: null}); return {list, filters: null}; }
        const f = await readFilters(P.page);
        await P.snap(name, {list, filters: f});
        await closeFilters(P.page);
        return {list, filters: f, traffic: P.since(t0), bad: P.bad(t0), pageErrors: P.errs(t0)};
    }

    try {
        // ============================================================ landing (Rule 3, fn-c; U23-I28)
        if (on('landing')) await sect('landing', async () => {
            const P = await person('admin');
            const out = {};
            try {
                for (const [key, role] of [['LA', 'author'], ['LR', 'reader']]) {
                    const o = {role};
                    if (!S[key]) {
                        const t = tag(`u22i28${key.toLowerCase()}`);
                        const users = [u(t, 'mg', ['manager'], 'Mara', 'Manager'), u(t, 'au', ['author'], 'Ada', 'Author'), {username: 'admin', roles: [role]}];
                        const c = await app.api.createContext({tag: t, context: {name: `U22 I28 ${key} ${t}`, acronym: 'U22I28', contactName: 'I28 Contact', contactEmail: `${t}c@mail.test`}, users});
                        S[key] = {tag: t, path: c.path || t, subs: []};
                        S[key].subs.push(await app.api.createSubmission({tag: `${t}a`, context: S[key].path, submitter: `${t}au`, title: `By Ada ${t}`}));
                        if (role === 'author') {
                            try { S[key].subs.push(await app.api.createSubmission({tag: `${t}b`, context: S[key].path, submitter: 'admin', title: `By admin ${t}`})); } catch (e) { S[key].adminSubError = String(e.message).slice(0, 300); }
                        }
                        save();
                    }
                    const C = S[key].path;
                    o.ctx = C;
                    // control: still a Journal Manager here
                    await P.as('admin', C);
                    o.controlLanding = strip(P.page.url());
                    await P.snap(`l-${key}01-admin-manager-landing`);
                    // end the manager role on the admin's own Users & Roles › Edit page
                    const rem = {};
                    await P.go(cu(C, '/en/management/settings/access'));
                    const table = P.page.locator('table').filter({hasText: /\badmin\b/}).first();
                    await table.waitFor({state: 'visible', timeout: T}).catch(() => {});
                    const adminRow = table.locator('tr').filter({hasText: /\badmin\b/}).first();
                    await adminRow.locator('button').last().click().catch(() => {}); await idle(P.page);
                    await P.page.getByRole('menuitem', {name: /^Edit$/}).first().click().catch(() => {});
                    await P.page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T}).catch(() => {});
                    await idle(P.page);
                    const removeBtn = P.page.getByRole('button', {name: /Remove Role/i});
                    await removeBtn.first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
                    rem.rolesBefore = await P.page.locator('tr').filter({has: removeBtn}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
                    const roleRow = P.page.locator('tr').filter({hasText: /manager/i}).filter({has: removeBtn}).first();
                    if (await roleRow.count()) {
                        await roleRow.getByRole('button', {name: /Remove Role/i}).click(); await idle(P.page);
                        const dlg = P.page.locator('[role="dialog"]:visible').filter({hasText: /Remove Role/i}).last();
                        await dlg.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
                        const t0 = Date.now();
                        await dlg.getByRole('button', {name: /^Remove Role$/i}).click().catch(() => {});
                        await idle(P.page); await sleep(1200);
                        rem.traffic = P.since(t0);
                    } else rem.noManagerRow = true;
                    rem.rolesAfter = await P.page.locator('tr').filter({has: removeBtn}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
                    await P.snap(`l-${key}02-admin-roles-after-remove`);
                    o.remove = rem;
                    // a fresh sign-in at the journal's own login page
                    await signOut(P.page).catch(() => {});
                    let t0 = Date.now();
                    await P.as('admin', C);
                    await sleep(1500); await idle(P.page).catch(() => {});
                    o.freshLanding = strip(P.page.url());
                    const s = await P.snap(`l-${key}03-admin-fresh-landing`, {}, {png: true});
                    o.freshH1 = flat(await P.page.locator('main h1, h1').first().innerText({timeout: 3000}).catch(() => null), 160);
                    o.freshList = await readList(P.page).catch(() => null);
                    o.freshTraffic = P.since(t0); o.freshBad = P.bad(t0); o.freshErrors = P.errs(t0);
                    o.freshDialogOpen = flat(s && s.text && s.text.dialog, 300);
                    // My Submissions by its address, and the Filters panel there (A4 sweep: "Assigned To Editor"?)
                    t0 = Date.now();
                    o.mySubmissions = await filtersAt(P, cu(C, '/en/dashboard/mySubmissions'), `l-${key}04-admin-mysubmissions-filters`);
                    o.mySubmissions.bad = P.bad(t0);
                    await loc(P.page, `My Submissions (admin, ${key}, no manager role): heading`, P.page.locator('main h1').first());
                    // the retired submission-list address
                    t0 = Date.now();
                    await P.go(cu(C, '/en/submissions'));
                    await sleep(800);
                    o.retired = {url: strip(P.page.url()), bad: P.bad(t0)};
                    await P.snap(`l-${key}05-admin-retired-address`);
                    // the site-wide login page, for the other end of "journal's own login page"
                    await signOut(P.page).catch(() => {});
                    await P.as('admin');
                    o.siteLoginLanding = strip(P.page.url());
                    await P.snap(`l-${key}06-admin-site-login-landing`);
                    // control: the author-only account of the same journal
                    await signOut(P.page).catch(() => {});
                    await P.as(`${S[key].tag}au`, C);
                    o.authorOnlyLanding = strip(P.page.url());
                    await P.snap(`l-${key}07-authoronly-landing`);
                    await signOut(P.page).catch(() => {});
                    o.dialogs = P.dialogs.slice();
                    out[key] = o;
                }
                out.crashes = P.traffic.filter((x) => x.s >= 500).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 160)}`);
                out.pageErrors = P.errs();
                fact('landing', out);
            } finally { save(); await P.close(); }
        });

        // ============================================================ copyed (Rule 7c, Rule 10; L48) — OJS, OMP
        if (on('copyed') && !isOPS) await sect('copyed', async () => {
            if (!S.C) {
                const t = tag('u22i28c');
                const users = [u(t, 'mg', ['manager'], 'Mara', 'Manager'), u(t, 'se', ['sectionEditor'], 'Sid', 'Section'), u(t, 'au', ['author'], 'Ada', 'Author')];
                const c = await app.api.createContext({tag: t, context: {name: `U22 I28 C ${t}`, acronym: 'U22I28', contactName: 'I28 Contact', contactEmail: `${t}c@mail.test`}, users});
                S.C = {tag: t, path: c.path || t};
                const viaReview = isOMP ? ['skipInternalReview', 'accept'] : ['sendExternalReview', 'accept'];
                S.C.title = `Copyedit count ${t}`;
                const r = await app.api.createSubmission({tag: `${t}n`, context: S.C.path, submitter: `${t}au`, title: S.C.title, decisions: viaReview, participants: [{username: `${t}se`, role: 'sectionEditor'}]});
                S.C.sub = r.submissionId; S.C.stageId = r.stageId;
                save();
            }
            const C = S.C.path, N = S.C.sub, title = S.C.title, t = S.C.tag;
            const E = await person('editor');
            const A = await person('author');
            const out = {sub: N, stageId: S.C.stageId};
            const wf = (id, key) => cu(C, `/en/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
            const topWin = (page) => page.locator('[role="dialog"]:visible').last();
            const md = path.basename(MD);
            async function waitWindow(page) {
                await topWin(page).waitFor({timeout: T});
                await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.offsetParent !== null).pop(); return d && !/Loading/.test(d.innerText) && d.innerText.length > 20; }, null, {timeout: 20000}).catch(() => {});
                await idle(page);
            }
            async function openWf(P, label) {
                await P.go(wf(N, 'workflow_4'));
                await P.page.locator('[role="dialog"]:visible').first().waitFor({timeout: T}).catch(() => {});
                await P.page.getByRole('table', {name: 'Copyedited Files', exact: true}).waitFor({timeout: T}).catch(() => {});
                await idle(P.page); await sleep(600);
                return P.snap(label);
            }
            async function copyeditedRows(page) {
                return page.getByRole('table', {name: 'Copyedited Files', exact: true}).locator('tbody tr').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 160))).catch(() => null);
            }
            // K2's upload idiom: "Upload/Select Files" on "Copyedited Files" (the second such button), the file wizard, OK.
            async function upload(P, label) {
                const page = P.page;
                const t0 = Date.now();
                await page.getByRole('button', {name: 'Upload/Select Files', exact: true}).nth(1).click(); await idle(page);
                await waitWindow(page);
                const win = topWin(page);
                let up = win.getByRole('link', {name: /Upload|Add/}).first();
                if (!(await up.count())) up = win.getByRole('button', {name: /Upload|Add/}).first();
                await up.click(); await idle(page);
                const wiz = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
                await wiz.waitFor({timeout: T});
                await wiz.locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
                const genre = wiz.locator('select[id^="genreId"]');
                if (await genre.count()) {
                    const opts = await genre.locator('option').evaluateAll((els) => els.map((o) => ({text: o.text.trim(), value: o.value})));
                    const pick = opts.find((o) => o.value && !/^(Select|Choose)/i.test(o.text));
                    if (pick) await genre.selectOption(pick.value);
                }
                await wiz.locator('input[type="file"]').setInputFiles(MD);
                await wiz.getByRole('button', {name: 'Continue', exact: true}).waitFor({timeout: T}); await idle(page);
                await wiz.getByRole('button', {name: 'Continue', exact: true}).click(); await idle(page);
                await wiz.getByRole('tab', {name: /2\./}).waitFor({timeout: T}).catch(() => {});
                await wiz.getByRole('button', {name: 'Continue', exact: true}).click(); await idle(page);
                await wiz.getByRole('button', {name: 'Complete', exact: true}).waitFor({timeout: T});
                await wiz.getByRole('button', {name: 'Complete', exact: true}).click(); await idle(page);
                await wiz.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await topWin(page).locator(`tr:has-text("${md}") input[type=checkbox]:checked`).first().waitFor({timeout: 15000}).catch(() => {});
                await sleep(800); await idle(page);
                await topWin(page).getByRole('button', {name: /^(OK|Save)$/}).last().click(); await idle(page);
                await page.waitForFunction(() => [...document.querySelectorAll('[role=dialog]')].filter((e) => e.offsetParent !== null).length <= 1, null, {timeout: 15000}).catch(() => {});
                await sleep(800); await idle(page);
                const rows = await copyeditedRows(page);
                await P.snap(`${label}-after-upload`, {copyedited: rows});
                return {rows, bad: P.bad(t0), errors: P.errs(t0), traffic: P.since(t0)};
            }
            async function del(P, label) {
                const page = P.page;
                const t0 = Date.now();
                const row = page.getByRole('table', {name: 'Copyedited Files', exact: true}).locator('tbody tr').filter({hasText: md}).first();
                await row.getByRole('button', {name: /More Actions/}).first().click(); await idle(page);
                await page.getByRole('menuitem', {name: 'Delete', exact: true}).first().click(); await idle(page);
                await sleep(600); await idle(page);
                const conf = topWin(page);
                const confText = flat(await conf.innerText().catch(() => ''), 300);
                const ok = conf.getByRole('button', {name: /^(OK|Delete|Yes)$/}).first();
                if (await ok.count()) { await ok.click(); await idle(page); }
                await sleep(1000); await idle(page);
                const rows = await copyeditedRows(page);
                await P.snap(`${label}-after-delete`, {copyedited: rows, confText});
                return {confText, rows, bad: P.bad(t0), errors: P.errs(t0), traffic: P.since(t0)};
            }
            const listUrl = cu(C, '/en/dashboard/mySubmissions');
            try {
                await E.as(`${t}se`, C);
                await A.as(`${t}au`, C);
                // author, before any copyedited file: the 0 end of the count
                await A.go(listUrl); await sleep(800);
                out.author0 = {row: await rowText(A.page, title)};
                await A.snap('c01-author-list-before-upload', {row: out.author0.row});
                // --- leg 1: the author has the panel open while the editor deletes
                await openWf(E, 'c02-editor-workflow-before-upload');
                out.upload1 = await upload(E, 'c03-editor');
                // the editor's own list behind its panel right after the upload, then re-landed (the list loads with the file)
                out.editorBehindAfterUpload = await rowText(E.page, title);
                await openWf(E, 'c03b-editor-workflow-relanded-after-upload');
                out.editorBehindRelanded = await rowText(E.page, title);
                await A.go(listUrl); await sleep(800);
                out.author1 = {row: await rowText(A.page, title)};
                await A.snap('c04-author-list-after-upload', {row: out.author1.row}, {png: true});
                const aRow = A.page.getByRole('row').filter({hasText: title}).first();
                await loc(A.page, 'My Submissions row: Editorial Activity cell (nth 2) at Copyediting', aRow.getByRole('cell').nth(2));
                await loc(A.page, 'My Submissions row: "View"', aRow.getByRole('button', {name: 'View', exact: true}));
                let t0 = Date.now();
                await aRow.getByRole('button', {name: 'View', exact: true}).click();
                await A.page.getByRole('heading', {name: /^Workflow:/}).first().waitFor({timeout: T}).catch(() => {});
                await idle(A.page); await sleep(800);
                out.authorPanelUrl = strip(A.page.url());
                await A.snap('c05-author-panel-open', {}, {png: true});
                // editor deletes the file
                out.delete1 = await del(E, 'c06-editor');
                // author: the row behind the open panel, then "Close", then a reload
                await sleep(1500);
                out.author2behindPanel = await rowText(A.page, title);
                await A.snap('c07-author-behind-panel-after-delete', {row: out.author2behindPanel});
                t0 = Date.now();
                const closeBtn = A.page.getByRole('dialog').filter({has: A.page.getByRole('heading', {name: /^Workflow:/})}).getByRole('button', {name: 'Close', exact: true}).first();
                await loc(A.page, 'Workflow panel (author): "Close"', closeBtn);
                await closeBtn.click();
                await A.page.getByRole('heading', {name: /^Workflow:/}).first().waitFor({state: 'hidden', timeout: T}).catch(() => {});
                out.author3afterClose = await rowOverTime(A.page, title);
                out.author3traffic = A.since(t0);
                out.author3url = strip(A.page.url());
                await A.snap('c08-author-after-close', {row: out.author3afterClose}, {png: true});
                t0 = Date.now();
                await A.go(A.page.url()); await sleep(800);
                out.author4afterReload = await rowText(A.page, title);
                await A.snap('c09-author-after-reload', {row: out.author4afterReload});
                // --- the editor's own list behind its panel (the deleter's page): behind, after Close, after reload
                out.editorBehindPanel = await rowText(E.page, title);
                await E.snap('c10-editor-behind-panel-after-delete', {row: out.editorBehindPanel});
                t0 = Date.now();
                const eClose = E.page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Close', exact: true}).first();
                await eClose.click().catch(() => {});
                await sleep(300);
                out.editorAfterClose = await rowOverTime(E.page, title);
                out.editorAfterCloseTraffic = E.since(t0);
                await E.snap('c11-editor-after-close', {row: out.editorAfterClose});
                await E.go(E.page.url()); await sleep(800);
                out.editorAfterReload = await rowText(E.page, title);
                out.editorListUrl = strip(E.page.url());
                await E.snap('c12-editor-after-reload', {row: out.editorAfterReload});
                // --- leg 2: the author on the list with no panel open while the editor uploads and deletes again
                await openWf(E, 'c13-editor-workflow-leg2');
                out.upload2 = await upload(E, 'c14-editor');
                await A.go(listUrl); await sleep(800);
                out.leg2before = await rowText(A.page, title);
                await A.snap('c15-author-list-leg2-before-delete', {row: out.leg2before});
                out.delete2 = await del(E, 'c16-editor');
                await sleep(3000);
                out.leg2samePage = await rowText(A.page, title);
                // the sidebar's "Active submissions" pressed (the view already open), then a reload
                t0 = Date.now();
                const active = A.page.locator('#app-nav a').filter({has: A.page.getByText('Active submissions', {exact: true})}).first();
                await active.click().catch(() => {});
                out.leg2afterSidebar = await rowOverTime(A.page, title);
                out.leg2afterSidebarTraffic = A.since(t0);
                await A.snap('c17-author-leg2-after-sidebar', {row: out.leg2afterSidebar});
                await A.go(listUrl); await sleep(800);
                out.leg2afterReload = await rowText(A.page, title);
                await A.snap('c18-author-leg2-after-reload', {row: out.leg2afterReload});
                out.crashes = [...E.traffic, ...A.traffic].filter((x) => x.s >= 500).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 160)}`);
                out.bad = {editor: E.bad(), author: A.bad()};
                out.pageErrors = {editor: E.errs(), author: A.errs()};
                out.dialogs = {editor: E.dialogs, author: A.dialogs};
                fact('copyed', out);
            } finally { save(); await E.close(); await A.close(); }
        });

        // ============================================================ sections (Rule 5, fn-j, OMP1; L116b)
        if (on('sections')) await sect('sections', async () => {
            const P = await person('sections');
            const out = {};
            const GRIDSEL = '#sectionsGridContainer', FORMSEL = 'form#sectionForm';
            const grid = () => P.page.locator(GRIDSEL).first();
            const form = () => P.page.locator(FORMSEL).first();
            const top = () => P.page.locator('[role="dialog"]:visible').last();
            async function openTab(ctx) {
                await P.go(cu(ctx, '/en/management/settings/context'));
                await P.page.getByRole('tab', {name: 'Sections', exact: true}).first().click(); await idle(P.page);
                await grid().waitFor({timeout: T});
                await grid().locator('tr.gridRow, tbody.empty').first().waitFor({state: 'attached', timeout: T}).catch(() => {});
                await sleep(500);
            }
            const gridTitles = async () => grid().locator('tbody:not(.empty) tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
                const c = tr.querySelectorAll('td');
                const box = tr.querySelector('input[type=checkbox]');
                return {title: (c[0] ? c[0].innerText : '').replace(/\s+/g, ' ').replace(/^Settings\s*/, '').trim(), inactive: box ? box.checked : null};
            }));
            async function tickBox(title, rx, label) {
                const row = grid().locator('tr.gridRow').filter({hasText: title}).first();
                const tog = row.locator('a.show_extras');
                if (await tog.count()) { await tog.first().click(); await sleep(400); }
                const id = await row.getAttribute('id');
                await P.page.locator(`tr#${id} + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
                await form().locator('input[name^="title"]').first().waitFor({timeout: T});
                await idle(P.page); await sleep(800);
                await form().getByRole('checkbox', {name: rx}).first().check();
                const t0 = Date.now();
                const w = P.page.waitForResponse((r) => r.request().method() === 'POST' && /update-?section/i.test(r.url()), {timeout: T}).catch(() => null);
                await form().getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                await sleep(1200); await idle(P.page).catch(() => {});
                const open = await form().isVisible().catch(() => false);
                if (open) { await top().getByRole('button', {name: 'Close'}).first().click().catch(() => {}); await sleep(900); }
                const res = {post: r ? r.status() : null, windowOpen: open, bad: P.bad(t0)};
                await P.snap(label, {save: res});
                return res;
            }
            // Author: apply one Section option, read the list, then "Clear Filters".
            async function applyOption(label, name) {
                const t0 = Date.now();
                await openFilters(P.page);
                const box = filtersWin(P.page).getByRole('checkbox', {name: label, exact: true}).first();
                if (!(await box.count())) { await closeFilters(P.page); return {absent: true}; }
                await box.check();
                await filtersWin(P.page).getByRole('button', {name: 'Apply Filters', exact: true}).click();
                await idle(P.page); await sleep(1500);
                const list = await readList(P.page);
                await P.snap(name, {list});
                const o = {list, url: list.url, traffic: P.since(t0), bad: P.bad(t0), pageErrors: P.errs(t0)};
                // the active-filter chips above the list
                o.chips = flat(await P.page.locator('main').first().evaluate((m) => {
                    const b = [...m.querySelectorAll('button')].find((x) => /Clear Filters/.test(x.innerText));
                    return b ? b.parentElement.innerText : null;
                }).catch(() => null), 300);
                // the window's "Clear Filters", then its "Close" (nothing applied), read the list
                await openFilters(P.page);
                const clear = filtersWin(P.page).getByRole('button', {name: /Clear Filters/}).first();
                if (await clear.count()) { await clear.click(); await idle(P.page); await sleep(800); }
                o.windowAfterClear = await readFilters(P.page).catch(() => null);
                if (await filtersWin(P.page).isVisible().catch(() => false)) await closeFilters(P.page);
                o.afterWindowClearClose = await readList(P.page);
                // the list's own "Clear Filters" link
                const t1 = Date.now();
                const pageClear = P.page.locator('main').first().getByRole('button', {name: 'Clear Filters', exact: true}).first();
                if (await pageClear.count()) { await pageClear.click(); await idle(P.page); await sleep(1500); }
                o.afterPageClear = await readList(P.page);
                o.pageClearTraffic = P.since(t1);
                return o;
            }
            try {
                if (!isOMP) {
                    const sec = (abbrev, title) => ({abbrev, title, policy: `${title} policy`, ...(isOPS ? {path: abbrev.toLowerCase()} : {})});
                    const mk = async (key, sections) => {
                        const t = tag(`u22i28${key.toLowerCase()}`);
                        const c = await app.api.createContext({tag: t, context: {name: `U22 I28 ${key} ${t}`, acronym: 'U22I28', contactName: 'I28 Contact', contactEmail: `${t}c@mail.test`},
                            users: [u(t, 'mg', ['manager'], 'Mara', 'Manager'), u(t, 'au', ['author'], 'Ada', 'Author')], ...(sections ? {sections} : {})});
                        const o = {tag: t, path: c.path || t, subs: {}};
                        for (const s of sections || []) {
                            try {
                                const r = await app.api.createSubmission({tag: `${t}${s.abbrev.toLowerCase()}`, context: o.path, submitter: `${t}au`, title: `In ${s.title} ${t}`, section: s.abbrev});
                                o.subs[s.title] = r.submissionId;
                            } catch (e) { o.subs[s.title] = `error ${String(e.message).slice(0, 200)}`; }
                        }
                        return o;
                    };
                    if (!S.S3) { S.S3 = await mk('S3', [sec('ACT', 'Active'), sec('INA', 'Inactive'), sec('EDO', 'EdOnly')]); save(); }
                    if (!S.S2) { S.S2 = await mk('S2', [sec('OPN', 'Open'), sec('SHT', 'Shut')]); save(); }
                    if (!S.S1) { S.S1 = await mk('S1', null); save(); }
                    // on screen, as the manager: the section states
                    if (!S.setupDone) {
                        await P.as(`${S.S3.tag}mg`, S.S3.path);
                        await openTab(S.S3.path);
                        out.s3inactive = await tickBox('Inactive', /Mark this section as inactive/, 's01-s3-inactive-saved');
                        await openTab(S.S3.path);
                        out.s3edonly = await tickBox('EdOnly', /Items can only be submitted by/, 's02-s3-edonly-saved');
                        await openTab(S.S3.path);
                        out.s3grid = await gridTitles();
                        await P.snap('s03-s3-grid', {grid: out.s3grid});
                        await P.as(`${S.S2.tag}mg`, S.S2.path);
                        await openTab(S.S2.path);
                        out.s2shut = await tickBox('Shut', /Mark this section as inactive/, 's04-s2-shut-saved');
                        await openTab(S.S2.path);
                        out.s2grid = await gridTitles();
                        await P.snap('s05-s2-grid', {grid: out.s2grid});
                        S.setupDone = true; save();
                    }
                    // control: the manager's dashboard Filters on S3
                    await P.as(`${S.S3.tag}mg`, S.S3.path);
                    out.s3manager = await filtersAt(P, cu(S.S3.path, '/en/dashboard/editorial?currentViewId=active'), 's06-s3-manager-dashboard-filters');
                    // the author on S3: the panel, then each section applied
                    await P.as(`${S.S3.tag}au`, S.S3.path);
                    out.s3authorLanding = strip(P.page.url());
                    out.s3author = await filtersAt(P, cu(S.S3.path, '/en/dashboard/mySubmissions'), 's07-s3-author-filters');
                    await loc(P.page, 'My Submissions: "Filters"', P.page.locator('main').getByRole('button', {name: 'Filters', exact: true}));
                    await openFilters(P.page);
                    await loc(P.page, 'Filters window: "Section" option "EdOnly"', filtersWin(P.page).getByRole('checkbox', {name: 'EdOnly', exact: true}));
                    // leaving the window with a tick unapplied: "Close", then the list and the window again
                    const t0 = Date.now();
                    await filtersWin(P.page).getByRole('checkbox', {name: 'Active', exact: true}).first().check().catch(() => {});
                    await closeFilters(P.page);
                    out.s3closeUnapplied = {list: await readList(P.page), traffic: P.since(t0)};
                    await openFilters(P.page);
                    out.s3closeUnapplied.reopened = await readFilters(P.page);
                    await P.snap('s08-s3-author-filters-reopened-after-unapplied-close', {filters: out.s3closeUnapplied.reopened});
                    await closeFilters(P.page);
                    await P.go(cu(S.S3.path, '/en/dashboard/mySubmissions'));
                    out.s3apply = {};
                    for (const s of ['Active', 'Inactive', 'EdOnly']) out.s3apply[s] = await applyOption(s, `s09-s3-author-applied-${s.toLowerCase()}`);
                    // S2: one active and one inactive section
                    await P.as(`${S.S2.tag}au`, S.S2.path);
                    out.s2author = await filtersAt(P, cu(S.S2.path, '/en/dashboard/mySubmissions'), 's10-s2-author-filters');
                    out.s2applyShut = await applyOption('Shut', 's11-s2-author-applied-shut');
                    await P.as(`${S.S2.tag}mg`, S.S2.path);
                    out.s2manager = await filtersAt(P, cu(S.S2.path, '/en/dashboard/editorial?currentViewId=active'), 's12-s2-manager-dashboard-filters');
                    // S1: one section
                    await P.as(`${S.S1.tag}au`, S.S1.path);
                    out.s1author = await filtersAt(P, cu(S.S1.path, '/en/dashboard/mySubmissions'), 's13-s1-author-filters');
                } else {
                    // OMP: a press with three series (Rule 5's "a press offers no series filter here", OMP1)
                    if (!S.P) {
                        const t = tag('u22i28p');
                        const c = await app.api.createContext({tag: t, context: {name: `U22 I28 P ${t}`, acronym: 'U22I28', contactName: 'I28 Contact', contactEmail: `${t}c@mail.test`},
                            users: [u(t, 'mg', ['manager'], 'Mara', 'Manager'), u(t, 'au', ['author'], 'Ada', 'Author')],
                            series: [{path: 'one', title: 'Series One'}, {path: 'two', title: 'Series Two'}, {path: 'three', title: 'Series Three'}]});
                        S.P = {tag: t, path: c.path || t};
                        try { S.P.sub = (await app.api.createSubmission({tag: `${t}s`, context: S.P.path, submitter: `${t}au`, title: `In Series One ${t}`, series: 'one'})).submissionId; } catch (e) { S.P.subError = String(e.message).slice(0, 300); }
                        save();
                    }
                    await P.as(`${S.P.tag}au`, S.P.path);
                    out.pAuthor = await filtersAt(P, cu(S.P.path, '/en/dashboard/mySubmissions'), 's14-p-author-filters');
                    await P.as(`${S.P.tag}mg`, S.P.path);
                    out.pManager = await filtersAt(P, cu(S.P.path, '/en/dashboard/editorial?currentViewId=active'), 's15-p-manager-dashboard-filters');
                }
                // publicknowledge, read only: author.alex's panel
                await P.as('author.alex', app.contextPath);
                out.pkAuthor = await filtersAt(P, cu(app.contextPath, '/en/dashboard/mySubmissions'), 's16-pk-authoralex-filters');
                await signOut(P.page).catch(() => {});
                out.crashes = P.traffic.filter((x) => x.s >= 500).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 160)}`);
                out.bad = P.bad();
                out.pageErrors = P.errs();
                out.dialogs = P.dialogs;
                fact('sections', out);
            } finally { save(); await P.close(); }
        });
    } finally {
        save();
    }
});
