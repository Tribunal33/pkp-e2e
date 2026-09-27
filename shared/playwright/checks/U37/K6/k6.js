const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U37 claim check, chunk K6 — "Edit" and "Add Task Details", starting,
// closing and reopening a task or discussion
// (docs/specs/U37-tasks-and-discussions.md, Rules 15–17, register A6, A7,
// A8, A12, A13; to-drive notes td8, td9, td10).
//
// Seeds its own scratch context per app (nothing on publicknowledge):
//   users mg (manager), se, s2 (section editors / moderators), au (author);
//   OJS/OMP ce (copyeditor); OJS ge (guest editor). A first-stage task
//   template with auto-add on gives S1 an ownerless task.
//   S1 — the first stage (OPS: Production), se, s2 (+ge) assigned, items
//        seeded for every rule; SC — Copyediting (OJS/OMP), se and ce.
//
//   PROBE_FEATURE=U37 PROBE_AGENT=ccK6 node bin/probe.js all shared/playwright/checks/U37/K6/k6.js
//   PHASES=window,convert,edit,start,close,limits,upload,notify,expired,extra,noshot (default all);
//   REUSE=1 reuses the last seeded context (x-<app>.json).
//
// The "expired" phase backdates the first message of a few scratch items by
// two hours in the app's test database (psql), the state an hour's wait
// leaves; every other step goes through the screens.
//
// No assertions: every screen is recorded with screen()/shot(); the console
// log carries the facts the report cites (prefix [app phase]); facts-<app>.json
// collects the structured reads.
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const ALL = 'window,convert,edit,start,close,limits,upload,notify,expired,extra,noshot';
const PHASES = (process.env.PHASES || ALL).split(',');
const flat = (s, n = 1500) => (s || '').replace(/\s*\n+\s*/g, ' | ').slice(0, n);
const pad = (n) => String(n).padStart(2, '0');
const day = (n) => { const d = new Date(Date.now() + n * 86400000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const rnd = () => Math.random().toString(36).slice(2, 6);
const FIX = {ojs: 'notes.md', omp: 'notes.md', ops: 'not-an-image.txt'};
const fixturePath = (app) => path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/fixtures/files/${FIX[app.name]}`);
const psql = (app, sql) => { try { return execSync(`psql ${dbName(app.name)} -At -c "${sql.replace(/"/g, '\\"')}"`, {encoding: 'utf8'}).trim(); } catch (e) { return `psql failed: ${String(e.message).split('\n')[0]}`; } };

// ---------------------------------------------------------------------------
// Seeding

async function seed(app) {
    const t = tag('u37k6');
    const u = (s) => `${t}${s}`;
    const ops = app.name === 'ops';
    const ojs = app.name === 'ojs';
    const users = [
        {username: u('mg'), roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
        {username: u('se'), roles: ['sectionEditor'], givenName: 'Sean', familyName: 'Editor'},
        {username: u('s2'), roles: ['sectionEditor'], givenName: 'Sofia', familyName: 'Second'},
        {username: u('au'), roles: ['author'], givenName: 'Ava', familyName: 'Author'},
    ];
    if (!ops) users.push({username: u('ce'), roles: ['copyeditor'], givenName: 'Cora', familyName: 'Copy'});
    if (ojs) users.push({username: u('ge'), roles: ['guestEditor'], givenName: 'Gil', familyName: 'Guest'});
    const C = await app.api.createContext({tag: t, users, taskTemplates: [
        {stage: ops ? 'production' : 'submission', title: 'K6 auto task', type: 'task', dueInterval: 'P1W', include: true, message: 'K6 auto text'},
    ]});
    const X = {t, path: C.path, names: {}};
    const eds = [{username: u('se'), role: 'sectionEditor'}, {username: u('s2'), role: 'sectionEditor'}];
    if (ojs) eds.push({username: u('ge'), role: 'guestEditor'});
    const T = (title, creator, parts, owner, due, started = true, message) => ({title, type: 'task', creator: u(creator), participants: parts.map(u), owner: u(owner), dateDue: day(due), started, message: message || `${title} first message`});
    const D = (title, creator, parts, message) => ({title, creator: u(creator), participants: parts.map(u), message: message || `${title} first message`});
    const tasks = [
        D('K6 Dedit', 'mg', ['mg', 'se', 'au']),
        T('K6 Tedit', 'mg', ['mg', 'se', 'au'], 'se', 7),
        D('K6 Dconv', 'mg', ['mg', 'se', 'au']),
        D('K6 Dtick', 'mg', ['mg', 'se']),
        D('K6 Drow', 'mg', ['mg', 'se']),
        D('K6 Dwin', 'mg', ['mg', 'se']),
        T('K6 Trowstart', 'mg', ['mg', 'se'], 'se', 7, false),
        T('K6 Twinstart', 'mg', ['mg', 'se'], 'se', 7, false),
        T('K6 Tpendclose', 'mg', ['mg', 'se'], 'se', 7, false),
        T('K6 Twindone', 'mg', ['mg', 'se'], 'se', 7, true),
        T('K6 Trowclose', 'mg', ['mg', 'se', 'au'], 'se', 7, true),
        T('K6 Tseown', 'mg', ['mg', 'se'], 'se', 7, true),
        T('K6 Tauown', 'mg', ['mg', 'au'], 'au', 7, true),
        T('K6 Tsecreated', 'se', ['se', 'mg'], 'se', 7, true),
        D('K6 Dau', 'au', ['au', 'se']),
        D('K6 Dauold', 'au', ['au', 'se']),
        D('K6 Dseold', 'se', ['se', 's2']),
    ];
    if (ojs) tasks.push(T('K6 Tgeown', 'mg', ['mg', 'ge'], 'ge', 7, true));
    X.S1 = await app.api.createSubmission({tag: `${t}a`, context: C.path, submitter: u('au'), title: `K6 S1 ${t}`, participants: eds, tasks});
    X.ids = Object.fromEntries((X.S1.tasks || []).map((x) => [x.title, x.id]));
    if (!ops) {
        X.SC = await app.api.createSubmission({tag: `${t}c`, context: C.path, submitter: u('au'), title: `K6 SC ${t}`,
            participants: [{username: u('se'), role: 'sectionEditor'}, {username: u('ce'), role: 'copyeditor'}],
            decisions: app.name === 'omp' ? ['skipInternalReview', 'accept'] : ['skipExternalReview'],
            tasks: [D('K6 Dceold', 'ce', ['ce', 'se'])]});
        for (const x of X.SC.tasks || []) X.ids[x.title] = x.id;
    }
    console.log(`[${app.name} seed]`, JSON.stringify({path: X.path, S1: X.S1.submissionId, SC: X.SC && X.SC.submissionId, ids: X.ids}));
    return X;
}

// ---------------------------------------------------------------------------
// Screen helpers

function helpers(app, page, X, facts) {
    const h = {ops: app.name === 'ops', ojs: app.name === 'ojs'};
    const u = (s) => `${X.t}${s}`;
    h.u = u;
    const L = (...a) => console.log(`[${app.name}${h.phase ? ' ' + h.phase : ''}]`, ...a);
    h.L = L;
    h.fact = (k, v) => { facts[`${h.phase}: ${k}`] = v; L(k, JSON.stringify(v).slice(0, 2500)); };
    h.key1 = h.ops ? 'workflow_5' : 'workflow_1';
    h.edUrl = (id, key) => app.url(`/index.php/${X.path}/en/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    h.auUrl = (id, key) => app.url(`/index.php/${X.path}/en/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    h.panel = () => page.locator('[data-cy="discussion-manager"]:visible').first();
    h.snap = async (name, extra) => { const s = await screen(page); record(name, extra ? {...s, extra} : s); await shot(page, name).catch(() => {}); return s; };
    h.waitPanel = async () => {
        await h.panel().getByRole('button', {name: 'Add', exact: true}).first().waitFor({timeout: 30000}).catch(() => L('no Add button'));
        await page.waitForFunction(() => { const p = [...document.querySelectorAll('[data-cy="discussion-manager"]')].find((e) => e.getClientRects().length); return p && !/Loading/.test(p.innerText); }, null, {timeout: 15000}).catch(() => {});
        await idle(page);
    };
    h.open = async (url, step) => { h.step = step || `open ${url.replace(/^.*index.php/, '')}`; await page.goto(url); await h.waitPanel(); };
    h.openS1 = async (who) => {
        if (who === 'au') {
            if (!h.ops) return h.open(h.auUrl(X.S1.submissionId));
            await page.goto(h.auUrl(X.S1.submissionId)); await idle(page);
            await page.getByRole('link', {name: 'Production Tasks & Discussions'}).first().click().catch(() => L('no author link'));
            return h.waitPanel();
        }
        return h.open(h.edUrl(X.S1.submissionId, h.key1));
    };
    h.openSC = async () => h.open(h.edUrl(X.SC.submissionId, 'workflow_4'));
    // Every tasks / participants / notify answer, with the body of a refusal.
    h.answers = [];
    page.on('response', async (r) => {
        if (!/\/api\/v1\/.*(tasks|participants)|send-notification|fetch-template-body|temporaryFiles/.test(r.url())) return;
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
    // The row of an item, found by its name button (exact).
    h.row = (name) => h.panel().locator('tbody tr').filter({has: page.getByRole('button', {name, exact: true})}).first();
    // The panel as data: every row with its cells and its Started/Closed boxes, group headings included.
    h.panelRead = () => h.panel().evaluate((p) => [...p.querySelectorAll('tbody tr')].map((tr) => {
        const tds = [...tr.querySelectorAll('td, th')];
        const box = (td) => { const i = td && td.querySelector('input[type=checkbox]'); return i ? {checked: i.checked, disabled: i.disabled, hidden: !i.closest('label') || i.closest('label').getClientRects().length === 0} : null; };
        return tds.length < 3 ? {group: tr.innerText.trim()} : {cells: tds.map((td) => td.innerText.trim().replace(/\s+/g, ' ')), started: box(tds[3]), closed: box(tds[4])};
    }));
    h.groupOf = (rows, name) => { let g = null; for (const r of rows) { if (r.group !== undefined) g = r.group; else if (r.cells && r.cells[0].includes(name)) return {group: g, cells: r.cells, started: r.started, closed: r.closed}; } return null; };
    h.rowState = async (name) => h.groupOf(await h.panelRead().catch(() => []), name);
    // "More Actions" of a row: the entries (text, disabled); press `entry` or close the menu again.
    h.rowMenu = async (name, entry) => {
        const btn = h.row(name).getByRole('button', {name: /More Actions/});
        if (!(await btn.count())) return null;
        await btn.click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        const items = await page.getByRole('menuitem').evaluateAll((els) => els.map((e) => ({text: e.innerText.trim(), disabled: e.getAttribute('aria-disabled') === 'true' || e.hasAttribute('data-disabled') || e.disabled === true})));
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
    // Row menu › "Edit" / "Add Task Details": the window, settled.
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
        const lab = (e) => ((e.closest('label') || {}).innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100);
        const sel = d.querySelector('select');
        return {
            heading: [...d.querySelectorAll('h1, h2')].filter(vis).map((x) => x.innerText.trim()).slice(0, 4),
            badges: [...d.querySelectorAll('[class*="badge"], [class*="Badge"]')].filter(vis).map((b) => b.innerText.trim()).filter((x) => x && x.length < 40),
            name: (d.querySelector('input[name=title]') || {}).value,
            participants: [...d.querySelectorAll('input[name=participants]')].map((e) => ({label: lab(e), checked: e.checked, disabled: e.disabled})),
            taskBox: [...d.querySelectorAll('input[type=checkbox]')].filter((e) => /Enter task information/.test(lab(e))).map((e) => ({checked: e.checked, disabled: e.disabled}))[0] || null,
            dateDue: (d.querySelector('input[name=dateDue]') || {}).value || null,
            owners: [...d.querySelectorAll('input[name=taskInfoAssignee]')].map((e) => ({label: lab(e), checked: e.checked, disabled: e.disabled})),
            startSelect: sel ? {options: [...sel.options].map((o) => o.text.trim()), selected: sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].text.trim(), disabled: sel.disabled, visible: vis(sel)} : null,
            files: [...d.querySelectorAll('a[href*="download"], a[href*="submissionFileId"]')].filter(vis).map((a) => a.innerText.trim()),
            buttons: [...d.querySelectorAll('button')].filter(vis).map((b) => `${(b.getAttribute('aria-label') || b.innerText || '').trim().replace(/\s+/g, ' ')}${b.disabled ? '(dis)' : ''}`).filter((x) => x && x !== '(dis)'),
            text: d.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 3000),
        };
    });
    h.errors = (w) => w.evaluate((root) => [...root.querySelectorAll('.pkpFieldError, .pkpFormErrors, .pkpFormField__error, [class*="errorSummary"], [role="alert"]')]
        .filter((e) => e.offsetParent !== null && e.innerText.trim())
        .map((e) => {
            const f = e.closest('.pkpFormField, fieldset, .pkpFormGroup');
            const lab = f ? (f.querySelector('legend, label, .pkpFormFieldLabel, .pkpFormGroup__heading') || {}).innerText : null;
            return {text: e.innerText.trim().replace(/\s+/g, ' ').slice(0, 300), field: (lab || '').trim().split('\n')[0]};
        }));
    // Press the Add/Edit window's "Save": the answers, the errors, whether the window closed.
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
    // The discussion window (from the item's name).
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
        return {
            title: (d.querySelector('h1, h2') || {}).innerText || null,
            badges: [...d.querySelectorAll('[class*="badge"], [class*="Badge"]')].filter(vis).map((b) => b.innerText.trim()).filter((x) => x && x.length < 40),
            text: d.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 5000),
            buttons: [...d.querySelectorAll('button')].filter(vis).map((b) => `${(b.getAttribute('aria-label') || b.innerText || '').trim().replace(/\s+/g, ' ')}${b.disabled || b.getAttribute('aria-disabled') === 'true' ? '(dis)' : ''}`).filter((x) => x && x !== '(dis)'),
            boxes: [...d.querySelectorAll('input[type=checkbox]')].map((c) => ({label: ((c.closest('label') || c.parentElement || {}).innerText || '').trim().slice(0, 80), checked: c.checked, disabled: c.disabled})),
            messages: d.innerText.split('Message from').slice(1).map((m) => m.replace(/\s*\n+\s*/g, ' | ').slice(0, 300)),
        };
    });
    h.closeItem = async (w) => {
        await w.getByRole('button', {name: 'Close', exact: true}).last().click({timeout: 5000}).catch(() => {});
        const warn = page.getByRole('dialog', {name: 'Warning'});
        await warn.waitFor({timeout: 1200}).then(() => warn.getByRole('button', {name: 'Yes', exact: true}).click()).catch(() => {});
        await page.waitForTimeout(600);
    };
    // In the discussion window: press a status box, then "Save".
    h.windowBox = async (name, box, label) => {
        const w = await h.openItem(name);
        const before = await h.winRead(w);
        const cb = w.getByRole('checkbox', {name: box});
        const present = await cb.count();
        const out = {label, box, present, before: before.boxes, badge: before.badges};
        if (!present) { await h.snap(`${label}-nobox`); await h.closeItem(w); h.fact(label, out); return out; }
        const t0 = Date.now();
        await cb.click().catch((e) => { out.clickError = e.message.slice(0, 150); });
        await page.waitForTimeout(700);
        const saveBtn = w.getByRole('button', {name: 'Save', exact: true}).last();
        out.afterClick = {checked: await cb.isChecked().catch(() => null), saveDisabled: await saveBtn.isDisabled().catch(() => null), dialogs: (await h.dialogs()).map((d) => d.name).filter((n) => n !== name)};
        await h.snap(`${label}-ticked`);
        if (out.afterClick.saveDisabled === false) {
            await saveBtn.click();
            await page.waitForResponse((r) => /\/tasks\/\d+\/(start|close|open)$/.test(r.url()), {timeout: 15000}).catch(() => null);
            await idle(page); await page.waitForTimeout(1000);
            out.dialogsAfterSave = (await h.dialogs()).map((d) => d.name).filter((n) => n !== name);
            out.after = await h.winRead(w).catch(() => null);
            await h.snap(`${label}-saved`);
        }
        out.answers = h.since(t0);
        await h.closeItem(w);
        h.fact(label, {...out, after: out.after ? {badges: out.after.badges, boxes: out.after.boxes, text: out.after.text.slice(0, 1400)} : null});
        return out;
    };
    // A row's Started (col 3) / Closed (col 4) box: press its label, answer the confirm.
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
        const dbuttons = shown ? await dlg.getByRole('button').allInnerTexts().catch(() => []) : [];
        await h.snap(`${label}-confirm`, {dialogText: d, dbuttons});
        if (shown) {
            await dlg.getByRole('button', {name: answer, exact: true}).click();
            await page.waitForResponse((r) => /\/tasks\/\d+\/(close|open|start)$/.test(r.url()), {timeout: answer === 'Yes' ? 15000 : 2000}).catch(() => null);
        }
        await idle(page); await page.waitForTimeout(800); await idle(page);
        if (shown) await h.snap(`${label}-answered`);
        const after = await h.rowState(name);
        const out = {label, col, before, confirm: d ? flat(d, 400) : null, dbuttons, answer: shown ? answer : null, answers: h.since(t0), after};
        h.fact(label, out);
        return out;
    };
    h.history = async (name, label) => {
        await h.rowMenu(name, 'History');
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && /History|created|No Items/.test(d.innerText) && !/Loading/.test(d.innerText); }, null, {timeout: 20000}).catch(() => {});
        await idle(page); await page.waitForTimeout(400);
        const s = await h.snap(label);
        const text = s.text.dialog || '';
        const lines = text.split('\n').map((x) => x.trim()).filter((x) => / by |No Items/.test(x));
        h.fact(label, lines);
        const top = page.locator('[role="dialog"]:visible').last();
        await top.getByRole('button', {name: 'Close', exact: true}).first().click({timeout: 5000}).catch(() => {});
        await page.waitForTimeout(700);
        return lines;
    };
    // Attach Files › Upload File › Attach Files, in window w.
    h.attachUpload = async (w, label) => {
        const out = {};
        await w.getByRole('button', {name: 'Attach Files'}).last().click();
        await idle(page); await page.waitForTimeout(400);
        const top = () => page.locator('[role="dialog"]:visible').last();
        out.sources = await top().getByRole('button').allInnerTexts().catch(() => []);
        await top().getByRole('button', {name: 'Upload File', exact: true}).first().click();
        await idle(page); await page.waitForTimeout(400);
        await page.locator('input[type="file"]').last().setInputFiles(fixturePath(app));
        await top().getByRole('button', {name: /Remove/}).first().waitFor({timeout: 20000}).catch(() => L('upload shows no Remove'));
        await idle(page);
        await h.snap(`${label}-upload`);
        await top().getByRole('button', {name: 'Attach Files', exact: true}).last().click();
        await idle(page); await page.waitForTimeout(500);
        out.underBox = flat(await w.innerText().catch(() => ''), 4000).match(/Attach Files.{0,300}/);
        return out;
    };
    // "Add" › fill › Save.
    h.add = async ({title, parts = [], untick = [], task, message, upload, label}) => {
        await h.panel().getByRole('button', {name: 'Add', exact: true}).first().click();
        const w = h.win();
        await w.waitFor({timeout: 30000});
        await w.locator('input[name="participants"]').first().waitFor({timeout: 30000}).catch(() => L('add: no participant boxes'));
        await idle(page);
        await w.locator('input[name="title"]').fill(title);
        for (const p of parts) await h.tick(w, p);
        for (const p of untick) await h.tick(w, p, false);
        if (task) {
            await w.getByRole('checkbox', {name: 'Enter task information'}).check();
            await page.waitForTimeout(300);
            await w.locator('input[name="dateDue"]').fill(task.due);
            await h.owner(w, task.owner).first().check();
            if (task.start === false) await w.locator('select').first().selectOption({label: 'Create Task (Do Not Start)'});
        }
        await h.typeMsg(w, message || `${title} first message`);
        let up = null;
        if (upload) up = await h.attachUpload(w, label);
        await h.snap(`${label}-filled`);
        const r = await h.save(w, label);
        if (!r.closed) { await h.snap(`${label}-refused`); await h.cancel(w); }
        return {...r, upload: up};
    };
    // Mailpit
    h.mailCount = async (who, subject) => app.mail.count({to: `${u(who)}@mail.test`, subject}).catch(() => -1);
    h.mailFind = async (who, opts) => app.mail.find({to: `${u(who)}@mail.test`, timeoutMs: 15000, ...opts}).then((m) => ({subject: m.Subject, snippet: (m.Snippet || '').slice(0, 200)})).catch((e) => ({none: e.message.slice(0, 160)}));
    return h;
}

// ---------------------------------------------------------------------------
// Phase window (Rule 15 head): the Edit and Add Task Details windows, the menus

async function phaseWindow(app, X, h, page) {
    h.phase = 'window';
    const L = h.L;
    await signIn(page, h.u('mg'), {contextPath: X.path});
    await h.openS1('mg');
    const s = await h.snap('win-panel-mg', {panel: await h.panelRead()});
    h.fact('panel heading', flat(s.text.dialog, 300));
    await loc(page, 'panel row by name', h.row('K6 Dedit'));
    const menus = {};
    for (const n of ['K6 Dedit', 'K6 Tedit', 'K6 Trowstart', 'K6 auto task']) menus[n] = await h.rowMenu(n);
    h.fact('menus mg', menus);
    // Edit on a discussion.
    let {w} = await h.openEdit('K6 Dedit');
    await h.snap('win-edit-discussion');
    h.fact('edit window discussion', await h.editRead(w));
    await loc(page, 'Edit window (dialog with input[name=title])', w);
    h.fact('mce on edit', await h.mce());
    // Leave it once with a change: Cancel › Warning.
    await w.locator('input[name="title"]').fill('K6 Dedit changed');
    h.fact('cancel changed edit window', {warning: await h.cancel(w)});
    // Edit on a task.
    ({w} = await h.openEdit('K6 Tedit'));
    await h.snap('win-edit-task');
    h.fact('edit window task', await h.editRead(w));
    await h.cancel(w);
    // Edit on a pending task.
    ({w} = await h.openEdit('K6 Trowstart'));
    await h.snap('win-edit-pending-task');
    h.fact('edit window pending task', await h.editRead(w));
    await h.cancel(w);
    // Add Task Details on a discussion: pre-ticked, scrolled to Task Information.
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    ({w} = await h.openEdit('K6 Dedit', 'Add Task Details'));
    await page.waitForTimeout(1200);
    const scroll = await w.evaluate((d) => {
        const all = [...d.querySelectorAll('*')];
        const sc = all.filter((e) => e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY));
        const head = all.find((e) => e.children.length === 0 && e.innerText && e.innerText.trim() === 'Task Information');
        const name = d.querySelector('input[name=title]');
        const r = (e) => (e ? Math.round(e.getBoundingClientRect().top) : null);
        return {scrollers: sc.map((e) => ({cls: String(e.className).slice(0, 60), scrollTop: e.scrollTop, clientHeight: e.clientHeight})), taskInfoTop: r(head), nameTop: r(name), viewport: window.innerHeight};
    });
    await h.snap('win-addtaskdetails');
    h.fact('add task details window', {...(await h.editRead(w)), scroll});
    await h.cancel(w);
    // The Edit window as the Section Editor on their own task and on the manager's discussion.
    await signIn(page, h.u('se'), {contextPath: X.path});
    await h.openS1('se');
    const mse = {};
    for (const n of ['K6 Dedit', 'K6 Tedit', 'K6 Tsecreated', 'K6 Dseold']) mse[n] = await h.rowMenu(n);
    h.fact('menus se', mse);
    await h.snap('win-panel-se');
    ({w} = await h.openEdit('K6 Tsecreated'));
    await h.snap('win-edit-se-own-task');
    h.fact('edit window se own task', await h.editRead(w));
    await h.cancel(w);
}

// ---------------------------------------------------------------------------
// Phase convert (15b): Add Task Details › Save, and Edit › tick › Save

async function phaseConvert(app, X, h, page) {
    h.phase = 'convert';
    await signIn(page, h.u('mg'), {contextPath: X.path});
    await h.openS1('mg');
    // A reply first, so the conversion has more than one message to keep.
    let iw = await h.openItem('K6 Dconv');
    await iw.getByRole('button', {name: 'Add New Message'}).click();
    await h.typeMsg(iw, 'K6 Dconv reply before conversion');
    await iw.getByRole('button', {name: 'Save', exact: true}).last().click();
    await page.waitForResponse((r) => /\/notes$/.test(r.url()), {timeout: 15000}).catch(() => {});
    await idle(page); await page.waitForTimeout(800);
    h.fact('Dconv before', (await h.winRead(iw)).messages);
    await h.closeItem(iw);
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Dconv row before', await h.rowState('K6 Dconv'));
    let {w} = await h.openEdit('K6 Dconv', 'Add Task Details');
    await w.locator('input[name="dateDue"]').fill(day(5));
    await h.owner(w, h.u('se')).first().check();
    h.fact('Dconv add task details filled', await h.editRead(w));
    await h.snap('conv-atd-filled');
    await h.save(w, 'Add Task Details › Save');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Dconv row after', await h.rowState('K6 Dconv'));
    await h.snap('conv-atd-panel', {panel: await h.panelRead()});
    iw = await h.openItem('K6 Dconv');
    const after = await h.winRead(iw);
    await h.snap('conv-atd-window');
    h.fact('Dconv window after', {badges: after.badges, boxes: after.boxes, messages: after.messages});
    await h.closeItem(iw);
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Dconv menu after', await h.rowMenu('K6 Dconv'));
    ({w} = await h.openEdit('K6 Dconv'));
    await h.snap('conv-atd-edit-again');
    h.fact('Dconv edit after (never turns back)', await h.editRead(w));
    await h.cancel(w);
    await h.history('K6 Dconv', 'conv-atd-history');
    // Edit › tick "Enter task information" › Save, with "Begin Task Upon Saving" left as shown.
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    ({w} = await h.openEdit('K6 Dtick'));
    const tb = w.getByRole('checkbox', {name: 'Enter task information'});
    await tb.check();
    await page.waitForTimeout(400);
    h.fact('Dtick after ticking', await h.editRead(w));
    await w.locator('input[name="dateDue"]').fill(day(6));
    await h.owner(w, h.u('se')).first().check();
    await h.snap('conv-tick-filled');
    await h.save(w, 'Edit › tick › Save');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Dtick row after', await h.rowState('K6 Dtick'));
}

// ---------------------------------------------------------------------------
// Phase edit (15a): everything an Edit › Save rewrites, the emails, the History

async function phaseEdit(app, X, h, page) {
    h.phase = 'edit';
    const L = h.L;
    const newTitle = `K6 Tedit renamed ${rnd()}`;
    X.names = X.names || {};
    X.names.Tedit = newTitle;
    await signIn(page, h.u('mg'), {contextPath: X.path});
    await h.openS1('mg');
    const before = {mg: await h.mailCount('mg', newTitle), se: await h.mailCount('se', newTitle), au: await h.mailCount('au', newTitle), s2: await h.mailCount('s2', newTitle)};
    let {w} = await h.openEdit('K6 Tedit');
    h.fact('Tedit before', await h.editRead(w));
    await w.locator('input[name="title"]').fill(newTitle);
    await h.tick(w, h.u('s2'));
    await h.tick(w, h.u('au'), false);
    await w.locator('input[name="dateDue"]').fill(day(10));
    await h.owner(w, h.u('mg')).first().check();
    await h.typeMsg(w, 'K6 Tedit edited first message', {replace: true});
    const up = await h.attachUpload(w, 'edit-Tedit');
    h.fact('Tedit filled', {...(await h.editRead(w)), upload: up});
    await h.snap('edit-Tedit-filled');
    const r = await h.save(w, 'Tedit full edit');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Tedit row after', await h.rowState(newTitle));
    const s2 = await h.mailFind('s2', {subject: newTitle});
    const after = {mg: await h.mailCount('mg', newTitle), se: await h.mailCount('se', newTitle), au: await h.mailCount('au', newTitle), s2: await h.mailCount('s2', newTitle)};
    h.fact('Tedit mails', {before, after, s2});
    let iw = await h.openItem(newTitle);
    const wr = await h.winRead(iw);
    await h.snap('edit-Tedit-window');
    h.fact('Tedit window after', {text: wr.text.slice(0, 2500), messages: wr.messages});
    await h.closeItem(iw);
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    await h.history(newTitle, 'edit-Tedit-history-1');
    // Second edit: remove the attached file only.
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    ({w} = await h.openEdit(newTitle));
    const ed2 = await h.editRead(w);
    const rm = w.getByRole('button', {name: /Remove/}).first();
    const rmCount = await w.getByRole('button', {name: /Remove/}).count();
    h.fact('Tedit second edit, remove controls', {rmCount, names: await w.getByRole('button', {name: /Remove/}).allInnerTexts().catch(() => []), aria: await w.getByRole('button', {name: /Remove/}).evaluateAll((b) => b.map((x) => x.getAttribute('aria-label'))).catch(() => []), files: ed2.files});
    if (rmCount) { await rm.click(); await page.waitForTimeout(500); }
    await h.snap('edit-Tedit-file-removed');
    await h.save(w, 'Tedit remove file');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    await h.history(newTitle, 'edit-Tedit-history-2');
    // A discussion: rename and change the message only; the window afterwards.
    ({w} = await h.openEdit('K6 Dedit'));
    await h.typeMsg(w, 'K6 Dedit edited first message', {replace: true});
    await h.save(w, 'Dedit message only');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    iw = await h.openItem('K6 Dedit');
    h.fact('Dedit window after', (await h.winRead(iw)).messages);
    await h.closeItem(iw);
}

// ---------------------------------------------------------------------------
// Phase start (Rule 16)

async function phaseStart(app, X, h, page) {
    h.phase = 'start';
    await signIn(page, h.u('mg'), {contextPath: X.path});
    await h.openS1('mg');
    await h.snap('start-panel-before', {panel: await h.panelRead()});
    // Row "Started": No, then Yes.
    await h.tickRow('K6 Trowstart', 'Started', 'No', 'start-row-no');
    await h.row('K6 Trowstart').locator('td').nth(3).screenshot({path: path.join(outDir(), `start-row-no-cell-${app.name}.png`)}).catch(() => {});
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Trowstart after No (reload)', await h.rowState('K6 Trowstart'));
    await h.tickRow('K6 Trowstart', 'Started', 'Yes', 'start-row-yes');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Trowstart after Yes (reload)', await h.rowState('K6 Trowstart'));
    // Pressing the ticked, greyed box again.
    await h.tickRow('K6 Trowstart', 'Started', 'Yes', 'start-row-again');
    let iw = await h.openItem('K6 Trowstart');
    const wr = await h.winRead(iw);
    await h.snap('start-row-window');
    h.fact('Trowstart window', {badges: wr.badges, boxes: wr.boxes, text: wr.text.slice(0, 1600)});
    await h.closeItem(iw);
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    await h.history('K6 Trowstart', 'start-row-history');
    // Window "Start this task" › Save.
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    await h.windowBox('K6 Twinstart', 'Start this task', 'start-window');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Twinstart row after (reload)', await h.rowState('K6 Twinstart'));
    iw = await h.openItem('K6 Twinstart');
    const w2 = await h.winRead(iw);
    h.fact('Twinstart window reopened', {badges: w2.badges, boxes: w2.boxes, text: w2.text.slice(0, 1400)});
    await h.closeItem(iw);
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    await h.history('K6 Twinstart', 'start-window-history');
    // The ownerless auto-added task.
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('auto task row', await h.rowState('K6 auto task'));
    await h.tickRow('K6 auto task', 'Started', 'Yes', 'start-auto-row');
    await h.windowBox('K6 auto task', 'Start this task', 'start-auto-window');
    // Section Editor (the owner) and Author (a participant) on a pending task.
    await signIn(page, h.u('se'), {contextPath: X.path});
    await h.openS1('se');
    h.fact('se sees Tpendclose', await h.rowState('K6 Tpendclose'));
    h.fact('se sees Trowstart', await h.rowState('K6 Trowstart'));
    await h.snap('start-panel-se', {panel: await h.panelRead()});
    await signIn(page, h.u('au'), {contextPath: X.path});
    await h.openS1('au');
    await h.snap('start-panel-au', {panel: await h.panelRead()});
    h.fact('au panel', await h.panelRead());
}

// ---------------------------------------------------------------------------
// Phase close (Rule 17, A13)

async function phaseClose(app, X, h, page) {
    h.phase = 'close';
    await signIn(page, h.u('mg'), {contextPath: X.path});
    await h.openS1('mg');
    const mails0 = {se: await h.mailCount('se', 'K6 Drow'), mg: await h.mailCount('mg', 'K6 Drow')};
    // 17a row: No, Yes, reopen No, reopen Yes.
    await h.tickRow('K6 Drow', 'Closed', 'No', 'close-drow-no');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Drow after No (reload)', await h.rowState('K6 Drow'));
    await h.tickRow('K6 Drow', 'Closed', 'Yes', 'close-drow-yes');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Drow after Yes (reload)', await h.rowState('K6 Drow'));
    h.fact('Drow menu closed', await h.rowMenu('K6 Drow'));
    await h.tickRow('K6 Drow', 'Closed', 'No', 'close-drow-reopen-no');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Drow after reopen No (reload)', await h.rowState('K6 Drow'));
    await h.tickRow('K6 Drow', 'Closed', 'Yes', 'close-drow-reopen-yes');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Drow after reopen Yes (reload)', await h.rowState('K6 Drow'));
    await h.history('K6 Drow', 'close-drow-history');
    // Emails: a reply is the positive control.
    let iw = await h.openItem('K6 Drow');
    await iw.getByRole('button', {name: 'Add New Message'}).click();
    const ctl = `K6ctl${rnd()}`;
    await h.typeMsg(iw, `${ctl} control reply`);
    await iw.getByRole('button', {name: 'Save', exact: true}).last().click();
    await page.waitForResponse((r) => /\/notes$/.test(r.url()), {timeout: 15000}).catch(() => {});
    await idle(page);
    await h.closeItem(iw);
    const ctlMail = await h.mailFind('se', {contains: ctl});
    h.fact('Drow mails', {before: mails0, control: ctlMail, after: {se: await h.mailCount('se', 'K6 Drow'), mg: await h.mailCount('mg', 'K6 Drow')}});
    // 17a window: tick, Save; untick, Save.
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    await h.windowBox('K6 Dwin', 'Close this Discussion', 'close-dwin-close');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Dwin after window close (reload)', await h.rowState('K6 Dwin'));
    await h.windowBox('K6 Dwin', 'Close this Discussion', 'close-dwin-reopen');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Dwin after window reopen (reload)', await h.rowState('K6 Dwin'));
    await h.history('K6 Dwin', 'close-dwin-history');
    // 17b: a pending task closed from the row; a started one from the row; one from the window.
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    await h.tickRow('K6 Tpendclose', 'Closed', 'Yes', 'close-tpend-row');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Tpendclose after (reload)', await h.rowState('K6 Tpendclose'));
    await h.tickRow('K6 Trowclose', 'Closed', 'No', 'close-trow-no');
    await h.tickRow('K6 Trowclose', 'Closed', 'Yes', 'close-trow-yes');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Trowclose after (reload)', await h.rowState('K6 Trowclose'));
    await h.windowBox('K6 Twindone', 'Complete this task', 'close-twin-complete');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    h.fact('Twindone after (reload)', await h.rowState('K6 Twindone'));
    await h.history('K6 Trowclose', 'close-trow-history');
    await h.history('K6 Tpendclose', 'close-tpend-history');
    await h.history('K6 Twindone', 'close-twin-history');
    // 17c: a closed task, row and window, for mg, then the owner, a participant and admin.
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    const closedFor = async (who) => {
        const out = {row: await h.rowState('K6 Trowclose'), menu: await h.rowMenu('K6 Trowclose')};
        const press = await h.tickRow('K6 Trowclose', 'Closed', 'Yes', `close-trow-press-${who}`);
        out.press = {confirm: press.confirm, answers: press.answers, after: press.after};
        const w = await h.openItem('K6 Trowclose');
        const r = await h.winRead(w);
        out.window = {badges: r.badges, boxes: r.boxes, buttons: r.buttons};
        const cb = w.getByRole('checkbox', {name: 'Complete this task'});
        if (await cb.count()) { await cb.click({timeout: 3000}).catch((e) => { out.windowPress = e.message.split('\n')[0].slice(0, 120); }); await page.waitForTimeout(500); out.windowAfterPress = {checked: await cb.isChecked().catch(() => null), save: await w.getByRole('button', {name: 'Save', exact: true}).last().isDisabled().catch(() => null)}; }
        await h.snap(`close-trow-window-${who}`);
        await h.closeItem(w);
        h.fact(`closed task for ${who}`, out);
        return out;
    };
    await closedFor('mg');
    // The closed discussion window, for comparison.
    await h.tickRow('K6 Drow', 'Closed', 'Yes', 'close-drow-again');
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    iw = await h.openItem('K6 Drow');
    const dw = await h.winRead(iw);
    h.fact('closed discussion window mg', {badges: dw.badges, boxes: dw.boxes, buttons: dw.buttons, text: dw.text.slice(0, 1200)});
    await h.snap('close-drow-window-closed');
    await h.closeItem(iw);
    await signIn(page, h.u('se'), {contextPath: X.path});
    await h.openS1('se');
    await closedFor('se-owner');
    await signIn(page, h.u('au'), {contextPath: X.path});
    await h.openS1('au');
    await closedFor('au-participant');
    await signIn(page, 'admin', {contextPath: X.path});
    await h.open(h.edUrl(X.S1.submissionId, h.key1));
    await closedFor('admin');
}

// ---------------------------------------------------------------------------
// Phase limits (15c, A6, A7; td8)

async function phaseLimits(app, X, h, page) {
    h.phase = 'limits';
    const L = h.L;
    const editDue = async (who, name, label, open) => {
        await open();
        const menu = await h.rowMenu(name);
        if (!menu || !menu.some((m) => m.text === 'Edit')) { h.fact(label, {menu, note: 'no Edit'}); await h.snap(`${label}-nomenu`); return null; }
        const {w} = await h.openEdit(name);
        await h.snap(`${label}-window`);
        const before = await h.editRead(w);
        await w.locator('input[name="dateDue"]').fill(day(9));
        const r = await h.save(w, label);
        if (!r.closed) { await h.snap(`${label}-refused`); await h.cancel(w); }
        await open();
        const row = await h.rowState(name);
        h.fact(label, {who, menu, beforeDue: before.dateDue, save: r, rowAfter: row});
        return r;
    };
    // td8: the manager adds a task for an assistant (OJS/OMP: Copyeditor on Copyediting; OPS: the Author on Production).
    const tdTitle = `K6 td8 ${rnd()}`;
    X.names.td8 = tdTitle;
    await signIn(page, h.u('mg'), {contextPath: X.path});
    if (h.ops) {
        await h.openS1('mg');
        await h.add({title: tdTitle, parts: [h.u('au')], task: {due: day(7), owner: h.u('au')}, label: 'td8-add'});
        await signIn(page, h.u('au'), {contextPath: X.path});
        await editDue('au', tdTitle, 'td8-au-owner-edit', () => h.openS1('au'));
    } else {
        await h.openSC();
        await h.add({title: tdTitle, parts: [h.u('ce')], task: {due: day(7), owner: h.u('ce')}, label: 'td8-add'});
        await h.openSC();
        h.fact('td8 row (mg)', await h.rowState(tdTitle));
        await signIn(page, h.u('ce'), {contextPath: X.path});
        await editDue('ce', tdTitle, 'td8-ce-owner-edit', () => h.openSC());
        // The Author as owner on a journal / press (seeded).
        await signIn(page, h.u('au'), {contextPath: X.path});
        await editDue('au', 'K6 Tauown', 'a6-au-owner-edit', () => h.openS1('au'));
    }
    // Section Editor (Moderator) as owner of the manager's task: the control.
    await signIn(page, h.u('se'), {contextPath: X.path});
    await editDue('se', 'K6 Tseown', 'a6-se-owner-edit', () => h.openS1('se'));
    if (h.ojs) {
        await signIn(page, h.u('ge'), {contextPath: X.path});
        await editDue('ge', 'K6 Tgeown', 'a6-ge-owner-edit', () => h.openS1('ge'));
    }
    // The Author on their own discussion, within the hour: rename only.
    await signIn(page, h.u('au'), {contextPath: X.path});
    await h.openS1('au');
    let {w} = await h.openEdit('K6 Dau');
    await h.snap('limits-au-own-window');
    await w.locator('input[name="title"]').fill('K6 Dau renamed');
    const r = await h.save(w, 'au own discussion within the hour, rename');
    if (!r.closed) await h.cancel(w);
    await h.openS1('au');
    h.fact('Dau after', await h.rowState('K6 Dau renamed'));
}

// ---------------------------------------------------------------------------
// Phase upload (15d, A8; td9)

async function phaseUpload(app, X, h, page) {
    h.phase = 'upload';
    const title = `K6 td9 ${rnd()}`;
    X.names.td9 = title;
    await signIn(page, h.u('au'), {contextPath: X.path});
    await h.openS1('au');
    const add = await h.add({title, parts: [h.u('se')], upload: true, label: 'td9-add'});
    h.fact('td9 add', add);
    await h.openS1('au');
    let iw = await h.openItem(title);
    h.fact('td9 window', (await h.winRead(iw)).messages);
    await h.closeItem(iw);
    await h.openS1('au');
    let {w} = await h.openEdit(title);
    await h.snap('td9-edit-window');
    h.fact('td9 edit window', await h.editRead(w));
    await w.locator('input[name="title"]').fill(`${title} renamed`);
    const r = await h.save(w, 'td9 author rename');
    if (!r.closed) {
        await h.snap('td9-edit-refused');
        h.fact('td9 refusal summary (incl. hidden)', await w.evaluate((d) => [...d.querySelectorAll('[class*="rror"]')].map((e) => ({text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 200), visible: e.getClientRects().length > 0})).filter((x) => x.text)).catch(() => null));
        // "Jump to next error": where it goes.
        const jump = w.getByRole('button', {name: /Jump to next error/}).or(w.getByRole('link', {name: /Jump to next error/})).first();
        if (await jump.count()) {
            await jump.click().catch(() => {});
            await page.waitForTimeout(600);
            h.fact('td9 jump to next error', await page.evaluate(() => ({active: document.activeElement ? `${document.activeElement.tagName}#${document.activeElement.id}.${String(document.activeElement.className).slice(0, 60)}` : null})));
        }
        // The way out an Author has: remove the file from the message, then Save.
        let rm = w.getByRole('button', {name: /Remove/}).first();
        const sb = () => w.getByRole('button', {name: 'Save', exact: true}).isDisabled().catch(() => null);
        const st = {afterRefusal: await sb()};
        if (await rm.count()) { await rm.click(); await page.waitForTimeout(400); st.afterRemove = await sb(); }
        await w.locator('input[name="title"]').fill(`${title} renamed`); await page.waitForTimeout(300);
        st.afterNameTouched = await sb();
        h.fact('td9 Save state after the refusal', st);
        if (st.afterNameTouched !== false) {
            // A fresh Edit window: remove the file, rename, Save.
            await h.cancel(w);
            await h.openS1('au');
            ({w} = await h.openEdit(title));
            await w.locator('input[name="title"]').fill(`${title} renamed`);
            rm = w.getByRole('button', {name: /Remove/}).first();
            if (await rm.count()) { await rm.click(); await page.waitForTimeout(400); }
        }
        {
            const r2 = await h.save(w, 'td9 author rename after removing the file');
            if (!r2.closed) await h.cancel(w);
            else {
                await h.openS1('au');
                const cur = (await h.rowState(`${title} renamed`)) ? `${title} renamed` : title;
                const iw2 = await h.openItem(cur);
                h.fact('td9 window after the file was removed', (await h.winRead(iw2)).messages);
                await h.closeItem(iw2);
                X.names.td9 = cur;
            }
        }
    }
    // The manager edits the same discussion: the control.
    await signIn(page, h.u('mg'), {contextPath: X.path});
    await h.openS1('mg');
    const cur = X.names.td9;
    ({w} = await h.openEdit(cur));
    await w.locator('input[name="title"]').fill(`${title} mg`);
    const rm = await h.save(w, 'td9 manager rename');
    if (!rm.closed) await h.cancel(w);
    // An assigned Copyeditor with an upload (OJS/OMP): the assistant control.
    if (!h.ops) {
        const t2 = `K6 ce upload ${rnd()}`;
        await signIn(page, h.u('ce'), {contextPath: X.path});
        await h.openSC();
        await h.add({title: t2, parts: [h.u('se')], upload: true, label: 'ce-upload-add'});
        await h.openSC();
        ({w} = await h.openEdit(t2));
        await w.locator('input[name="title"]').fill(`${t2} renamed`);
        const rc = await h.save(w, 'ce upload rename');
        if (!rc.closed) { await h.snap('ce-upload-edit-refused'); await h.cancel(w); }
    }
}

// ---------------------------------------------------------------------------
// Phase notify (15e td10; A6's recorded creator)

async function phaseNotify(app, X, h, page) {
    h.phase = 'notify';
    const L = h.L;
    const notify = async (targetName, text, label) => {
        const before = (await h.panelRead()).filter((r) => r.cells).map((r) => r.cells[0]);
        const more = page.getByRole('button', {name: `${targetName} More Actions`, exact: true}).first();
        await more.click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        await page.getByRole('menuitem', {name: 'Notify', exact: true}).click();
        const nw = page.getByRole('dialog').filter({has: page.locator('form select[name="template"]')}).last();
        await nw.waitFor({timeout: 30000}); await idle(page);
        const opts = await nw.locator('select[name="template"] option').evaluateAll((els) => els.map((o) => o.text.trim()));
        const want = opts.find((o) => /^Discussion \(/.test(o)) || opts.find((o) => o);
        await nw.locator('select[name="template"]').selectOption({label: want});
        await page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: 20000}).catch(() => {});
        await idle(page); await page.waitForTimeout(800);
        const id = await nw.locator('textarea[name="message"]').getAttribute('id');
        await page.waitForFunction((i) => window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized, id, {timeout: 20000}).catch(() => {});
        await page.evaluate(([i, t]) => { window.tinymce.get(i).setContent(`<p>${t}</p>`); window.tinymce.get(i).fire('change'); }, [id, text]);
        const body = page.frameLocator(`#${id}_ifr`).locator('body');
        await body.click(); await page.keyboard.press('End');
        await h.snap(`${label}-notify-window`);
        const t0 = Date.now();
        await nw.getByRole('button', {name: 'Notify', exact: true}).click();
        await page.waitForResponse((r) => r.url().includes('send-notification'), {timeout: 30000}).catch(() => L('no send-notification'));
        await idle(page);
        await page.goto(page.url()); await h.waitPanel();
        const afterRows = (await h.panelRead()).filter((r) => r.cells).map((r) => r.cells[0]);
        const added = afterRows.filter((r) => !before.includes(r));
        h.fact(`${label} notify`, {template: want, options: opts, answers: h.since(t0), added});
        const btnName = added[0] ? await h.panel().locator('tbody tr').filter({hasText: added[0]}).first().locator('[id^="discussion_name_"]').innerText().catch(() => null) : null;
        return btnName ? btnName.trim() : null;
    };
    await signIn(page, h.u('mg'), {contextPath: X.path});
    await h.openS1('mg');
    // td10: to the Section Editor, "First text"; then Edit › "Second text".
    const d10 = await notify('Sean Editor', 'First text', 'td10');
    h.fact('td10 discussion', d10);
    if (d10) {
        await h.snap('td10-panel', {panel: await h.panelRead()});
        let iw = await h.openItem(d10);
        h.fact('td10 window before', (await h.winRead(iw)).messages);
        await h.closeItem(iw);
        await h.openS1('mg');
        await h.history(d10, 'td10-history-before');
        const {w} = await h.openEdit(d10);
        await h.snap('td10-edit-window');
        h.fact('td10 edit window', {...(await h.editRead(w)), mce: await h.mce()});
        await h.typeMsg(w, 'Second text', {replace: true});
        await h.save(w, 'td10 Second text');
        await h.openS1('mg');
        iw = await h.openItem(d10);
        const after = await h.winRead(iw);
        await h.snap('td10-window-after');
        h.fact('td10 window after', after.messages);
        await h.closeItem(iw);
        await h.openS1('mg');
        await h.history(d10, 'td10-history-after');
    }
    // A6's recorded creator: the manager notifies the Author; the Author edits it.
    await h.openS1('mg');
    const da = await notify('Ava Author', 'K6 note to the author', 'a6rc');
    h.fact('a6rc discussion', da);
    if (da) {
        await h.snap('a6rc-panel-mg', {panel: await h.panelRead()});
        await signIn(page, h.u('au'), {contextPath: X.path});
        await h.openS1('au');
        await h.snap('a6rc-panel-au', {panel: await h.panelRead()});
        const menu = await h.rowMenu(da);
        h.fact('a6rc author menu', menu);
        if (menu && menu.some((m) => m.text === 'Edit')) {
            const {w} = await h.openEdit(da);
            await h.snap('a6rc-edit-window');
            await w.locator('input[name="title"]').fill(`${da} by author`);
            const r = await h.save(w, 'a6rc author rename');
            if (!r.closed) { await h.snap('a6rc-refused'); await h.cancel(w); }
            await h.openS1('au');
            const cur = (await h.rowState(`${da} by author`)) ? `${da} by author` : da;
            const iw = await h.openItem(cur);
            h.fact('a6rc window after', (await h.winRead(iw)).messages);
            await h.closeItem(iw);
        }
    }
}

// ---------------------------------------------------------------------------
// Phase expired (15c past the hour, A12, A7's second key): notes backdated two hours

async function phaseExpired(app, X, h, page) {
    h.phase = 'expired';
    const ids = ['K6 Dauold', 'K6 Dseold', 'K6 Dceold'].map((n) => X.ids[n]).filter(Boolean);
    const upd = psql(app, `update notes set date_created = date_created - interval '2 hours' where assoc_type = 1048586 and assoc_id in (${ids.join(',')}) returning assoc_id, date_created, is_headnote`);
    h.fact('backdated', {ids, upd, now: psql(app, 'select now()')});
    const tryEdit = async (who, name, label, open, change) => {
        await signIn(page, h.u(who), {contextPath: X.path});
        await open();
        const menu = await h.rowMenu(name);
        if (!menu || !menu.some((m) => m.text === 'Edit')) { h.fact(label, {menu, note: 'no Edit'}); return null; }
        const {w} = await h.openEdit(name);
        await change(w);
        const r = await h.save(w, label);
        if (!r.closed) { await h.snap(`${label}-refused`); await h.cancel(w); } else await h.snap(`${label}-saved`);
        return r;
    };
    // The Author, past the hour: add a participant only; rename only.
    await tryEdit('au', 'K6 Dauold', 'exp-au-add-participant', () => h.openS1('au'), async (w) => { await h.tick(w, h.u('mg')); });
    await tryEdit('au', 'K6 Dauold', 'exp-au-rename', () => h.openS1('au'), async (w) => { await w.locator('input[name="title"]').fill('K6 Dauold renamed'); });
    // The Copyeditor past the hour (OJS/OMP).
    if (!h.ops) await tryEdit('ce', 'K6 Dceold', 'exp-ce-rename', () => h.openSC(), async (w) => { await w.locator('input[name="title"]').fill('K6 Dceold renamed'); });
    // Controls: the Section Editor on their own, the manager on the Author's.
    await tryEdit('se', 'K6 Dseold', 'exp-se-rename', () => h.openS1('se'), async (w) => { await w.locator('input[name="title"]').fill('K6 Dseold renamed'); });
    await tryEdit('mg', 'K6 Dauold', 'exp-mg-rename-au', () => h.openS1('mg'), async (w) => { await w.locator('input[name="title"]').fill('K6 Dauold by manager'); });
}



// Phase noshot: the row box after "No", as the eye sees it (a closed discussion, reopen › No)
async function phaseNoshot(app, X, h, page) {
    h.phase = 'noshot';
    await signIn(page, h.u('mg'), {contextPath: X.path});
    await h.openS1('mg');
    const cell = h.row('K6 Drow').locator('td').nth(4);
    await cell.screenshot({path: path.join(outDir(), `noshot-before-${app.name}.png`)}).catch(() => {});
    await h.tickRow('K6 Drow', 'Closed', 'No', 'noshot-drow-reopen-no');
    await cell.screenshot({path: path.join(outDir(), `noshot-after-no-${app.name}.png`)}).catch(() => {});
    h.fact('cell html after No', await cell.evaluate((td) => td.innerHTML.replace(/\s+/g, ' ').slice(0, 800)));
}

// ---------------------------------------------------------------------------
// Phase extra (A6 "or the participants"): the Author owner ticks one more participant only

async function phaseExtra(app, X, h, page) {
    h.phase = 'extra';
    const name = h.ops ? X.names.td8 : 'K6 Tauown';
    await signIn(page, h.u('au'), {contextPath: X.path});
    await h.openS1('au');
    const {w} = await h.openEdit(name);
    await h.tick(w, h.u('se'));
    const r = await h.save(w, 'a6-au-owner-participant-only');
    if (!r.closed) { await h.snap('a6-au-owner-participant-only-refused'); await h.cancel(w); }
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const xFile = path.join(outDir(), `x-${app.name}.json`);
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
        for (const [name, fn] of [['window', phaseWindow], ['convert', phaseConvert], ['edit', phaseEdit], ['start', phaseStart], ['close', phaseClose],
            ['limits', phaseLimits], ['upload', phaseUpload], ['notify', phaseNotify], ['expired', phaseExpired], ['extra', phaseExtra], ['noshot', phaseNoshot]]) {
            if (PHASES.includes(name)) { await guard(name, () => fn(app, X, h, page)); fs.writeFileSync(xFile, JSON.stringify(X, null, 2)); }
        }
    } finally {
        const fFile = path.join(outDir(), `facts-${app.name}.json`);
        const prev = fs.existsSync(fFile) ? JSON.parse(fs.readFileSync(fFile, 'utf8')) : {};
        fs.writeFileSync(fFile, JSON.stringify({...prev, ...facts}, null, 2));
        fs.writeFileSync(path.join(outDir(), `answers-${app.name}.json`), JSON.stringify(h.answers, null, 2));
        record('browser-dialogs', h.browserDialogs);
        await close();
    }
});
