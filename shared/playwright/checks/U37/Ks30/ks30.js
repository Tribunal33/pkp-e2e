// U37 claim check, chunk Ks30 — the first message of the discussions other
// screens open, after pkp/pkp-lib#13409 (addQuery() now flags the first note
// as the head note). docs/specs/U37-tasks-and-discussions.md Rules 3, 4, 15
// (15a, 15c–15e), 21; register A9, and A6, A8, A12 as far as the comments-box
// and recommendation discussions reach them; footnotes v, aa, td8–td10, td19, f-a9.
//
// Seeds its own scratch context per app (nothing on publicknowledge):
//   users mg (manager), ed (manager-level: "editor", OPS "manager"), se
//   (section editor / moderator), au (the submitting author); OJS/OMP fu
//   (funding coordinator), rc
//   (recommend-only section editor). The first stage's "Discussion (…)"
//   template has "Auto-add at stage" on.
//     D    a draft by au with se, ed (OJS/OMP fu) assigned, submitted on
//          screen with a comment: the comments-box discussion and the auto item
//     S1   a submitted submission (se assigned) for Participants "Notify"
//     SRec (OJS/OMP) a review round, rc recommend-only, se deciding
//
//   PROBE_FEATURE=U37 PROBE_AGENT=ccKs30 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U37/Ks30/ks30.js
//   PHASES=cm,rec,notify,auto,autotask,plain,notify2,reply (default all; autotask seeds a context of its own); REUSE=1 reuses the seeded context (x-<run>-<app>.json).
//
// No assertions: every screen is recorded with screen()/shot(); the console
// log carries the facts (prefix [app phase]); facts-<run>-<app>.json collects them.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outFile, sql} = require('../../../probe');

const ALL = 'cm,rec,notify,auto,autotask,plain,notify2,reply';
const PHASES = (process.env.PHASES || ALL).split(',');
const flat = (s, n = 1500) => (s || '').replace(/\s*\n+\s*/g, ' | ').slice(0, n);
const pad = (n) => String(n).padStart(2, '0');
const day = (n) => { const d = new Date(Date.now() + n * 86400000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const FIX = {ojs: 'notes.md', omp: 'notes.md', ops: 'not-an-image.txt'};
const fixturePath = (app, f) => path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/fixtures/files/${f || FIX[app.name]}`);
const NAMES = {mg: 'Mona Manager', ed: 'Eddie Chief', se: 'Sean Editor', au: 'Ava Author', a2: 'Abe Second', fu: 'Fern Funding', rc: 'Rico Recommender'};
const person = (k, t, role) => { const [g, f] = NAMES[k].split(' '); return {username: `${t}${k}`, roles: [role], givenName: g, familyName: f}; };
// The minute the discussion window prints; wait until it has moved on, so a
// kept or rewritten time can be told apart.
const nextMinute = async (page, since) => { const m = (d) => Math.floor(d / 60000); while (m(Date.now()) <= m(since)) await page.waitForTimeout(2000); await page.waitForTimeout(2000); };

// ---------------------------------------------------------------------------
// Seeding

async function seed(app) {
    const t = tag('u37ks30');
    const u = (s) => `${t}${s}`;
    const ops = app.name === 'ops';
    const users = [person('mg', t, 'manager'), person('ed', t, ops ? 'manager' : 'editor'), person('se', t, 'sectionEditor'), person('au', t, 'author')];
    if (!ops) users.push(person('fu', t, 'funding'), person('rc', t, 'sectionEditor'));
    const tpl = ops ? {stage: 'production', title: 'Discussion (Production)', include: true} : {stage: 'submission', title: 'Discussion (Submission)', include: true};
    const C = await app.api.createContext({tag: t, users, taskTemplates: [tpl]});
    const X = {t, path: C.path, tpl: tpl.title, names: {}};
    const parts = [{username: u('se'), role: 'sectionEditor'}, {username: u('ed'), role: ops ? 'manager' : 'editor'}];
    if (!ops) parts.push({username: u('fu'), role: 'funding'});
    X.D = await app.api.createSubmission({tag: `${t}d`, context: C.path, submitter: u('au'), title: `Ks30 D ${t}`, submitted: false, participants: parts,
        ...(ops ? {} : {files: [{file: 'article.pdf'}]})});
    X.S1 = await app.api.createSubmission({tag: `${t}a`, context: C.path, submitter: u('au'), title: `Ks30 S1 ${t}`, participants: [{username: u('se'), role: 'sectionEditor'}]});
    if (!ops) {
        X.SRec = await app.api.createSubmission({tag: `${t}q`, context: C.path, submitter: u('au'), title: `Ks30 SRec ${t}`, decisions: ['sendExternalReview'],
            participants: [{username: u('se'), role: 'sectionEditor'}, {username: u('rc'), role: 'sectionEditor', recommendOnly: true}]});
    }
    console.log(`[${app.name} seed]`, JSON.stringify({path: X.path, D: X.D.submissionId, S1: X.S1.submissionId, SRec: X.SRec && X.SRec.submissionId}));
    return X;
}


// ---------------------------------------------------------------------------
// Screen helpers (the K6 set, plus reply, Tasks panel, mail, Participants)

function helpers(app, page, X, facts) {
    const h = {ops: app.name === 'ops', ojs: app.name === 'ojs'};
    const u = (s) => `${X.t}${s}`;
    h.u = u;
    const L = (...a) => console.log(`[${app.name}${h.phase ? ' ' + h.phase : ''}]`, ...a);
    h.L = L;
    h.fact = (k, v) => { facts[`${h.phase}: ${k}`] = v; L(k, JSON.stringify(v).slice(0, 3000)); };
    h.key1 = h.ops ? 'workflow_5' : 'workflow_1';
    h.edUrl = (id, key, ctx = X.path, loc = 'en') => app.url(`/index.php/${ctx}/${loc}/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    h.auUrl = (id, key, ctx = X.path) => app.url(`/index.php/${ctx}/en/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    h.roundKey = (S) => `workflow_${S.reviewRounds[0].stageId}_${S.reviewRounds[0].id}`;
    h.panel = () => page.locator('[data-cy="discussion-manager"]:visible').first();
    h.snap = async (name, extra) => { const s = await screen(page); record(name, extra ? {...s, extra} : s); await shot(page, name).catch(() => {}); return s; };
    h.waitPanel = async () => {
        await h.panel().getByRole('button', {name: 'Add', exact: true}).first().waitFor({timeout: 30000}).catch(() => L('no Add button'));
        await page.waitForFunction(() => { const p = [...document.querySelectorAll('[data-cy="discussion-manager"]')].find((e) => e.getClientRects().length); return p && !/Loading/.test(p.innerText); }, null, {timeout: 15000}).catch(() => {});
        await idle(page);
    };
    h.open = async (url, step) => { h.step = step || `open ${url.replace(/^.*index.php/, '')}`; await page.goto(url); await h.waitPanel(); };
    h.openS1 = async (who, S = X.S1, ctx = X.path) => {
        if (who === 'au') {
            if (!h.ops) return h.open(h.auUrl(S.submissionId, null, ctx));
            await page.goto(h.auUrl(S.submissionId, null, ctx)); await idle(page);
            await page.getByRole('link', {name: 'Production Tasks & Discussions'}).first().click().catch(() => L('no author link'));
            return h.waitPanel();
        }
        return h.open(h.edUrl(S.submissionId, h.key1, ctx));
    };
    h.answers = [];
    page.on('response', async (r) => {
        if (!/\/api\/v1\/.*(tasks|participants|users)|send-notification|fetch-template-body|temporaryFiles|Participant|signInAsUser|decision/.test(r.url())) return;
        const req = r.request();
        const e = {t: Date.now(), method: `${req.method()}${req.headers()['x-http-method-override'] ? '→' + req.headers()['x-http-method-override'] : ''}`, url: r.url().replace(/^.*\/api\/v1/, '').replace(/^.*\$\$\$call\$\$\$/, ''), status: r.status()};
        if (r.status() >= 400) e.body = await r.text().catch(() => null);
        h.answers.push(e);
    });
    h.since = (t0) => h.answers.filter((a) => a.t >= t0 && !/^GET/.test(a.method)).map((a) => `${a.method} ${a.url} ${a.status}${a.body ? ' ' + a.body.slice(0, 400) : ''}`);
    h.browserDialogs = [];
    page.on('dialog', async (d) => {
        h.browserDialogs.push({type: d.type(), message: d.message(), step: h.step || '-', phase: h.phase});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    h.dialogs = () => page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length > 0).map((d) => ({name: d.getAttribute('aria-label') || (d.querySelector('h1,h2') || {}).innerText || '', text: d.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 1500)})));
    h.top = () => page.locator('[role="dialog"]:visible').last();
    h.row = (name) => h.panel().locator('tbody tr').filter({has: page.getByRole('button', {name, exact: true})}).first();
    h.panelRead = () => h.panel().evaluate((p) => [...p.querySelectorAll('tbody tr')].map((tr) => {
        const tds = [...tr.querySelectorAll('td, th')];
        const box = (td) => { const i = td && td.querySelector('input[type=checkbox]'); return i ? {checked: i.checked, disabled: i.disabled} : null; };
        return tds.length < 3 ? {group: tr.innerText.trim()} : {cells: tds.map((td) => td.innerText.trim().replace(/\s+/g, ' ')), started: box(tds[3]), closed: box(tds[4])};
    }));
    h.groupOf = (rows, name) => { let g = null; for (const r of rows) { if (r.group !== undefined) g = r.group; else if (r.cells && new RegExp(`^(Discussion|Task) ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (Created by|Task Owner)`).test(r.cells[0])) return {group: g, cells: r.cells, started: r.started, closed: r.closed}; } return null; };
    h.rowState = async (name) => h.groupOf(await h.panelRead().catch(() => []), name);
    h.rowMenu = async (name, entry) => {
        const btn = h.row(name).getByRole('button', {name: /More Actions/});
        if (!(await btn.count())) return null;
        await btn.click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        const items = await page.getByRole('menuitem').evaluateAll((els) => els.map((e) => ({text: e.innerText.trim(), disabled: e.getAttribute('aria-disabled') === 'true' || e.hasAttribute('data-disabled'), cls: String(e.className).slice(0, 120), color: getComputedStyle(e).color})));
        if (entry) await page.getByRole('menuitem', {name: entry, exact: true}).click();
        else { await btn.click().catch(() => {}); await page.waitForTimeout(250); }
        return items;
    };
    h.win = () => page.getByRole('dialog').filter({has: page.locator('input[name="title"]')}).last();
    h.editorReady = async () => {
        await page.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => e.initialized && e.getContainer() && e.getContainer().offsetParent !== null), null, {timeout: 20000}).catch(() => L('tinymce not initialized'));
    };
    h.mce = () => page.evaluate(() => (window.tinymce ? window.tinymce.get().filter((e) => e.getContainer() && e.getContainer().offsetParent !== null).map((e) => e.getContent({format: 'text'})) : []));
    h.typeMsg = async (w, text, {replace = false} = {}) => {
        await h.editorReady();
        const body = w.frameLocator('iframe').last().locator('body');
        await body.click();
        if (replace) { await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('Delete'); }
        await page.keyboard.type(text);
    };
    h.openEdit = async (name, entry = 'Edit') => {
        h.step = `${entry} ${name}`;
        const items = await h.rowMenu(name, entry);
        const w = h.win();
        await w.waitFor({timeout: 30000});
        await w.locator('input[name="participants"]').first().waitFor({timeout: 30000}).catch(() => L('edit: no participant boxes'));
        await idle(page);
        await h.editorReady();
        await page.waitForTimeout(600);
        return {w, items};
    };
    h.box = (w, username) => w.locator('label', {hasText: `(${username})`}).locator('input[name="participants"]');
    h.tick = async (w, username, on = true) => { const b = h.box(w, username); if ((await b.count()) === 0) { L('no box for', username); return false; } await b.first().setChecked(on); return true; };
    h.owner = (w, username) => w.locator('label', {hasText: `(${username})`}).locator('input[name="taskInfoAssignee"]');
    h.editRead = (w) => w.evaluate((d) => {
        const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
        const lab = (e) => ((e.closest('label') || {}).innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120);
        const sel = d.querySelector('select');
        return {
            heading: [...d.querySelectorAll('h1, h2')].filter(vis).map((x) => x.innerText.trim()).slice(0, 4),
            name: (d.querySelector('input[name=title]') || {}).value,
            participants: [...d.querySelectorAll('input[name=participants]')].map((e) => ({label: lab(e), checked: e.checked, disabled: e.disabled})),
            dateDue: (d.querySelector('input[name=dateDue]') || {}).value || null,
            owners: [...d.querySelectorAll('input[name=taskInfoAssignee]')].map((e) => ({label: lab(e), checked: e.checked, disabled: e.disabled})),
            startSelect: sel ? {options: [...sel.options].map((o) => o.text.trim()), selected: sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].text.trim()} : null,
            buttons: [...d.querySelectorAll('button')].filter(vis).map((b) => `${(b.getAttribute('aria-label') || b.innerText || '').trim().replace(/\s+/g, ' ')}${b.disabled ? '(dis)' : ''}`).filter((x) => x && x !== '(dis)'),
            text: d.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 3000),
        };
    });
    h.errors = (w) => w.evaluate((root) => [...root.querySelectorAll('.pkpFieldError, .pkpFormErrors, .pkpFormField__error, [role="alert"]')]
        .filter((e) => e.offsetParent !== null && e.innerText.trim()).map((e) => e.innerText.trim().replace(/\s+/g, ' ').slice(0, 300)));
    h.save = async (w, label) => {
        const t0 = Date.now();
        h.step = `save ${label}`;
        await w.getByRole('button', {name: 'Save', exact: true}).click();
        await page.waitForResponse((r) => /\/tasks(\/\d+)?(\/start)?$/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
        await idle(page);
        await page.waitForTimeout(500);
        if (h.answers.some((a) => a.t >= t0 && !/^GET/.test(a.method) && a.status < 300)) await w.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
        const closed = !(await w.isVisible().catch(() => false));
        const errs = closed ? [] : await h.errors(w).catch(() => []);
        const res = {label, closed, errors: errs, answers: h.since(t0)};
        if (!closed) res.dialogText = flat((await h.dialogs()).slice(-1).map((d) => d.text).join(''), 600);
        L('save', label, JSON.stringify(res));
        return res;
    };
    h.cancel = async (w) => {
        if (!(await w.isVisible().catch(() => false))) return null;
        await w.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
        const warn = page.getByRole('dialog', {name: 'Warning'});
        let warned = null;
        await warn.waitFor({timeout: 1500}).then(async () => { warned = flat(await warn.innerText(), 200); await warn.getByRole('button', {name: 'Yes', exact: true}).click(); }).catch(() => {});
        await w.waitFor({state: 'hidden', timeout: 10000}).catch(() => L('window did not close on Cancel'));
        await idle(page);
        return warned;
    };
    h.openItem = async (name) => {
        h.step = `open item ${name}`;
        await h.row(name).getByRole('button', {name, exact: true}).first().click();
        const w = page.getByRole('dialog', {name, exact: true}).last();
        await w.waitFor({timeout: 30000});
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && /Message from|assign yourself/.test(d.innerText) && !/Loading/.test(d.innerText); }, null, {timeout: 30000}).catch(() => L('window text never settled'));
        await idle(page);
        await w.getByRole('group', {name: 'Details'}).getByText(/^1\. /).first().waitFor({timeout: 10000}).catch(() => {});
        await page.waitForTimeout(600);
        return w;
    };
    h.winRead = (w) => w.evaluate((d) => {
        const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
        const details = [...d.querySelectorAll('[role=group]')].find((g) => /Details/.test(g.getAttribute('aria-label') || g.innerText.slice(0, 30)));
        return {
            title: (d.querySelector('h1, h2') || {}).innerText || null,
            badges: [...d.querySelectorAll('[class*="badge"], [class*="Badge"]')].filter(vis).map((b) => b.innerText.trim()).filter((x) => x && x.length < 40),
            details: details ? details.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 1500) : null,
            text: d.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 5000),
            messages: d.innerText.split('Message from').slice(1).map((m) => m.replace(/\s*\n+\s*/g, ' | ').slice(0, 300)),
            files: [...d.querySelectorAll('a[href*="download-file"]')].map((a) => ({text: a.innerText.trim(), href: a.href})),
        };
    });
    h.closeItem = async (w) => {
        await w.getByRole('button', {name: 'Close', exact: true}).last().click({timeout: 5000}).catch(() => {});
        const warn = page.getByRole('dialog', {name: 'Warning'});
        await warn.waitFor({timeout: 1200}).then(() => warn.getByRole('button', {name: 'Yes', exact: true}).click()).catch(() => {});
        await page.waitForTimeout(600);
    };
    h.tickRow = async (name, col, answer, label) => {
        const cell = h.row(name).locator('td').nth(col === 'Started' ? 3 : 4);
        const input = cell.locator('input[type=checkbox]');
        const before = await input.evaluate((c) => ({checked: c.checked, disabled: c.disabled})).catch(() => null);
        const t0 = Date.now();
        await cell.locator('label').click({timeout: 5000}).catch((e) => L('row box click', e.message.slice(0, 120)));
        await page.waitForTimeout(700);
        const dlg = page.getByRole('dialog').filter({hasText: /\?/}).filter({hasNot: page.locator('[data-cy="discussion-manager"]')}).last();
        const shown = await dlg.count() && await dlg.isVisible().catch(() => false);
        const d = shown ? await dlg.innerText().catch(() => null) : null;
        if (shown) {
            await dlg.getByRole('button', {name: answer, exact: true}).click();
            await page.waitForResponse((r) => /\/tasks\/\d+\/(close|open|start)$/.test(r.url()), {timeout: answer === 'Yes' ? 15000 : 2000}).catch(() => null);
        }
        await idle(page); await page.waitForTimeout(800); await idle(page);
        const out = {label, col, before, confirm: d ? flat(d, 300) : null, answers: h.since(t0)};
        h.fact(label, out);
        return out;
    };
    h.history = async (name, label) => {
        h.step = `history ${name}`;
        await h.rowMenu(name, 'History');
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && /History/.test(d.innerText) && /created| by |No Items/.test(d.innerText) && !/Loading/.test(d.innerText); }, null, {timeout: 20000}).catch(() => L('history never filled'));
        await idle(page); await page.waitForTimeout(500);
        const top = h.top();
        const table = await top.evaluate((d) => {
            const t = d.querySelector('table');
            const heads = t ? [...t.querySelectorAll('thead th')].map((th) => ({text: th.innerText.trim(), srOnly: /sr-only|visually-hidden/.test(th.className) || th.getClientRects().length === 0 || th.innerText.trim() === ''})) : [];
            const rows = t ? [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => { const a = td.querySelector('a'); return a ? `${td.innerText.trim()} [link ${a.getAttribute('href') ? 'href' : 'nohref'}]` : td.innerText.trim(); })) : [];
            const hs = [...d.querySelectorAll('h1, h2, h3, p')].slice(0, 4).map((x) => x.innerText.trim());
            return {heads, rows, hs, text: d.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 2500)};
        }).catch((e) => ({error: e.message}));
        await h.snap(label, {table});
        h.fact(label, table);
        await top.getByRole('button', {name: 'Close', exact: true}).first().click({timeout: 5000}).catch(() => {});
        await page.waitForTimeout(700);
        return table;
    };
    h.attachUpload = async (w, label) => {
        await w.getByRole('button', {name: 'Attach Files'}).last().click();
        await idle(page); await page.waitForTimeout(400);
        await h.top().getByRole('button', {name: 'Upload File', exact: true}).first().click();
        await idle(page); await page.waitForTimeout(400);
        await page.locator('input[type="file"]').last().setInputFiles(fixturePath(app));
        await h.top().getByRole('button', {name: /Remove/}).first().waitFor({timeout: 20000}).catch(() => L('upload shows no Remove'));
        await idle(page);
        await h.top().getByRole('button', {name: 'Attach Files', exact: true}).last().click();
        await idle(page); await page.waitForTimeout(500);
    };
    h.add = async ({title, parts = [], untick = [], message, upload, label, readOnly}) => {
        await h.panel().getByRole('button', {name: 'Add', exact: true}).first().click();
        const w = h.win();
        await w.waitFor({timeout: 30000});
        await w.locator('input[name="participants"]').first().waitFor({timeout: 30000}).catch(() => L('add: no participant boxes'));
        await idle(page);
        if (readOnly) { const r = await h.editRead(w); await h.snap(`${label}-add-window`); await h.cancel(w); return r; }
        await w.locator('input[name="title"]').fill(title);
        for (const p of parts) await h.tick(w, p);
        for (const p of untick) await h.tick(w, p, false);
        await h.typeMsg(w, message || `${title} first message`);
        if (upload) await h.attachUpload(w, label);
        await h.snap(`${label}-filled`);
        const r = await h.save(w, label);
        if (!r.closed) { await h.snap(`${label}-refused`); await h.cancel(w); }
        return r;
    };
    h.reply = async (w, text, label, {upload} = {}) => {
        const t0 = Date.now();
        await w.getByRole('button', {name: 'Add New Message'}).click();
        await idle(page);
        await h.editorReady();
        if (upload) await h.attachUpload(w, label);
        await h.typeMsg(w, text);
        await w.getByRole('button', {name: 'Save', exact: true}).last().click();
        await page.waitForResponse((r) => /\/tasks\/\d+\/notes/.test(r.url()) && r.request().method() === 'POST', {timeout: 15000}).catch(() => L('no notes POST'));
        await idle(page); await page.waitForTimeout(800);
        const res = {label, answers: h.since(t0), dialogs: (await h.dialogs()).slice(2).map((d) => d.text.slice(0, 300))};
        L('reply', label, JSON.stringify(res));
        return res;
    };
    h.tasksPanel = async (label) => {
        const bell = page.getByRole('button', {name: /^Tasks/}).first();
        if (!(await bell.count())) return {absent: true};
        const bellName = await bell.innerText().catch(() => null);
        await bell.click();
        const d = page.locator('[role="dialog"]:visible').last();
        await d.waitFor({timeout: 15000}).catch(() => {});
        await page.waitForFunction(() => { const x = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return x && !/Loading/.test(x.innerText) && (x.querySelector('tbody tr, tr.gridRow') || /No Items/.test(x.innerText)); }, null, {timeout: 20000}).catch(() => L('tasks panel never filled'));
        await idle(page); await page.waitForTimeout(800);
        const rows = await d.locator('tr.gridRow, tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 300)).filter(Boolean)).catch(() => []);
        await h.snap(label, {rows, bellName});
        const c = d.getByRole('button', {name: /^Close$/}).first();
        if (await c.count()) { await c.click().catch(() => {}); await idle(page); }
        return {bellName, rows};
    };
    h.wf = () => page.locator('[role="dialog"]:visible').first();
    h.partMenu = async (k, entry, full) => {
        const name = full || NAMES[k];
        const btn = page.getByRole('button', {name: `${name} More Actions`, exact: true}).first();
        if (!(await btn.count())) return {absent: true};
        await btn.click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        const items = (await page.getByRole('menuitem').allInnerTexts()).map((x) => x.trim());
        if (entry) await page.getByRole('menuitem', {name: entry, exact: true}).click();
        else { await btn.click().catch(() => {}); await page.waitForTimeout(250); }
        return {items};
    };
    h.em = (k) => `${u(k)}@mail.test`;
    h.mailCount = (k, opts = {}) => app.mail.count({to: h.em(k), ...opts}).catch(() => -1);
    h.mailFind = async (k, opts = {}) => { try { const m = await app.mail.find({to: h.em(k), timeoutMs: 15000, ...opts}); const f = await app.mail.fullMessage(m.ID); const html = f.HTML || ''; return {subject: f.Subject, from: f.From && f.From.Address, text: (f.Text || '').replace(/\s+/g, ' ').slice(0, 1500), unsubscribe: (html.match(/href=["']([^"']*unsubscribe[^"']*)["']/i) || [])[1] || null}; } catch (e) { return {none: String(e.message).slice(0, 160)}; } };
    return h;
}

// Shared steps: read an item's window (with its message times), its row, its History.
async function readItem(h, name, label) {
    const w = await h.openItem(name);
    await h.snap(label);
    const r = await h.winRead(w);
    await h.closeItem(w);
    h.fact(label, {messages: r.messages, details: r.details});
    return r;
}
async function menuOf(h, name, label) { const m = await h.rowMenu(name); h.fact(`${label} menu`, m ? m.map((x) => x.text) : null); return m ? m.map((x) => x.text) : null; }
// Edit › (change) › Save; then the window read on the same page and after a reload.
async function editAndRead(h, page, {name, label, change, reopen, after}) {
    const {w} = await h.openEdit(name);
    const before = {read: await h.editRead(w), mce: await h.mce()};
    await h.snap(`${label}-edit`);
    h.fact(`${label} edit window`, before);
    await change(w);
    const r = await h.save(w, label);
    if (!r.closed) {
        await h.snap(`${label}-refused`);
        r.saveDisabled = await w.getByRole('button', {name: 'Save', exact: true}).isDisabled().catch(() => null);
        await h.cancel(w);
        h.fact(`${label} refused`, r);
        return r;
    }
    const cur = after || name;
    await page.waitForTimeout(1200);
    r.samePage = (await readItem(h, cur, `${label}-after-same-page`)).messages;
    await reopen();
    r.row = await h.rowState(cur);
    r.afterReload = (await readItem(h, cur, `${label}-after-reload`)).messages;
    h.fact(`${label} result`, r);
    return r;
}

// ---------------------------------------------------------------------------
// Phase cm: the comments-box discussion (Rule 21 bullet 2; 15a, 15c, 15d, 15e; A6, A8, A9, A12)

async function phaseCm(app, X, h, page) {
    h.phase = 'cm';
    const u = h.u;
    const id = X.D.submissionId;
    const comment = `Ks30 comment for the editor ${X.t}`;
    const openEd = () => h.open(h.edUrl(id, h.key1));
    const openAu = () => h.openS1('au', {submissionId: id});
    if (!X.submitted) {
        await signIn(page, u('au'), {contextPath: X.path});
        await page.goto(app.url(`/index.php/${X.path}/en/submission?id=${id}`)); await idle(page);
        await page.locator('.pkpSteps').waitFor({timeout: 30000}).catch(() => {});
        const cur = () => page.locator('.pkpSteps__step__label--current').innerText().catch(() => '');
        const steps = [];
        for (let i = 0; i < 9; i++) {
            const c = (await cur()).trim();
            steps.push(c);
            if (/Review$/.test(c)) break;
            if (h.ops && /Upload Files/.test(c) && !(await page.locator('.submissionWizard').getByRole('link', {name: 'PDF'}).count())) {
                const {addGalleyFile} = require(path.resolve(__dirname, '../../../../../apps/ops/playwright/pages/SubmissionWizardPages.js'));
                await addGalleyFile(page, {label: 'PDF', file: fixturePath(app, 'preprint.pdf')}).catch((x) => h.L('galley', x.message.slice(0, 200)));
            }
            const ifr = page.locator('#commentsForTheEditors-commentsForTheEditors-control_ifr');
            if (await ifr.isVisible().catch(() => false)) {
                await page.waitForFunction(() => window.tinymce && window.tinymce.get('commentsForTheEditors-commentsForTheEditors-control') && window.tinymce.get('commentsForTheEditors-commentsForTheEditors-control').initialized, null, {timeout: 20000}).catch(() => {});
                const body = page.frameLocator('#commentsForTheEditors-commentsForTheEditors-control_ifr').locator('body');
                await body.click(); await body.fill(comment);
                await h.snap('cm-wizard-comments-step');
                steps.push(`comments filled on ${c}`);
            }
            const rel = page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'});
            if (await rel.count()) await rel.check().catch(() => {});
            await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
            await page.waitForTimeout(1500); await idle(page);
        }
        await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
        await page.waitForTimeout(1000);
        const cb = page.getByRole('checkbox', {name: /agree to the copyright statement|agree/}).first();
        if (await cb.count() && !(await cb.isChecked().catch(() => true))) await cb.check().catch(() => {});
        await h.snap('cm-wizard-review');
        h.fact('wizard steps', steps);
        await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click().catch((x) => h.L('submit', x.message.slice(0, 100)));
        const dlg = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
        await dlg.waitFor({timeout: 15000}).catch(() => h.L('no submit dialog'));
        await dlg.getByRole('button', {name: 'Submit', exact: true}).click().catch(() => {});
        await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45000}).catch(() => h.L('no Submission complete'));
        X.submittedAt = Date.now();
        await h.snap('cm-wizard-complete');
        X.submitted = true;
    }
    // 1. The manager's panel, row, window, History.
    await signIn(page, u('mg'), {contextPath: X.path});
    await openEd();
    await h.snap('cm-panel-mg', {panel: await h.panelRead()});
    const names = (await h.panel().locator('[id^="discussion_name_"]').allInnerTexts().catch(() => [])).map((x) => x.trim());
    X.cm = names.find((n) => /Comments for|Cover Note/.test(n));
    X.auto = names.find((n) => n === X.tpl);
    h.fact('panel rows mg', (await h.panelRead()).filter((r) => r.cells).map((r) => r.cells.slice(0, 3)));
    if (!X.cm) { h.L('no comments discussion'); return; }
    let cm = X.cm;
    const r0 = await readItem(h, cm, 'cm-window-mg');
    X.cmTime0 = r0.messages;
    await openEd();
    await h.history(cm, 'cm-history-mg-before');
    await openEd();
    await menuOf(h, cm, 'mg');
    // 2. Every other level's row menu on it.
    const others = h.ops ? ['ed', 'se'] : ['ed', 'se', 'fu'];
    for (const k of others) {
        await signIn(page, u(k), {contextPath: X.path});
        if (k === 'au') await openAu(); else await openEd();
        await h.snap(`cm-panel-${k}`);
        h.fact(`${k} row`, await h.rowState(cm));
        await menuOf(h, cm, k);
    }
    // 3. The submitting Author: menu, History, an unsaved change left by "Cancel", then an edit within the hour.
    await nextMinute(page, X.submittedAt || 0);
    await signIn(page, u('au'), {contextPath: X.path});
    await openAu();
    await h.snap('cm-panel-au', {panel: await h.panelRead()});
    h.fact('au row', await h.rowState(cm));
    const auMenu = await menuOf(h, cm, 'au');
    if (auMenu && auMenu.includes('History')) { await openAu(); await h.history(cm, 'cm-history-au'); await openAu(); }
    if (auMenu && auMenu.includes('Edit')) {
        let e = await h.openEdit(cm);
        await h.typeMsg(e.w, 'Ks30 unsaved text', {replace: true});
        h.fact('au cancel with a change', {warning: await h.cancel(e.w)});
        await page.waitForTimeout(1200);
        h.fact('au window after cancel', (await readItem(h, cm, 'cm-au-cancel-after')).messages);
        await openAu();
        await editAndRead(h, page, {name: cm, label: 'cm-au-edit', reopen: openAu, change: async (w) => { await h.typeMsg(w, 'Ks30 author edited text', {replace: true}); }});
        await openAu();
        await h.history(cm, 'cm-history-au-after');
    }
    // 4. The manager's edit of the same message (a later minute again).
    await nextMinute(page, Date.now() - 1000);
    await signIn(page, u('mg'), {contextPath: X.path});
    await openEd();
    await editAndRead(h, page, {name: cm, label: 'cm-mg-edit', reopen: openEd, change: async (w) => { await h.typeMsg(w, 'Ks30 manager edited text', {replace: true}); }});
    await openEd();
    await h.history(cm, 'cm-history-mg-after');
    // 5. Past the hour (A12, 15c): the first message moved back two hours in the database; the Author's rename and added participant, the manager's rename.
    const upd = sql(app, `update notes set date_created = date_created - interval '2 hours' where assoc_type = 1048586 and assoc_id in (select edit_task_id from edit_tasks where assoc_id = ${id} and title = '${cm.replace(/'/g, "''")}') returning note_id, is_headnote, user_id, date_created`);
    h.fact('backdated', {upd, now: sql(app, 'select now()')});
    await signIn(page, u('au'), {contextPath: X.path});
    await openAu();
    await editAndRead(h, page, {name: cm, label: 'cm-au-rename-past-hour', reopen: openAu, after: `${cm} au`, change: async (w) => { await w.locator('input[name="title"]').fill(`${cm} au`); }});
    await openAu();
    await editAndRead(h, page, {name: cm, label: 'cm-au-add-past-hour', reopen: openAu, change: async (w) => { await h.tick(w, u('mg')); }});
    await signIn(page, u('mg'), {contextPath: X.path});
    await openEd();
    const mgR = await editAndRead(h, page, {name: cm, label: 'cm-mg-rename-past-hour', reopen: openEd, after: `${cm} m`, change: async (w) => { await w.locator('input[name="title"]').fill(`${cm} m`); }});
    if (mgR.closed) cm = `${cm} m`;
    h.fact('restored', sql(app, `update notes set date_created = date_created + interval '2 hours' where assoc_type = 1048586 and assoc_id in (select edit_task_id from edit_tasks where assoc_id = ${id} and title = '${cm.replace(/'/g, "''")}') returning note_id, date_created`));
    // 6. A6: the manager turns it into a task owned by the assistant (OJS/OMP), then by the Author who wrote the message (the control); the owner changes only the due date.
    const owners = h.ops ? ['au'] : ['fu', 'au'];
    let first = true;
    for (const k of owners) {
        await signIn(page, u('mg'), {contextPath: X.path});
        await openEd();
        const e = await h.openEdit(cm, first ? 'Add Task Details' : 'Edit');
        await page.waitForTimeout(600);
        const tb = e.w.getByRole('checkbox', {name: 'Enter task information'});
        if (await tb.count() && !(await tb.isChecked())) await tb.check();
        await page.waitForTimeout(300);
        if (first) await e.w.locator('input[name="dateDue"]').fill(day(7));
        await h.owner(e.w, u(k)).first().check().catch((x) => h.L('owner', k, x.message.slice(0, 100)));
        h.fact(`task details window owner ${k}`, await h.editRead(e.w));
        const s = await h.save(e.w, `cm-owner-${k}`);
        if (!s.closed) { await h.snap(`cm-owner-${k}-refused`); await h.cancel(e.w); continue; }
        first = false;
        await signIn(page, u(k), {contextPath: X.path});
        if (k === 'au') await openAu(); else await openEd();
        await h.snap(`cm-panel-owner-${k}`);
        h.fact(`owner ${k} row`, await h.rowState(cm));
        const m = await menuOf(h, cm, `owner ${k}`);
        if (m && m.includes('Edit')) {
            await editAndRead(h, page, {name: cm, label: `cm-owner-${k}-due`, reopen: () => (k === 'au' ? openAu() : openEd()), change: async (w) => { await w.locator('input[name="dateDue"]').fill(day(9)); }});
        }
    }
    // 7. A8: the Author attaches an upload to the first message, then renames.
    await signIn(page, u('au'), {contextPath: X.path});
    await openAu();
    const up = await editAndRead(h, page, {name: cm, label: 'cm-au-upload', reopen: openAu, change: async (w) => { await h.attachUpload(w, 'cm-au-upload'); }});
    await openAu();
    const ren = await editAndRead(h, page, {name: cm, label: 'cm-au-rename-with-upload', reopen: openAu, after: `${cm} u`, change: async (w) => { await w.locator('input[name="title"]').fill(`${cm} u`); }});
    if (ren.closed) cm = `${cm} u`;
    await openAu();
    h.fact('au row after upload', await h.rowState(cm));
}

// ---------------------------------------------------------------------------
// Phase rec (OJS/OMP): the recommendation discussion (Rule 21 bullet 3; 15e; A9)

async function phaseRec(app, X, h, page) {
    h.phase = 'rec';
    if (h.ops || !X.SRec) return;
    const u = h.u;
    const url = h.edUrl(X.SRec.submissionId, h.roundKey(X.SRec));
    const open = () => h.open(url);
    if (!X.recDone) {
        await signIn(page, u('rc'), {contextPath: X.path});
        await open();
        await page.locator('[data-cy="workflow-action-items"]').getByRole('button', {name: 'Recommend Accept', exact: true}).first().click();
        await page.waitForURL(/\/decision\//, {timeout: 20000}).catch(() => {});
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(1000);
        const rec = page.getByRole('button', {name: /^Record (Decision|Recommendation)$/});
        for (let i = 0; i < 5 && !(await rec.isVisible().catch(() => false)); i++) { await page.getByRole('button', {name: 'Continue', exact: true}).first().click().catch(() => {}); await idle(page); await page.waitForTimeout(800); }
        await rec.first().click();
        await page.waitForTimeout(2500); await idle(page);
        X.recAt = Date.now();
        await h.snap('rec-recorded');
        X.recDone = true;
    }
    await signIn(page, u('se'), {contextPath: X.path});
    await open();
    await h.snap('rec-panel-se', {panel: await h.panelRead()});
    const names = (await h.panel().locator('[id^="discussion_name_"]').allInnerTexts().catch(() => [])).map((x) => x.trim());
    const nm = names.find((n) => /ecommend/i.test(n));
    h.fact('items se', {names, rows: (await h.panelRead()).filter((r) => r.cells).map((r) => r.cells.slice(0, 3))});
    if (!nm) return;
    X.names.rec = nm;
    await readItem(h, nm, 'rec-window-se');
    await open();
    await menuOf(h, nm, 'se');
    await signIn(page, u('rc'), {contextPath: X.path});
    await open();
    await h.snap('rec-panel-rc-before');
    h.fact('rc rows before', (await h.panelRead().catch(() => [])).filter((r) => r.cells).map((r) => r.cells[0]));
    await nextMinute(page, X.recAt || 0);
    // The manager: without the recommender ticked, then with.
    await signIn(page, u('mg'), {contextPath: X.path});
    await open();
    await h.history(nm, 'rec-history-mg-before');
    await open();
    const rcMailBefore = await h.mailCount('rc');
    const r1 = await editAndRead(h, page, {name: nm, label: 'rec-mg-edit', reopen: open, change: async (w) => { await h.typeMsg(w, 'Ks30 recommendation edited by the manager', {replace: true}); }});
    if (!r1.closed) {
        await open();
        await editAndRead(h, page, {name: nm, label: 'rec-mg-edit-rc-ticked', reopen: open, change: async (w) => { await h.tick(w, u('rc')); await h.typeMsg(w, 'Ks30 recommendation edited by the manager', {replace: true}); }});
    }
    await page.waitForTimeout(2000);
    h.fact('rc mail', {before: rcMailBefore, after: await h.mailCount('rc'), latest: await h.mailFind('rc', {contains: 'Ks30 recommendation edited'})});
    await open();
    await h.history(nm, 'rec-history-mg-after');
    // The recommender, once ticked: row, menu, an edit of their own first message.
    await nextMinute(page, Date.now() - 1000);
    await signIn(page, u('rc'), {contextPath: X.path});
    await open();
    await h.snap('rec-panel-rc-after');
    h.fact('rc row after', await h.rowState(nm));
    const m = await menuOf(h, nm, 'rc');
    if (m && m.includes('Edit')) await editAndRead(h, page, {name: nm, label: 'rec-rc-edit', reopen: open, change: async (w) => { await h.typeMsg(w, 'Ks30 recommendation edited by the recommender', {replace: true}); }});
}

// ---------------------------------------------------------------------------
// Phase notify: the Participants "Notify" discussion (Rule 21 bullet 1; 15e; A9), to the Section Editor and to the Author

async function phaseNotify(app, X, h, page) {
    h.phase = 'notify';
    const u = h.u;
    const tplName = X.tpl;
    const openEd = () => h.openS1('mg');
    // A phase re-run (REUSE=1) works on a fresh submission, so earlier "Notify" items cannot be taken for this run's.
    if (X.S1used || process.env.REUSE) X.S1 = await app.api.createSubmission({tag: `${X.t}n${Date.now() % 1000}`, context: X.path, submitter: u('au'), title: `Ks30 S1b ${X.t}`, participants: [{username: u('se'), role: 'sectionEditor'}]});
    X.S1used = true;
    await signIn(page, u('mg'), {contextPath: X.path});
    for (const k of ['se', 'au']) {
        await openEd();
        const rowsOf = async () => (await h.panelRead()).filter((r) => r.cells).map((r) => r.cells[0]);
        const before = await rowsOf();
        const pm = await h.partMenu(k, 'Notify');
        h.fact(`${k} participant menu`, pm);
        if (pm.absent) continue;
        const nw = page.getByRole('dialog').filter({has: page.locator('form select[name="template"]')}).last();
        await nw.waitFor({timeout: 30000}); await idle(page);
        await nw.locator('select[name="template"]').selectOption({label: tplName}).catch((x) => h.L('select', x.message.slice(0, 100)));
        await page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: 20000}).catch(() => {});
        await idle(page); await page.waitForTimeout(800);
        const mid = await nw.locator('textarea[name="message"]').getAttribute('id');
        await page.waitForFunction((i) => window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized, mid, {timeout: 20000}).catch(() => {});
        await page.evaluate(([i, t]) => { window.tinymce.get(i).setContent(`<p>${t}</p>`); window.tinymce.get(i).fire('change'); }, [mid, `Ks30 notify ${k} first text`]);
        await h.snap(`notify-${k}-window`);
        const t0 = Date.now();
        await nw.getByRole('button', {name: 'Notify', exact: true}).click();
        await page.waitForResponse((r) => r.url().includes('send-notification'), {timeout: 30000}).catch(() => h.L('no send-notification'));
        await idle(page);
        h.fact(`notify ${k} answers`, h.since(t0));
        await openEd();
        const added = (await rowsOf()).filter((r) => !before.includes(r));
        h.fact(`notify ${k} added rows`, added);
        const nm = added[0] ? (await h.panel().locator('tbody tr').filter({hasText: added[0]}).first().locator('[id^="discussion_name_"]').innerText().catch(() => '')).trim() : null;
        if (!nm) continue;
        // The auto-added item on S1 carries the same name ("Discussion (…)"): reach this one by its "Created by:" until it is renamed.
        const baseRow = h.row;
        h.row = (name) => h.panel().locator('tbody tr').filter({hasText: `Created by: ${u(k)}`}).filter({has: page.getByRole('button', {name, exact: true})}).first();
        // Rename it at once so the two items differ, through the manager's own Edit (a later minute for the message edit).
        await h.snap(`notify-${k}-panel`, {panel: await h.panelRead()});
        await readItem(h, nm, `notify-${k}-window-item`);
        await openEd();
        const rn = await editAndRead(h, page, {name: nm, label: `notify-${k}-rename`, reopen: openEd, after: `Ks30 notify ${k}`, change: async (w) => { await w.locator('input[name="title"]').fill(`Ks30 notify ${k}`); }}).finally(() => { h.row = baseRow; });
        if (!rn.closed) h.row = baseRow;
        X.names[`notify-${k}`] = `Ks30 notify ${k}`;
    }
    await nextMinute(page, Date.now() - 1000);
    // The manager's message edit on the Section Editor's.
    await openEd();
    await editAndRead(h, page, {name: 'Ks30 notify se', label: 'notify-se-mg-edit', reopen: openEd, change: async (w) => { await h.typeMsg(w, 'Ks30 notify se edited by the manager', {replace: true}); }});
    await openEd();
    await h.history('Ks30 notify se', 'notify-se-history');
    // The Author, whom the row names as its creator: menu and an edit.
    await signIn(page, u('au'), {contextPath: X.path});
    await h.openS1('au');
    await h.snap('notify-au-panel-au');
    h.fact('au row on notify-au', await h.rowState('Ks30 notify au'));
    const m = await menuOf(h, 'Ks30 notify au', 'au on notify-au');
    if (m && m.includes('Edit')) await editAndRead(h, page, {name: 'Ks30 notify au', label: 'notify-au-au-edit', reopen: () => h.openS1('au'), change: async (w) => { await h.typeMsg(w, 'Ks30 notify au edited by the Author', {replace: true}); }});
}

// ---------------------------------------------------------------------------
// Phase auto: the auto-added discussion (Rule 21 bullet 4, td19): its first message through "Edit"

async function phaseAuto(app, X, h, page) {
    h.phase = 'auto';
    const u = h.u;
    const id = X.D.submissionId;
    if (!X.auto) { h.L('no auto item'); return; }
    const open = () => h.open(h.edUrl(id, h.key1));
    await signIn(page, u('mg'), {contextPath: X.path});
    await open();
    await readItem(h, X.auto, 'auto-window-mg');
    await open();
    await editAndRead(h, page, {name: X.auto, label: 'auto-mg-edit', reopen: open, change: async (w) => { await h.tick(w, u('se')); await h.tick(w, u('ed')); await h.typeMsg(w, 'Ks30 auto edited by the manager', {replace: true}); }});
    await open();
    await h.history(X.auto, 'auto-history-mg');
    await signIn(page, u('se'), {contextPath: X.path});
    await open();
    h.fact('se row on auto', await h.rowState(X.auto));
    await menuOf(h, X.auto, 'se on auto');
}

// ---------------------------------------------------------------------------
// Phase autotask (Rule 3, Rule 21 bullet 4): an auto-added *task*, in a context of its own

async function phaseAutotask(app, X, h, page) {
    h.phase = 'autotask';
    const t = tag('u37ks30t');
    const u = (s) => `${t}${s}`;
    const ops = app.name === 'ops';
    const stage = ops ? 'production' : 'submission';
    const C = await app.api.createContext({tag: t, users: [person('mg', t, 'manager'), person('se', t, 'sectionEditor'), person('au', t, 'author')],
        taskTemplates: [{stage, title: 'Ks30 auto task', type: 'task', dueInterval: 'P2W', include: true, message: 'Ks30 auto task text'}]});
    const S = await app.api.createSubmission({tag: `${t}s`, context: C.path, submitter: u('au'), title: `Ks30 T ${t}`, participants: [{username: u('se'), role: 'sectionEditor'}]});
    X.autotask = {path: C.path, id: S.submissionId};
    const open = () => h.open(h.edUrl(S.submissionId, h.key1, C.path));
    await signIn(page, u('mg'), {contextPath: C.path});
    await open();
    await h.snap('autotask-panel-mg', {panel: await h.panelRead()});
    h.fact('rows', (await h.panelRead()).filter((r) => r.cells || r.group));
    h.fact('expected due', day(14));
    await readItem(h, 'Ks30 auto task', 'autotask-window-mg');
    await open();
    await h.history('Ks30 auto task', 'autotask-history-mg');
    await open();
    await menuOf(h, 'Ks30 auto task', 'mg on autotask');
    // "Edit": the message only (no participants ticked), then two participants, an owner and the message.
    await editAndRead(h, page, {name: 'Ks30 auto task', label: 'autotask-mg-edit-message-only', reopen: open, change: async (w) => { await h.typeMsg(w, 'Ks30 auto task edited by the manager', {replace: true}); }});
    await open();
    await editAndRead(h, page, {name: 'Ks30 auto task', label: 'autotask-mg-edit', reopen: open, change: async (w) => { await h.tick(w, u('mg')); await h.tick(w, u('se')); await h.owner(w, u('se')).first().check().catch(() => {}); await h.typeMsg(w, 'Ks30 auto task edited by the manager', {replace: true}); }});
}

// ---------------------------------------------------------------------------
// Phase plain (Rule 15 head, 15a, 15b): "Add Task Details" and "Edit" on an item "Add" made (seeded as "Add" saves it)

async function phasePlain(app, X, h, page) {
    h.phase = 'plain';
    const u = h.u;
    const P = await app.api.createSubmission({tag: `${X.t}p${Date.now() % 1000}`, context: X.path, submitter: u('au'), title: `Ks30 P ${X.t}`, participants: [{username: u('se'), role: 'sectionEditor'}],
        tasks: [{title: 'Ks30 plain', creator: u('mg'), participants: [u('mg'), u('se')], message: 'Ks30 plain first message'}]});
    const open = () => h.open(h.edUrl(P.submissionId, h.key1));
    const createdAt = Date.now();
    await signIn(page, u('mg'), {contextPath: X.path});
    await open();
    await readItem(h, 'Ks30 plain', 'plain-window-before');
    // 15b: "Add Task Details".
    await open();
    const e = await h.openEdit('Ks30 plain', 'Add Task Details');
    await page.waitForTimeout(800);
    const tb = e.w.getByRole('checkbox', {name: 'Enter task information'});
    const ti = e.w.getByText('Task Information', {exact: true}).first();
    h.fact('add task details opened', {boxChecked: await tb.isChecked().catch(() => null), taskInfoInView: await ti.evaluate((el) => { const r = el.getBoundingClientRect(); return {top: Math.round(r.top), inView: r.top >= 0 && r.bottom <= window.innerHeight}; }).catch(() => null), read: await h.editRead(e.w)});
    await h.snap('plain-add-task-details');
    await e.w.locator('input[name="dateDue"]').fill(day(7));
    await h.owner(e.w, u('se')).first().check().catch(() => {});
    const r1 = await h.save(e.w, 'plain-convert');
    h.fact('convert', r1);
    await page.waitForTimeout(1200);
    h.fact('row same page', await h.rowState('Ks30 plain'));
    await open();
    h.fact('row after reload', await h.rowState('Ks30 plain'));
    await menuOf(h, 'Ks30 plain', 'task');
    await open();
    await h.history('Ks30 plain', 'plain-history-after-convert');
    // 15a: one "Edit" changing name, participants (the Author added), due date, owner, message and a file.
    await nextMinute(page, createdAt);
    const mb = {au: await h.mailCount('au'), se: await h.mailCount('se'), mg: await h.mailCount('mg')};
    await open();
    await editAndRead(h, page, {name: 'Ks30 plain', label: 'plain-edit-all', reopen: open, after: 'Ks30 plain renamed', change: async (w) => {
        h.fact('edit window on a task', await h.editRead(w));
        await w.locator('input[name="title"]').fill('Ks30 plain renamed');
        await h.tick(w, u('au'));
        await w.locator('input[name="dateDue"]').fill(day(10));
        await h.owner(w, u('mg')).first().check().catch(() => {});
        await h.typeMsg(w, 'Ks30 plain edited message', {replace: true});
        await h.attachUpload(w, 'plain-edit-all');
    }});
    await page.waitForTimeout(3000);
    h.fact('mail counts', {before: mb, after: {au: await h.mailCount('au'), se: await h.mailCount('se'), mg: await h.mailCount('mg')}, au: await h.mailFind('au', {contains: 'Ks30 plain edited message'})});
    await open();
    await h.history('Ks30 plain renamed', 'plain-history-after-edit');
}

// ---------------------------------------------------------------------------
// Phase notify2 (15c, 15e, A9): a "Notify" discussion sent to the Author (and on OJS/OMP to the assistant),
// its first message moved back two hours in the database, then the recipient's own first "Save" and a second one.

async function phaseNotify2(app, X, h, page) {
    h.phase = 'notify2';
    const u = h.u;
    const parts = [{username: u('se'), role: 'sectionEditor'}];
    if (!h.ops) parts.push({username: u('fu'), role: 'funding'});
    const N = await app.api.createSubmission({tag: `${X.t}m${Date.now() % 1000}`, context: X.path, submitter: u('au'), title: `Ks30 N ${X.t}`, participants: parts});
    const openEd = () => h.open(h.edUrl(N.submissionId, h.key1));
    const openOwn = (k) => (k === 'au' ? h.openS1('au', {submissionId: N.submissionId}) : openEd());
    const baseRow = h.row;
    const who = h.ops ? ['au'] : ['au', 'fu'];
    try {
        for (const k of who) {
            h.row = (name) => h.panel().locator('tbody tr').filter({hasText: `Created by: ${u(k)}`}).filter({has: page.getByRole('button', {name, exact: true})}).first();
            await signIn(page, u('mg'), {contextPath: X.path});
            await openEd();
            const pm = await h.partMenu(k, 'Notify');
            h.fact(`${k} participant menu`, pm);
            if (pm.absent) continue;
            const nw = page.getByRole('dialog').filter({has: page.locator('form select[name="template"]')}).last();
            await nw.waitFor({timeout: 30000}); await idle(page);
            await nw.locator('select[name="template"]').selectOption({label: X.tpl}).catch((x) => h.L('select', x.message.slice(0, 100)));
            await page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: 20000}).catch(() => {});
            await idle(page); await page.waitForTimeout(800);
            const mid = await nw.locator('textarea[name="message"]').getAttribute('id');
            await page.waitForFunction((i) => window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized, mid, {timeout: 20000}).catch(() => {});
            await page.evaluate(([i, t]) => { window.tinymce.get(i).setContent(`<p>${t}</p>`); window.tinymce.get(i).fire('change'); }, [mid, `Ks30 notify2 ${k} text`]);
            await nw.getByRole('button', {name: 'Notify', exact: true}).click();
            await page.waitForResponse((r) => r.url().includes('send-notification'), {timeout: 30000}).catch(() => h.L('no send-notification'));
            await idle(page);
            const upd = sql(app, `update notes set date_created = date_created - interval '2 hours' where assoc_type = 1048586 and assoc_id in (select t.edit_task_id from edit_tasks t join users us on us.user_id = t.created_by where t.assoc_id = ${N.submissionId} and us.username = '${u(k)}') returning note_id, is_headnote, date_created`);
            h.fact(`${k} backdated`, upd);
            await signIn(page, u(k), {contextPath: X.path});
            await openOwn(k);
            await h.snap(`notify2-${k}-panel`);
            h.fact(`${k} row`, await h.rowState(X.tpl));
            const m = await menuOf(h, X.tpl, `${k} on own notify`);
            if (!m || !m.includes('Edit')) continue;
            await readItem(h, X.tpl, `notify2-${k}-window-before`);
            await openOwn(k);
            await editAndRead(h, page, {name: X.tpl, label: `notify2-${k}-edit1`, reopen: () => openOwn(k), change: async (w) => { await h.typeMsg(w, `Ks30 notify2 ${k} first save`, {replace: true}); }});
            await openOwn(k);
            await editAndRead(h, page, {name: X.tpl, label: `notify2-${k}-edit2`, reopen: () => openOwn(k), change: async (w) => { await h.typeMsg(w, `Ks30 notify2 ${k} second save`, {replace: true}); }});
            await openOwn(k);
            await h.history(X.tpl, `notify2-${k}-history`);
        }
    } finally { h.row = baseRow; }
}

// ---------------------------------------------------------------------------
// Phase reply (Rule 4): the "Activity" cell after a reply posted today, on an item "Add" made and on the comments-box discussion

async function phaseReply(app, X, h, page) {
    h.phase = 'reply';
    const u = h.u;
    const R = await app.api.createSubmission({tag: `${X.t}r${Date.now() % 1000}`, context: X.path, submitter: u('au'), title: `Ks30 R ${X.t}`, participants: [{username: u('se'), role: 'sectionEditor'}],
        tasks: [{title: 'Ks30 reply', creator: u('mg'), participants: [u('mg'), u('se')], message: 'Ks30 reply first message'}]});
    const open = () => h.open(h.edUrl(R.submissionId, h.key1));
    await signIn(page, u('mg'), {contextPath: X.path});
    await open();
    h.fact('row before', await h.rowState('Ks30 reply'));
    await signIn(page, u('se'), {contextPath: X.path});
    await open();
    const w = await h.openItem('Ks30 reply');
    h.fact('se reply', await h.reply(w, 'Ks30 reply by se', 'reply-se'));
    await h.closeItem(w);
    await signIn(page, u('mg'), {contextPath: X.path});
    await open();
    await h.snap('reply-panel-mg', {panel: await h.panelRead()});
    h.fact('row after', await h.rowState('Ks30 reply'));
    h.fact('activity cell html', await h.row('Ks30 reply').locator('td').nth(1).evaluate((td) => ({ol: !!td.querySelector('ol'), items: [...td.querySelectorAll('li')].map((li) => li.innerText.trim())})).catch((e) => e.message));
    await open();
    await h.history('Ks30 reply', 'reply-history-mg');
    // The other end of the seven days: the reply's History entry moved back eight days in the database.
    const upd = sql(app, `update event_log set date_logged = date_logged - interval '8 days' where assoc_type = 1048586 and message = 'submission.event.task.notePosted' and assoc_id in (select edit_task_id from edit_tasks where assoc_id = ${R.submissionId} and title = 'Ks30 reply') returning log_id, date_logged`);
    h.fact('reply backdated', upd);
    await open();
    await h.snap('reply-panel-mg-8days', {panel: await h.panelRead()});
    h.fact('row after 8 days', await h.rowState('Ks30 reply'));
    h.fact('activity cell html 8 days', await h.row('Ks30 reply').locator('td').nth(1).evaluate((td) => ({ol: !!td.querySelector('ol'), items: [...td.querySelectorAll('li')].map((li) => li.innerText.trim()), text: td.innerText.trim()})).catch((e) => e.message));
    await open();
    await h.history('Ks30 reply', 'reply-history-mg-8days');
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const xFile = outFile(`x-${app.name}.json`);
    let X;
    if (process.env.REUSE && fs.existsSync(xFile)) X = JSON.parse(fs.readFileSync(xFile, 'utf8'));
    else { X = await seed(app); fs.writeFileSync(xFile, JSON.stringify(X, null, 2)); }
    X.names = X.names || {};
    const facts = {};
    const {page, close} = await launch(app);
    const h = helpers(app, page, X, facts);
    const guard = async (name, fn) => {
        try { await fn(); } catch (e) {
            console.log(`[${app.name} ${name}] FAILED at step "${h.step}": ${String(e.message).split('\n').slice(0, 3).join(' ')}`);
            await h.snap(`fail-${name}`).catch(() => {});
        }
    };
    try {
        for (const [name, fn] of [['cm', phaseCm], ['rec', phaseRec], ['notify', phaseNotify], ['auto', phaseAuto], ['autotask', phaseAutotask], ['plain', phasePlain], ['notify2', phaseNotify2], ['reply', phaseReply]]) {
            if (PHASES.includes(name)) { await guard(name, () => fn(app, X, h, page)); fs.writeFileSync(xFile, JSON.stringify(X, null, 2)); }
        }
    } finally {
        const fFile = outFile(`facts-${app.name}.json`);
        const prev = fs.existsSync(fFile) ? JSON.parse(fs.readFileSync(fFile, 'utf8')) : {};
        fs.writeFileSync(fFile, JSON.stringify({...prev, ...facts}, null, 2));
        fs.writeFileSync(outFile(`answers-${app.name}.json`), JSON.stringify(h.answers, null, 2));
        record('browser-dialogs', h.browserDialogs);
        await close();
    }
});
