// U36 claim check, chunk Ks27 — re-check after pkp/pkp-lib#13288 (issue #13286,
// merge f38c4a4a10): "Cancel" after a revision restores the replaced file from
// the session, the cancelled revision's log lines are deleted, the History
// hides "Download" for a version that is no longer a revision, and
// FileApiHandler answers 404 instead of 500 for such a version.
// Spec: docs/specs/U36-submission-files.md Rules 6–9a (lines 200–244), register
// A1; the U38 Rule 6c lines are read on the same drive (the Activity Log after
// each cancel), docs/specs/U38-submission-activity-log-and-notes.md.
//
// Per app one scratch context T (users mgr [Journal Manager], ed2 [Journal
// editor, manager level], se [Section editor / Series editor / Moderator, the
// sub-editor level], au [Author]). OJS/OMP submissions (au's article.pdf on
// "Submission Files", se assigned), one per case:
//   w      the wizard left by "Close" / "Cancel" at steps 1–3 with a new file (Rules 6, 7)
//   c1–c3  a revision cancelled at step 1 / 2 / 3, nobody renamed the file (Rule 9, U38 6c)
//   c4     mgr renames, then revises and cancels at step 1 (A1 "the person revising it included")
//   c5     ed2 renames, mgr revises and cancels at step 1 (A1 "another editor")
//   c6     ed2 renames, ed2 revises and cancels at step 2 (the renamer revising)
//   c7     mgr renames, se revises and cancels at step 2 (the sub-editor level)
//   c8     a revision completed (Rule 8), History downloads; then a revision of
//          the already-replaced file cancelled (d5 last sentence)
//   c9     a revision left with the header "Close" at step 1 (A1's "Close")
//   x1     two windows of one person: revision A uploaded, revision B uploaded,
//          then "Cancel" in A, then in B (sweep: the fix's refusal branch)
//   x2     a History "Download" rendered before the revision was cancelled (sweep:
//          the 404 of FileApiHandler)
// OJS/OPS: g1–g3 a seeded PDF galley: "Change File" + "Cancel" (mgr), + "Close"
// (mgr), + "Cancel" (se) (Rule 9a). OMP: the publication menu read (control).
//
//   PROBE_FEATURE=U36 PROBE_AGENT=ccRevs27 node bin/probe.js all shared/playwright/checks/U36/Ks27/ks27.js
//   PHASES=seed,leave,cancel,complete,close,twowin,stale,galley,ompctl (default all; state in state-<app>.json)
//   CASES=c1,c2 narrows the cancel phase.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const ALL = ['seed', 'leave', 'cancel', 'complete', 'close', 'twowin', 'stale', 'galley', 'ompctl'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const CASES = process.env.CASES ? process.env.CASES.split(',') : null;
const on = (p) => PHASES.includes(p);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const log = (...a) => console.log(`[${app.name}]`, ...a);
    const sf = path.join(outDir(), `state-${app.name}.json`);
    const sc = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(sc, null, 2));
    const factsFile = path.join(outDir(), `facts-${app.name}.json`);
    const facts = fs.existsSync(factsFile) ? JSON.parse(fs.readFileSync(factsFile, 'utf8')) : {};
    const fact = (k, v) => { facts[k] = v; fs.writeFileSync(factsFile, JSON.stringify(facts, null, 1)); log(k, JSON.stringify(v).slice(0, 2500)); };

    const FIX = path.join(REPO, `apps/${app.name}/playwright/fixtures/files`);
    const PDF = path.join(FIX, isOPS ? 'preprint.pdf' : 'article.pdf');
    const copyAs = (name) => { const f = path.join(outDir(), name); fs.copyFileSync(PDF, f); return f; };
    const SUPP = isOMP ? 'Prospectus' : 'Research Instrument';

    // ---- seed ---------------------------------------------------------------
    if (on('seed') && !sc.T) {
        const t = tag('u36rev');
        const roleUsers = [['mgr', 'manager', 'Mira', 'Manager'], ['ed2', isOPS ? 'manager' : 'editor', 'Bert', 'Second'],
            ['se', 'sectionEditor', 'Sid', 'Sub'], ['au', 'author', 'Ava', 'Author']];
        const users = roleUsers.map(([k, role, g, f]) => ({username: `${t}${k}`, roles: [role], givenName: g, familyName: f}));
        const ctx = await app.api.createContext({tag: t, context: {name: `U36 Ks27 ${t}`, acronym: 'U36R', contactName: 'Rev Contact', contactEmail: `${t}contact@mail.test`}, users});
        sc.T = ctx.path || t;
        sc.u = Object.fromEntries(roleUsers.map(([k]) => [k, `${t}${k}`]));
        sc.names = Object.fromEntries(roleUsers.map(([k, , g, f]) => [k, `${g} ${f}`]));
        record('seed-context', ctx);
        const part = (k) => ({username: sc.u[k], role: 'sectionEditor'});
        const own = [{file: 'article.pdf'}];
        const seeds = {};
        if (!isOPS) {
            for (const k of ['w', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'x1', 'x2']) seeds[k] = {title: `Ks27 ${k} ${t}`, files: own, participants: [part('se')]};
        }
        if (!isOMP) {
            const gfile = isOPS ? 'preprint.pdf' : 'article.pdf';
            const prod = isOPS ? {} : {files: own, decisions: ['skipExternalReview', 'sendToProduction']};
            for (const k of ['g1', 'g2', 'g3']) seeds[k] = {title: `Ks27 ${k} ${t}`, participants: [part('se')], galleys: [{label: 'PDF', file: gfile}], ...prod};
        } else {
            seeds.m1 = {title: `Ks27 m1 ${t}`, files: own, decisions: ['skipExternalReview', 'sendToProduction'], participants: [part('se')]};
        }
        sc.subs = {};
        for (const [k, spec] of Object.entries(seeds)) {
            try {
                const r = await app.api.createSubmission({tag: `${t}${k}`, context: sc.T, submitter: sc.u.au, ...spec});
                sc.subs[k] = {id: r.submissionId, publicationId: r.publicationId, stageId: r.stageId, files: r.files, galleys: r.galleys};
                log(`[seed ${k}]`, r.submissionId);
            } catch (e) { log(`[seed ${k} FAILED]`, String(e.message).slice(0, 600)); sc.subs[k] = {error: String(e.message).slice(0, 600)}; }
        }
        save(); record('seed', sc);
    }
    if (!sc.T) { log('no state; run the seed phase first'); return; }
    const T = sc.T; const u = sc.u; const S = sc.subs;

    const {page, context, close} = await launch(app);
    // ---- the screens' own traffic and questions, observed --------------------
    const traffic = [];
    const jsDialogs = [];
    let dialogMode = 'accept';
    const onDialog = (d) => {
        const type = d.type();
        jsDialogs.push({at: Date.now(), type, message: d.message().slice(0, 300), answered: type === 'beforeunload' ? 'accept' : dialogMode});
        (type !== 'beforeunload' && dialogMode === 'dismiss' ? d.dismiss() : d.accept()).catch(() => {});
    };
    page.on('dialog', onDialog);
    context.on('response', async (r) => {
        const url = r.url();
        if (/cancel-file-upload|upload-file|save-metadata|delete-file|download-file|edit-metadata/.test(url)) {
            const e = {at: Date.now(), method: r.request().method(), url: url.replace(/^.*\/index\.php/, '').slice(0, 260), status: r.status()};
            if (/cancel-file-upload|delete-file/.test(url)) e.body = flat(await r.text().catch(() => ''), 300);
            if (/download-file/.test(url)) e.disposition = r.headers()['content-disposition'] || null;
            traffic.push(e);
        }
    });
    await context.addInitScript(() => {
        window.__notices = [];
        const seen = new WeakSet();
        const sweep = () => {
            document.querySelectorAll('[role="alert"], [role="status"], .pkpNotification, .pkp_notification, .ui-pnotify, [class*="toast"], [class*="Toast"]').forEach((e) => {
                const t = (e.innerText || '').trim();
                if (t && !seen.has(e)) { seen.add(e); window.__notices.push({t: t.slice(0, 300), at: Date.now()}); }
            });
        };
        new MutationObserver(sweep).observe(document, {subtree: true, childList: true, characterData: true});
    });
    const mark = () => ({t: Date.now(), d: jsDialogs.length, r: traffic.length});
    const since = async (m, p = page) => ({jsDialogs: jsDialogs.slice(m.d), traffic: traffic.slice(m.r), notices: await p.evaluate((s) => (window.__notices || []).filter((n) => n.at >= s).map((n) => n.t), m.t).catch(() => [])});

    // ---- helpers ------------------------------------------------------------
    async function snap(name, extra, p = page) {
        let s;
        try { s = await screen(p); } catch (e) { s = {url: p.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) s.extra = extra;
        record(name, s);
        await shot(p, name).catch(() => {});
        return s;
    }
    const signInAs = async (k, p = page) => { await signIn(p, u[k], {contextPath: T}); await idle(p); };
    const wfUrl = (id, key) => app.url(`/index.php/${T}/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const wf = (p = page) => p.getByRole('dialog').filter({has: p.locator('[data-cy="sidemodal-header"]')}).first();
    async function openWf(id, key, label, p = page) {
        await p.goto(wfUrl(id, key));
        await wf(p).locator('[data-cy="sidemodal-header"]').waitFor({timeout: 30000}).catch(() => log('no workflow header', id, key));
        await p.waitForFunction(() => !/Loading|Refreshing data/.test((document.querySelector('[data-cy="sidemodal-header"]') || {}).innerText || ''), null, {timeout: 15000}).catch(() => {});
        await idle(p);
        if (label) return snap(label, null, p);
        return null;
    }
    const table = (name, p = page) => wf(p).getByRole('table', {name, exact: true}).first();
    async function rows(name = 'Submission Files', p = page) {
        const t = table(name, p);
        if (!(await t.count())) return {absent: true};
        await t.locator('tbody tr').first().waitFor({timeout: 15000}).catch(() => {});
        await idle(p);
        return t.evaluate((el) => [...el.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td, th')].map((c) => c.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' | ')));
    }
    const wiz = (p = page) => p.getByRole('dialog').filter({has: p.locator('div[id^="fileUploadWizard"]')}).last();
    async function wizardState(p = page) {
        const w = wiz(p);
        if (!(await w.count()) || !(await w.isVisible().catch(() => false))) return {open: false};
        return w.evaluate((d) => {
            const vis = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const sel = (q) => {
                const el = d.querySelector(q);
                if (!el) return {present: false};
                return {present: true, visible: vis(el), disabled: el.disabled, options: [...el.options].map((o) => `${o.text.trim()}${o.selected ? ' *' : ''}`)};
            };
            const panel = [...d.querySelectorAll('[role=tabpanel]')].find((x) => vis(x) && x.getAttribute('aria-hidden') !== 'true') || d;
            const up = d.querySelector('.pkp_controller_fileUpload');
            return {
                open: true,
                title: d.getAttribute('aria-label') || (d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.innerText.trim()) || null,
                tabs: [...d.querySelectorAll('[role=tab]')].map((t) => `${f(t.innerText)}${t.getAttribute('aria-selected') === 'true' ? ' *' : ''}`),
                headings: [...d.querySelectorAll('h1,h2,h3,h4,legend,label')].filter(vis).map((e) => f(e.innerText)).filter(Boolean).slice(0, 20),
                revise: sel('select[id^="revisedFileId"]'),
                genre: sel('select[id^="genreId"]'),
                uploader: up ? {screenReaderOnly: up.classList.contains('pkp_screen_reader'), text: f(up.innerText).slice(0, 300)} : null,
                inputs: [...panel.querySelectorAll('input[type=text], textarea')].filter(vis).map((e) => ({name: e.name, value: (e.value || '').slice(0, 120)})),
                buttons: [...d.querySelectorAll('button, a')].filter(vis).map((b) => f(b.innerText || b.getAttribute('aria-label'))).filter(Boolean),
                panelText: f(panel.innerText).slice(0, 1500),
            };
        }).catch((e) => ({error: String(e.message).slice(0, 300)}));
    }
    async function wizSnap(label, extra, p = page) { const st = await wizardState(p); await snap(label, {wizard: st, ...(extra || {})}, p); return st; }
    async function openUpload(listName = 'Submission Files', p = page) {
        const container = wf(p).locator('div').filter({has: p.getByRole('table', {name: listName, exact: true})}).last();
        const btn = container.getByRole('button', {name: 'Upload', exact: true});
        await loc(p, `"${listName}" › "Upload"`, btn);
        await btn.click();
        await wiz(p).locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000});
        await idle(p);
    }
    const contBtn = (p = page) => wiz(p).getByRole('button', {name: 'Continue', exact: true});
    async function waitContinueEnabled(p = page, timeout = 30000) {
        const until = Date.now() + timeout;
        while (Date.now() < until) { if (await contBtn(p).isEnabled().catch(() => false)) return true; await p.waitForTimeout(200); }
        return false;
    }
    async function pickRevise(match, p = page) {
        const r = wiz(p).locator('select[id^="revisedFileId"]');
        const opts = await r.locator('option').allTextContents();
        const idx = opts.findIndex((t) => t.includes(match));
        if (idx >= 0) await r.selectOption({index: idx});
        await p.waitForTimeout(300);
        return {opts: opts.map((o) => o.trim()), idx};
    }
    async function pickGenre(label, p = page) { const g = wiz(p).locator('select[id^="genreId"]'); if (await g.count() && await g.isEnabled()) await g.selectOption({label}); }
    async function attach(file, p = page) { await wiz(p).locator('input[type="file"]').setInputFiles(file); return waitContinueEnabled(p); }
    async function toStep(n, p = page) {
        await contBtn(p).click();
        await wiz(p).getByRole('tab', {name: new RegExp(`^${n}\\.`)}).and(p.locator('[aria-selected="true"]')).waitFor({timeout: 30000}).catch(() => {});
        await idle(p);
        if (n === 2) await wiz(p).locator('input[type="text"]:visible').first().waitFor({timeout: 20000}).catch(() => {});
        if (n === 3) await wiz(p).getByRole('button', {name: 'Complete', exact: true}).waitFor({timeout: 20000}).catch(() => {});
        await idle(p);
    }
    async function complete(p = page) {
        await wiz(p).getByRole('button', {name: 'Complete', exact: true}).click();
        await wiz(p).waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(p); await p.waitForTimeout(500); await idle(p);
    }
    async function wizCancel(p = page) {
        const c = wiz(p).getByRole('link', {name: 'Cancel', exact: true}).or(wiz(p).getByRole('button', {name: 'Cancel', exact: true})).first();
        await loc(p, 'wizard bottom "Cancel"', c);
        await c.click();
        await p.waitForTimeout(1500);
        await wiz(p).waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
        await idle(p); await p.waitForTimeout(400); await idle(p);
        return {stillOpen: (await wiz(p).count()) > 0 && await wiz(p).isVisible().catch(() => false)};
    }
    async function wizClose(p = page) {
        const c = wiz(p).getByRole('button', {name: 'Close', exact: true}).first();
        await loc(p, 'wizard header "Close"', c);
        await c.click();
        await p.waitForTimeout(1000);
        await wiz(p).waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
        await idle(p); await p.waitForTimeout(400); await idle(p);
        return {stillOpen: (await wiz(p).count()) > 0 && await wiz(p).isVisible().catch(() => false)};
    }
    const nameBox = (p = page) => wiz(p).locator('input[type="text"]:visible').filter({hasNot: p.locator('[readonly]')}).first();
    async function rowMenu(listName, rowText, press, p = page) {
        const row = table(listName, p).locator('tbody tr').filter({hasText: rowText}).first();
        await row.waitFor({timeout: 20000});
        const btn = row.getByRole('button', {name: /More Actions/}).first();
        await btn.click(); await p.waitForTimeout(300);
        const items = await p.locator('[role="menuitem"]:visible').evaluateAll((els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))).catch(() => []);
        if (press) { await p.getByRole('menuitem', {name: press}).first().click(); await idle(p); await p.waitForTimeout(500); await idle(p); } else { await btn.click().catch(() => {}); }
        return items;
    }
    async function rename(k, id, from, to) {
        await signInAs(k); await openWf(id, 'workflow_1');
        await rowMenu('Submission Files', from, 'Update File Details');
        const ed = page.getByRole('dialog').filter({hasText: 'Edit a file'}).last();
        const b = ed.locator('input[type="text"]:visible').first();
        await b.waitFor({timeout: 20000}); await b.fill(to);
        await ed.getByRole('button', {name: 'Save', exact: true}).click();
        await ed.waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
        await idle(page);
        await openWf(id, 'workflow_1');
        return rows();
    }
    // A download pressed on screen: its response (status, disposition) and the file, wherever it lands.
    async function pressDownload(link, label, p = page) {
        const got = [];
        const onD = (d) => got.push(d);
        const onP = (np) => np.on('download', onD);
        p.on('download', onD); p.context().on('page', onP);
        const resp = p.context().waitForEvent('response', {predicate: (r) => /download-file/.test(r.url()), timeout: 15000}).catch(() => null);
        const before = p.url();
        await link.click().catch(() => {});
        const r = await resp;
        for (let k = 0; k < 30 && !got.length; k++) await sleep(250);
        p.off('download', onD); p.context().off('page', onP);
        const out = {status: r ? r.status() : null, disposition: r ? (r.headers()['content-disposition'] || null) : null, url: r ? r.url().replace(/^.*\/index\.php/, '').slice(0, 240) : null};
        if (got.length) {
            const d = got[0];
            const fp = await d.path().catch(() => null);
            out.file = d.suggestedFilename(); out.size = fp ? fs.statSync(fp).size : null;
        } else {
            out.noDownload = true;
            out.landed = p.url().replace(/^.*\/index\.php/, '');
            if (p.url() !== before) { const s = await snap(`${label}-landed`, null, p); out.landedText = flat(s.text && s.text.main, 300); }
        }
        for (const extra of p.context().pages()) if (extra !== p && extra !== page && extra !== page2Ref.p) { await extra.close().catch(() => {}); }
        record(`${label}-download`, out);
        return out;
    }
    const page2Ref = {p: null};
    // The Activity Log's "History": rows with their arrows.
    const logDialog = (p = page) => p.getByRole('dialog').filter({hasText: 'Activity Log & Notes'}).last();
    async function openLog(p = page) {
        const btn = wf(p).locator('[data-cy="sidemodal-header"]').getByRole('button', {name: 'Activity Log', exact: true}).first();
        if (!(await btn.count())) return null;
        await btn.click();
        const d = logDialog(p);
        await d.locator('tr.gridRow, td:has-text("No Items")').first().waitFor({timeout: 45000}).catch(() => log('History grid did not fill'));
        await idle(p);
        return d;
    }
    const gridRows = (scope) => scope.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr, i) => {
        const tds = [...tr.querySelectorAll('td')];
        const txt = (td) => (td ? td.innerText.replace(/\s+/g, ' ').trim() : '');
        return {i, date: txt(tds[0]), user: txt(tds[1]), event: txt(tds[2]), arrow: !!tr.querySelector('a.show_extras, a.hide_extras')};
    })).catch(() => []);
    async function readLog(label, {downloads = null, p = page} = {}) {
        const d = await openLog(p);
        if (!d) return {absent: true};
        const r = await gridRows(d);
        await snap(label, {rows: r}, p);
        const dls = {};
        if (downloads) {
            for (const row of r) {
                if (!row.arrow || !downloads.test(row.event)) continue;
                const tr = d.locator('tr.gridRow').nth(row.i);
                const a = tr.locator('a.show_extras').first();
                if (await a.count()) { await a.click(); await sleep(300); }
                const link = tr.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: /Download/}).first();
                if (!(await link.count())) { dls[`${row.i} ${row.event}`] = {noDownloadLink: true}; continue; }
                dls[`${row.i} ${row.event}`] = await pressDownload(link, `${label}-${row.i}`, p);
                if (!(await logDialog(p).isVisible().catch(() => false))) break;
            }
        }
        await closeLog(p);
        return {rows: r.map((x) => `${x.date} | ${x.user} | ${x.event}${x.arrow ? ' [>]' : ''}`), downloads: dls};
    }
    async function closeLog(p = page) {
        const d = logDialog(p);
        await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await d.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
        await sleep(600);
    }
    // The file's "More Information" › "History": rows, arrows, and each "Download".
    async function fileHistory(rowText, label, {listName = 'Submission Files', download = true, p = page} = {}) {
        await rowMenu(listName, rowText, 'More Information', p);
        const info = p.getByRole('dialog').filter({hasText: /Information Center/}).last();
        await info.waitFor({timeout: 30000});
        await info.locator('tr.gridRow, td:has-text("No Items")').first().waitFor({timeout: 30000}).catch(() => {});
        await idle(p);
        const title = await info.getByRole('heading', {level: 1}).first().innerText().catch(() => null);
        const r = await gridRows(info);
        await snap(`${label}-history`, {title, rows: r}, p);
        const dls = {};
        if (download) {
            for (const row of r) {
                if (!row.arrow) continue;
                const tr = info.locator('tr.gridRow').nth(row.i);
                const a = tr.locator('a.show_extras').first();
                if (await a.count()) { await a.click(); await sleep(300); }
                const link = tr.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: /Download/}).first();
                if (!(await link.count())) { dls[`${row.i} ${row.event}`] = {noDownloadLink: true}; continue; }
                dls[`${row.i} ${row.event}`] = await pressDownload(link, `${label}-history-${row.i}`, p);
            }
        }
        await info.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(600);
        return {title, rows: r.map((x) => `${x.date} | ${x.user} | ${x.event}${x.arrow ? ' [>]' : ''}`), downloads: dls};
    }
    const newRows = (before, after) => {
        const left = [...(before || [])];
        return (after || []).filter((x) => { const i = left.indexOf(x); if (i >= 0) { left.splice(i, 1); return false; } return true; });
    };

    try {
        // =====================================================================
        // Phase leave (Rules 6, 7): a new file, the wizard left by "Close" / "Cancel" at each step.
        if (on('leave') && S.w && !isOPS) {
            await signInAs('mgr');
            const out = {};
            const run = async (how, step, label, {dismiss = false} = {}) => {
                await openWf(S.w.id, 'workflow_1');
                const before = await rows();
                await openUpload();
                await pickGenre(SUPP);
                const f = copyAs(`${label}.pdf`);
                await attach(f);
                if (step >= 2) { await toStep(2); await nameBox().fill(`${label} typed name`); await page.keyboard.press('Tab'); }
                if (step >= 3) await toStep(3);
                const pre = await wizSnap(`leave-${label}-before`);
                const m = mark();
                if (dismiss) dialogMode = 'dismiss';
                const res = how === 'close' ? await wizClose() : await wizCancel();
                dialogMode = 'accept';
                const after = await since(m);
                if (res.stillOpen) {
                    res.openState = await wizSnap(`leave-${label}-still-open`);
                    // leave the window the other way to finish: "Cancel" removes the file
                    res.then = await wizCancel(); res.thenSince = await since(m);
                }
                const samePage = await rows();
                await snap(`leave-${label}-same-page`, {samePage});
                await openWf(S.w.id, 'workflow_1');
                const reland = await rows();
                await snap(`leave-${label}-reload`, {reland});
                out[label] = {how, step, preTabs: pre.tabs, res, dialogs: after.jsDialogs.map((d) => `${d.type}: ${d.message} → ${d.answered}`), notices: after.notices, cancelAnswers: after.traffic.filter((x) => x.body).map((x) => `${x.status} ${x.body}`), before, samePage, reland};
                log(`[leave ${label}]`, JSON.stringify({res: {stillOpen: res.stillOpen, then: res.then}, dialogs: out[label].dialogs, answers: out[label].cancelAnswers, samePage, reland}).slice(0, 1500));
            };
            await run('close', 1, 'close1ok');
            await run('close', 1, 'close1dismiss', {dismiss: true});
            await run('close', 2, 'close2');
            await run('close', 3, 'close3');
            await run('cancel', 1, 'cancel1');
            await run('cancel', 2, 'cancel2');
            await run('cancel', 3, 'cancel3');
            fact('leave', out);
        }

        // =====================================================================
        // One revision case: optional rename, revise at step 1, go to `step`, then cancel / close / complete.
        const reviseCase = async (key, {renamer = null, reviser = 'mgr', step = 1, how = 'cancel', typed = null, match = 'article.pdf', file = null, dismiss = false} = {}) => {
            const id = S[key].id; const out = {key, renamer, reviser, step, how, typed};
            if (renamer) { out.renamedTo = `Renamed by ${renamer}.pdf`; out.afterRename = await rename(renamer, id, 'article.pdf', out.renamedTo); match = out.renamedTo; }
            await signInAs(reviser);
            await openWf(id, 'workflow_1', `${key}-00-workflow`);
            out.before = await rows();
            out.logBefore = (await readLog(`${key}-01-log-before`)).rows;
            await openWf(id, 'workflow_1');
            await openUpload();
            out.pick = await pickRevise(match);
            out.s1picked = await wizSnap(`${key}-02-step1-picked`);
            const f = file || copyAs(`rev-${key}.pdf`);
            const m = mark();
            out.attached = await attach(f);
            out.s1uploaded = await wizSnap(`${key}-03-step1-uploaded`);
            if (step >= 2) { await toStep(2); if (typed) { await nameBox().fill(typed); await page.keyboard.press('Tab'); } out.s2 = await wizSnap(`${key}-04-step2`); }
            if (step >= 3) { await toStep(3); out.s3 = await wizSnap(`${key}-05-step3`); }
            if (dismiss) dialogMode = 'dismiss';
            if (how === 'cancel') out.res = await wizCancel();
            else if (how === 'close') out.res = await wizClose();
            else if (how === 'complete') { if (step < 3) { if (step < 2) await toStep(2); await toStep(3); } await complete(); out.res = {completed: true}; }
            dialogMode = 'accept';
            if (out.res.stillOpen) { out.stillOpen = await wizSnap(`${key}-06-still-open`); out.res.then = await wizClose(); }
            const s = await since(m);
            out.dialogs = s.jsDialogs.map((d) => `${d.type}: ${d.message} → ${d.answered}`);
            out.notices = s.notices;
            out.answers = s.traffic.filter((x) => /cancel-file-upload/.test(x.url)).map((x) => `${x.status} ${x.body}`);
            out.samePage = await rows();
            await snap(`${key}-07-same-page`, {samePage: out.samePage});
            await openWf(id, 'workflow_1');
            out.reland = await rows();
            await snap(`${key}-08-reload`, {reland: out.reland});
            const lg = await readLog(`${key}-09-log-after`, {downloads: /file revision|Revision "/});
            out.logAfter = lg.rows; out.logAdded = newRows(out.logBefore, lg.rows); out.logDownloads = lg.downloads;
            await openWf(id, 'workflow_1');
            const cur = (out.reland[0] || '').split(' | ').find((x) => /\.pdf|Renamed|typed/.test(x)) || 'pdf';
            out.fileHistory = await fileHistory(cur.replace(/ \d{4}-\d\d-\d\d.*$/, ''), `${key}-10`);
            log(`[${key}]`, JSON.stringify({res: out.res, answers: out.answers, dialogs: out.dialogs, notices: out.notices, before: out.before, samePage: out.samePage, reland: out.reland, logAdded: out.logAdded, logDownloads: out.logDownloads, fileHistory: out.fileHistory}).slice(0, 3000));
            return out;
        };

        // Phase cancel (Rule 9, A1, U38 6c).
        if (on('cancel') && S.c1 && !isOPS) {
            const plan = {
                c1: {step: 1},
                c2: {step: 2, typed: 'Typed at step 2'},
                c3: {step: 3, typed: 'Typed at step 2'},
                c4: {renamer: 'mgr', step: 1},
                c5: {renamer: 'ed2', step: 1},
                c6: {renamer: 'ed2', reviser: 'ed2', step: 2},
                c7: {renamer: 'mgr', reviser: 'se', step: 2},
            };
            for (const [k, o] of Object.entries(plan)) {
                if (CASES && !CASES.includes(k)) continue;
                try { fact(`cancel.${k}`, await reviseCase(k, o)); } catch (e) { log(`[${k} FAILED]`, String(e.stack || e).split('\n').slice(0, 3).join(' | ')); await snap(`${k}-FAILED`).catch(() => {}); }
            }
        }

        // Phase complete (Rule 8, d5 last sentence): a completed revision, then a revision of it cancelled.
        if (on('complete') && S.c8 && !isOPS) {
            try {
                const a = await reviseCase('c8', {step: 3, how: 'complete'});
                fact('complete.c8a', a);
                const name = 'rev-c8.pdf';
                const b = await reviseCase('c8', {step: 1, how: 'cancel', match: name, file: copyAs('rev-c8-second.pdf')});
                fact('complete.c8b', b);
            } catch (e) { log('[c8 FAILED]', String(e.stack || e).split('\n').slice(0, 3).join(' | ')); await snap('c8-FAILED').catch(() => {}); }
        }

        // Phase close (A1's "Close"; Rule 6 for a revision): a revision left with the header "Close" at step 1.
        if (on('close') && S.c9 && !isOPS) {
            try { fact('close.c9', await reviseCase('c9', {step: 1, how: 'close'})); } catch (e) { log('[c9 FAILED]', String(e.stack || e).split('\n').slice(0, 3).join(' | ')); await snap('c9-FAILED').catch(() => {}); }
        }

        // =====================================================================
        // Phase twowin (sweep): two windows of one person revising the same file.
        if (on('twowin') && S.x1 && !isOPS) {
            const out = {};
            try {
                const id = S.x1.id;
                await signInAs('mgr');
                const p2 = await context.newPage(); page2Ref.p = p2;
                p2.on('dialog', onDialog);
                p2.on('pageerror', (e) => { out.page2Errors = [...(out.page2Errors || []), String(e.message).slice(0, 300)]; });
                await openWf(id, 'workflow_1', 'x1-00-a-workflow');
                out.before = await rows();
                await openWf(id, 'workflow_1', 'x1-00-b-workflow', p2);
                // A: revision A uploaded, stays on step 1
                await openUpload(); out.pickA = await pickRevise('article.pdf');
                await attach(copyAs('rev-A.pdf'));
                await wizSnap('x1-01-a-uploaded');
                // B: its list already reads rev-A.pdf? revise it with rev-B.pdf
                out.bListBeforeUpload = await rows('Submission Files', p2);
                await openUpload('Submission Files', p2);
                out.pickB = await pickRevise('rev-A.pdf', p2);
                if (out.pickB.idx < 0) out.pickB = await pickRevise('article.pdf', p2);
                await attach(copyAs('rev-B.pdf'), p2);
                await wizSnap('x1-02-b-uploaded', null, p2);
                // A: Cancel
                let m = mark();
                out.cancelA = await wizCancel();
                out.cancelASince = await since(m);
                if (out.cancelA.stillOpen) {
                    await wizSnap('x1-03-a-still-open');
                    m = mark();
                    out.cancelA2 = await wizCancel();
                    out.cancelA2Since = await since(m);
                }
                out.aSamePage = await rows();
                await snap('x1-04-a-after-cancel', {rows: out.aSamePage});
                // B: Cancel
                m = mark();
                out.cancelB = await wizCancel(p2);
                out.cancelBSince = await since(m, p2);
                if (out.cancelB.stillOpen) { await wizSnap('x1-05-b-still-open', null, p2); out.cancelB2 = await wizCancel(p2); }
                out.bSamePage = await rows('Submission Files', p2);
                await snap('x1-06-b-after-cancel', {rows: out.bSamePage}, p2);
                await p2.close(); page2Ref.p = null;
                await openWf(id, 'workflow_1');
                out.reland = await rows();
                await snap('x1-07-reload', {rows: out.reland});
                out.log = await readLog('x1-08-log', {downloads: /file revision|Revision "/});
                await openWf(id, 'workflow_1');
                const cur = (out.reland[0] || '').split(' | ').find((x) => /\.pdf/.test(x)) || 'pdf';
                out.fileHistory = await fileHistory(cur, 'x1-09');
            } catch (e) { out.error = String(e.stack || e).split('\n').slice(0, 3).join(' | '); await snap('x1-FAILED').catch(() => {}); }
            fact('twowin.x1', out);
        }

        // Phase stale (sweep): the History open in a second window while the revision is cancelled in the first.
        if (on('stale') && S.x2 && !isOPS) {
            const out = {};
            try {
                const id = S.x2.id;
                await signInAs('mgr');
                const p2 = await context.newPage(); page2Ref.p = p2;
                p2.on('dialog', onDialog);
                await openWf(id, 'workflow_1', 'x2-00-workflow');
                await openUpload(); out.pick = await pickRevise('article.pdf');
                await attach(copyAs('rev-stale.pdf'));
                await wizSnap('x2-01-uploaded');
                // second window: the Activity Log and the file's History, while the upload stands
                await openWf(id, 'workflow_1', null, p2);
                const d = await openLog(p2);
                out.logWhileUploaded = await gridRows(d);
                await snap('x2-02-log-while-uploaded', {rows: out.logWhileUploaded}, p2);
                const revRow = out.logWhileUploaded.find((r) => r.arrow && /rev-stale\.pdf/.test(r.event));
                let link = null;
                if (revRow) {
                    const tr = d.locator('tr.gridRow').nth(revRow.i);
                    await tr.locator('a.show_extras').first().click(); await sleep(300);
                    link = tr.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: /Download/}).first();
                    out.linkHref = (await link.getAttribute('href').catch(() => '') || '').replace(/^.*\/index\.php/, '').replace(/csrfToken=[^&]+/, '');
                }
                // first window: Cancel
                const m = mark();
                out.cancel = await wizCancel();
                out.cancelSince = await since(m);
                out.afterCancel = await rows();
                await snap('x2-03-after-cancel', {rows: out.afterCancel});
                // second window: press the Download rendered before the cancel
                if (link) out.staleDownload = await pressDownload(link, 'x2-04-stale', p2);
                await snap('x2-05-second-window-after-download', null, p2);
                await p2.close(); page2Ref.p = null;
                await openWf(id, 'workflow_1');
                out.logAfter = await readLog('x2-06-log-after', {downloads: /file revision|Revision "/});
            } catch (e) { out.error = String(e.stack || e).split('\n').slice(0, 3).join(' | '); await snap('x2-FAILED').catch(() => {}); }
            fact('stale.x2', out);
        }

        // =====================================================================
        // Phase galley (Rule 9a; OJS, OPS): "Change File" on a seeded PDF galley.
        if (on('galley') && S.g1 && !isOMP) {
            const galleyKey = (k) => `publication_${S[k].publicationId}_galleys`;
            const serve = async (label) => {
                // which file the galley serves: the publication's "Preview", the galley link, "Download"
                const res = {};
                try {
                    await page.getByRole('button', {name: 'Preview', exact: true}).last().click();
                    await page.waitForURL(/\/(article|preprint)\/view\//, {timeout: 20000}).catch(() => {});
                    await idle(page);
                    const gl = page.locator('a').filter({hasText: /^\s*PDF\s*$/}).first();
                    await gl.click(); await page.waitForTimeout(1500); await idle(page);
                    await snap(`${label}-galley-view`);
                    const dl = page.waitForEvent('download', {timeout: 15000}).catch(() => null);
                    await page.getByRole('link', {name: /Download/}).first().click().catch(() => {});
                    const d = await dl;
                    res.served = d ? d.suggestedFilename() : null;
                } catch (e) { res.error = flat(e.message, 200); }
                return res;
            };
            const change = async (k, who, how) => {
                const out = {k, who, how};
                await signInAs(who);
                await openWf(S[k].id, galleyKey(k), `${k}-00-galleys`);
                const logBefore = (await readLog(`${k}-01-log-before`)).rows;
                await openWf(S[k].id, galleyKey(k));
                const row = wf().locator('tbody tr').filter({hasText: 'PDF'}).first();
                await row.waitFor({timeout: 20000});
                await row.locator('button').last().click(); await page.waitForTimeout(300);
                out.menu = await page.locator('[role="menuitem"]:visible').allInnerTexts().catch(() => []);
                await page.getByRole('menuitem', {name: 'Change File'}).first().click();
                await wiz().locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000}); await idle(page);
                out.s1 = await wizSnap(`${k}-02-change-step1`);
                const m = mark();
                await attach(path.join(FIX, 'replacement.pdf'));
                out.s1up = await wizSnap(`${k}-03-change-uploaded`);
                out.res = how === 'close' ? await wizClose() : await wizCancel();
                if (out.res.stillOpen) { await wizSnap(`${k}-04-still-open`); out.res.then = await wizClose(); }
                const s = await since(m);
                out.dialogs = s.jsDialogs.map((d) => `${d.type}: ${d.message} → ${d.answered}`);
                out.notices = s.notices;
                out.answers = s.traffic.filter((x) => /cancel-file-upload/.test(x.url)).map((x) => `${x.status} ${x.body}`);
                await snap(`${k}-05-after`);
                await openWf(S[k].id, galleyKey(k), `${k}-06-galleys-reload`);
                const lg = await readLog(`${k}-07-log-after`, {downloads: /file revision|Revision "/});
                out.logAdded = newRows(logBefore, lg.rows); out.logDownloads = lg.downloads;
                // the galley's "More Information"
                try {
                    await openWf(S[k].id, galleyKey(k));
                    const r2 = wf().locator('tbody tr').filter({hasText: 'PDF'}).first();
                    await r2.locator('button').last().click(); await page.waitForTimeout(300);
                    await page.getByRole('menuitem', {name: 'More Information'}).first().click();
                    const info = page.getByRole('dialog').filter({hasText: /Information Center/}).last();
                    await info.waitFor({timeout: 30000});
                    await info.locator('tr.gridRow, td:has-text("No Items")').first().waitFor({timeout: 30000}).catch(() => {});
                    await idle(page);
                    out.infoTitle = await info.getByRole('heading', {level: 1}).first().innerText().catch(() => null);
                    out.infoRows = (await gridRows(info)).map((x) => `${x.date} | ${x.user} | ${x.event}${x.arrow ? ' [>]' : ''}`);
                    await snap(`${k}-08-more-information`, {rows: out.infoRows});
                    await info.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                } catch (e) { out.infoError = flat(e.message, 200); }
                await openWf(S[k].id, galleyKey(k));
                out.serve = await serve(k);
                log(`[${k}]`, JSON.stringify({menu: out.menu, s1: {headings: out.s1.headings, genre: out.s1.genre, revise: out.s1.revise, uploader: out.s1.uploader, panel: flat(out.s1.panelText, 300)}, s1up: flat(out.s1up.panelText, 300), res: out.res, dialogs: out.dialogs, answers: out.answers, notices: out.notices, logAdded: out.logAdded, logDownloads: out.logDownloads, info: out.infoRows, serve: out.serve}).slice(0, 3000));
                return out;
            };
            for (const [k, who, how] of [['g1', 'mgr', 'cancel'], ['g2', 'mgr', 'close'], ['g3', 'se', 'cancel']]) {
                try { fact(`galley.${k}`, await change(k, who, how)); } catch (e) { log(`[${k} FAILED]`, String(e.stack || e).split('\n').slice(0, 3).join(' | ')); await snap(`${k}-FAILED`).catch(() => {}); }
            }
        }

        // Phase ompctl: a press's publication menu (control for Rule 9a's {OJS OPS}).
        if (on('ompctl') && isOMP && S.m1) {
            await signInAs('mgr');
            const s = await openWf(S.m1.id, `publication_${S.m1.publicationId}_titleAbstract`, 'm1-00-publication');
            const nav = await wf().locator('nav, [role="navigation"], aside').first().innerText().catch(() => null);
            fact('ompctl', {nav: flat(nav, 800), galleys: /Galleys/.test(s.text.dialog || ''), formats: /Publication Formats/.test(s.text.dialog || '')});
        }
    } finally {
        record('traffic', {traffic, jsDialogs});
        await close();
    }
});
