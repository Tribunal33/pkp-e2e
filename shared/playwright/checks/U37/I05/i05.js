// U37 claim check, chunk I05 (housekeeping 2026-10-05) — three incidentals rows:
//   R018 (A24, Rule 14a): "Attach Files" › "Workflow Files" › "Select submission
//        stage" for a Copyeditor, a Layout Editor, a Section Editor and the
//        Journal Manager (OJS, OMP); a preprint server's "Production" list with
//        and without a galley (OPS).
//   R024 (Rule 15b, A28; Rule 21 recommendation bullet): whose username
//        follows "Task created by" after someone other than the writer turns a
//        discussion into a task (both routes); the recommendation discussion's
//        refusals of a manager's "Edit" › "Save" with one deciding editor and
//        with two (OJS, OMP).
//   R070 (EditorialTaskController's 'api.403.forbidden' refusals): the states
//        the screens reach them from: a reply sent from a window opened before
//        the writer was taken off the participants (a manager-level writer and
//        a Section Editor), and a reviewer's "Add" after the review was
//        cancelled with the review form open (OJS, OMP).
//
// Seeds its own scratch context per app (nothing on publicknowledge).
//   PROBE_FEATURE=U37 PROBE_AGENT=ccI05 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U37/I05/i05.js
//   PHASES=wf,conv,conv2,rec,raw (default all); REUSE=1 reuses x-<run>-<app>.json (outFile).
// No assertions: every screen is recorded with screen()/shot(); facts-<run>-<app>.json
// collects the structured reads; the console log carries them too.
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outFile, rawKeys} = require('../../../probe');

const ALL = 'wf,conv,conv2,rec,raw';
const PHASES = (process.env.PHASES || ALL).split(',');
const flat = (s, n = 1500) => (s == null ? null : String(s).replace(/\s*\n+\s*/g, ' | ').replace(/[ \t]+/g, ' ').trim().slice(0, n));
const pad = (n) => String(n).padStart(2, '0');
const day = (n) => { const d = new Date(Date.now() + n * 86400000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const NAMES = {mg: 'Mona Manager', se: 'Sean Editor', s2: 'Sofia Second', rc: 'Rico Recommender', au: 'Ava Author', ce: 'Cora Copy', le: 'Leo Layout', r1: 'Rhea Reviewer'};
const person = (k, t, role) => { const [g, f] = NAMES[k].split(' '); return {username: `${t}${k}`, roles: [role], givenName: g, familyName: f}; };

// ---------------------------------------------------------------------------
// Seeding

async function seed(app) {
    const t = tag('u37i05');
    const u = (s) => `${t}${s}`;
    const ops = app.name === 'ops';
    const omp = app.name === 'omp';
    const users = [person('mg', t, 'manager'), person('se', t, 'sectionEditor'), person('s2', t, 'sectionEditor'), person('au', t, 'author')];
    if (!ops) users.push(person('rc', t, 'sectionEditor'), person('ce', t, 'copyeditor'), person('le', t, 'layoutEditor'), person('r1', t, 'externalReviewer'));
    const C = await app.api.createContext({tag: t, users});
    const X = {t, path: C.path, names: {}};
    const base = {context: C.path, submitter: u('au')};
    const se = {username: u('se'), role: 'sectionEditor'};
    // R018: a submission at Production with files on the earlier stages.
    if (ops) {
        X.SP = await app.api.createSubmission({...base, tag: `${t}p`, title: `I05 SP ${t}`, participants: [se]});
        X.SPg = await app.api.createSubmission({...base, tag: `${t}g`, title: `I05 SPg ${t}`, participants: [se], galleys: [{label: 'PDF', file: 'preprint.pdf'}]});
    } else {
        X.SP = await app.api.createSubmission({...base, tag: `${t}p`, title: `I05 SP ${t}`, files: [{file: 'article.pdf'}],
            participants: [se, {username: u('ce'), role: 'copyeditor'}, {username: u('le'), role: 'layoutEditor'}],
            decisions: omp ? ['sendInternalReview', 'sendExternalReview', 'accept', 'sendToProduction'] : ['sendExternalReview', 'accept', 'sendToProduction'],
            reviewRounds: omp ? [{files: [{file: 'article.pdf'}]}, {files: [{file: 'article.pdf'}]}] : [{files: [{file: 'article.pdf'}]}]});
        // The other end of the submission's stage: the same people on a submission still at Copyediting.
        X.SC = await app.api.createSubmission({...base, tag: `${t}c`, title: `I05 SC ${t}`, files: [{file: 'article.pdf'}],
            participants: [se, {username: u('ce'), role: 'copyeditor'}, {username: u('le'), role: 'layoutEditor'}],
            decisions: omp ? ['sendInternalReview', 'sendExternalReview', 'accept'] : ['sendExternalReview', 'accept'],
            reviewRounds: omp ? [{files: [{file: 'article.pdf'}]}, {files: [{file: 'article.pdf'}]}] : [{files: [{file: 'article.pdf'}]}]});
    }
    // R024 conversion and R070 stale replies: the first stage's panel.
    const disc = (title, creator, parts) => ({title, creator: u(creator), participants: parts.map(u), message: `${title} first message`});
    X.names = {convA: `I05 conv A ${t}`, convB: `I05 conv B ${t}`, staleM: `I05 stale M ${t}`, staleS: `I05 stale S ${t}`};
    X.S1 = await app.api.createSubmission({...base, tag: `${t}a`, title: `I05 S1 ${t}`, participants: [se, {username: u('s2'), role: 'sectionEditor'}],
        tasks: [disc(X.names.convA, 'au', ['au', 'se']), disc(X.names.convB, 'au', ['au', 'se']),
            disc(X.names.staleM, 'se', ['se', 'mg', 's2']), disc(X.names.staleS, 'mg', ['mg', 'se', 's2'])]});
    // R024 recommendation: one deciding editor, then two; R070 reviewer.
    if (!ops) {
        X.SRec1 = await app.api.createSubmission({...base, tag: `${t}q`, title: `I05 SRec1 ${t}`, decisions: ['sendExternalReview'],
            participants: [se, {username: u('rc'), role: 'sectionEditor', recommendOnly: true}]});
        X.SRec2 = await app.api.createSubmission({...base, tag: `${t}w`, title: `I05 SRec2 ${t}`, decisions: ['sendExternalReview'],
            participants: [se, {username: u('s2'), role: 'sectionEditor'}, {username: u('rc'), role: 'sectionEditor', recommendOnly: true}]});
        X.SR = await app.api.createSubmission({...base, tag: `${t}r`, title: `I05 SR ${t}`, decisions: ['sendExternalReview'], participants: [se],
            reviewRounds: [{files: [{file: 'article.pdf'}], reviewers: [{username: u('r1'), status: 'accepted'}]}]});
    }
    const ids = {};
    for (const k of ['SP', 'SPg', 'SC', 'S1', 'SRec1', 'SRec2', 'SR']) if (X[k]) ids[k] = X[k].submissionId;
    console.log(`[${app.name} seed]`, JSON.stringify({path: X.path, ids, tasks: X.S1.tasks}));
    return X;
}

// ---------------------------------------------------------------------------
// Screen helpers

function helpers(app, page, X, facts) {
    const h = {ops: app.name === 'ops', page};
    const u = (s) => `${X.t}${s}`;
    h.u = u;
    const L = (...a) => console.log(`[${app.name}${h.phase ? ' ' + h.phase : ''}]`, ...a);
    h.L = L;
    h.fact = (k, v) => { facts[`${h.phase}: ${k}`] = v; L(k, JSON.stringify(v).slice(0, 3000)); };
    h.key1 = h.ops ? 'workflow_5' : 'workflow_1';
    h.edUrl = (id, key) => app.url(`/index.php/${X.path}/en/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    h.roundKey = (S, i = 0) => `workflow_${S.reviewRounds[i].stageId}_${S.reviewRounds[i].id}`;
    h.answers = [];
    h.browserDialogs = [];
    h.attach = (pg, who) => {
        pg.on('response', async (r) => {
            if (!/\/api\/v1\/|\$\$\$call\$\$\$/.test(r.url())) return;
            const req = r.request();
            const e = {t: Date.now(), who, method: `${req.method()}${req.headers()['x-http-method-override'] ? '→' + req.headers()['x-http-method-override'] : ''}`, url: r.url().replace(/^.*\/api\/v1/, '').replace(/^.*\$\$\$call\$\$\$/, ''), status: r.status()};
            if (r.status() >= 400) e.body = (await r.text().catch(() => '')).slice(0, 600);
            h.answers.push(e);
        });
        pg.on('dialog', async (d) => {
            h.browserDialogs.push({who, type: d.type(), message: d.message(), step: h.step || '-', phase: h.phase});
            if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
        });
    };
    h.attach(page, 'A');
    h.since = (t0, all = false) => h.answers.filter((a) => a.t >= t0 && (all || !/^GET/.test(a.method) || a.status >= 400)).map((a) => `${a.who} ${a.method} ${a.url} ${a.status}${a.body ? ' ' + a.body.slice(0, 400) : ''}`);
    h.snap = async (name, extra, pg = page) => { const s = await screen(pg); record(name, extra ? {...s, extra} : s); await shot(pg, name).catch(() => {}); return s; };
    h.panel = (pg = page) => pg.locator('[data-cy="discussion-manager"]:visible').first();
    h.waitPanel = async (pg = page) => {
        await h.panel(pg).getByRole('button', {name: 'Add', exact: true}).first().waitFor({timeout: 30000}).catch(() => L('no Add button'));
        await pg.waitForFunction(() => { const p = [...document.querySelectorAll('[data-cy="discussion-manager"]')].find((e) => e.getClientRects().length); return p && !/Loading/.test(p.innerText); }, null, {timeout: 15000}).catch(() => {});
        await idle(pg);
    };
    h.open = async (url, pg = page) => { h.step = `open ${url.replace(/^.*index.php/, '')}`; await pg.goto(url); await h.waitPanel(pg); };
    h.dialogs = (pg = page) => pg.evaluate(() => [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length > 0).map((d) => ({name: d.getAttribute('aria-label') || (d.querySelector('h1,h2') || {}).innerText || '', text: d.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 1500)})));
    h.top = (pg = page) => pg.locator('[role="dialog"]:visible').last();
    h.row = (name, pg = page) => h.panel(pg).locator('tbody tr').filter({has: pg.getByRole('button', {name, exact: true})}).first();
    h.panelRead = (pg = page) => h.panel(pg).evaluate((p) => [...p.querySelectorAll('tbody tr')].map((tr) => {
        const tds = [...tr.querySelectorAll('td, th')];
        const box = (td) => { const i = td && td.querySelector('input[type=checkbox]'); return i ? {checked: i.checked, disabled: i.disabled} : null; };
        return tds.length < 3 ? {group: tr.innerText.trim()} : {cells: tds.map((td) => td.innerText.trim().replace(/\s+/g, ' ')), started: box(tds[3]), closed: box(tds[4])};
    }));
    h.rowState = async (name, pg = page) => {
        const rows = await h.panelRead(pg).catch(() => []);
        let g = null;
        for (const r of rows) { if (r.group !== undefined) g = r.group; else if (r.cells && r.cells[0].includes(name)) return {group: g, cells: r.cells, started: r.started, closed: r.closed}; }
        return null;
    };
    h.rowMenu = async (name, entry, pg = page) => {
        const btn = h.row(name, pg).getByRole('button', {name: /More Actions/});
        if (!(await btn.count())) return null;
        await btn.click();
        await pg.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        const items = (await pg.getByRole('menuitem').allInnerTexts()).map((x) => x.trim());
        if (entry) await pg.getByRole('menuitem', {name: entry, exact: true}).click();
        else { await pg.keyboard.press('Escape').catch(() => {}); await pg.waitForTimeout(250); }
        return items;
    };
    h.win = (pg = page) => pg.getByRole('dialog').filter({has: pg.locator('input[name="title"]')}).last();
    h.editorReady = async (pg = page) => {
        await pg.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => e.initialized && e.getContainer() && e.getContainer().offsetParent !== null), null, {timeout: 20000}).catch(() => L('tinymce not initialized'));
    };
    h.typeMsg = async (w, text, {replace = false, pg = page} = {}) => {
        await h.editorReady(pg);
        const body = w.frameLocator('iframe').last().locator('body');
        await body.click();
        if (replace) { await pg.keyboard.press('ControlOrMeta+a'); await pg.keyboard.press('Delete'); }
        await pg.keyboard.type(text);
    };
    h.openEdit = async (name, entry = 'Edit', pg = page) => {
        h.step = `${entry} ${name}`;
        const items = await h.rowMenu(name, entry, pg);
        const w = h.win(pg);
        await w.waitFor({timeout: 30000});
        await w.locator('input[name="participants"]').first().waitFor({timeout: 30000}).catch(() => L('edit: no participant boxes'));
        await idle(pg);
        await h.editorReady(pg);
        await pg.waitForTimeout(600);
        return {w, items};
    };
    h.box = (w, username) => w.locator('label', {hasText: `(${username})`}).locator('input[name="participants"]');
    h.tick = async (w, username, on = true) => { const b = h.box(w, username); if ((await b.count()) === 0) { L('no box for', username); return false; } await b.first().setChecked(on); return true; };
    h.owner = (w, username) => w.locator('label', {hasText: `(${username})`}).locator('input[name="taskInfoAssignee"]');
    h.editRead = (w) => w.evaluate((d) => {
        const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
        const lab = (e) => ((e.closest('label') || {}).innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120);
        const sel = d.querySelector('select');
        const tb = [...d.querySelectorAll('input[type=checkbox]')].find((e) => /Enter task information/.test(lab(e)));
        return {
            heading: [...d.querySelectorAll('h1, h2')].filter(vis).map((x) => x.innerText.trim()).slice(0, 4),
            name: (d.querySelector('input[name=title]') || {}).value,
            participants: [...d.querySelectorAll('input[name=participants]')].map((e) => ({label: lab(e), checked: e.checked, disabled: e.disabled})),
            taskBox: tb ? {checked: tb.checked, disabled: tb.disabled} : null,
            dateDue: (d.querySelector('input[name=dateDue]') || {}).value || null,
            owners: [...d.querySelectorAll('input[name=taskInfoAssignee]')].map((e) => ({label: lab(e), checked: e.checked, disabled: e.disabled})),
            startSelect: sel ? {options: [...sel.options].map((o) => o.text.trim()), selected: sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].text.trim(), disabled: sel.disabled} : null,
            buttons: [...d.querySelectorAll('button')].filter(vis).map((b) => `${(b.getAttribute('aria-label') || b.innerText || '').trim().replace(/\s+/g, ' ')}${b.disabled ? '(dis)' : ''}`).filter((x) => x && x !== '(dis)'),
        };
    });
    h.errors = (w) => w.evaluate((root) => [...root.querySelectorAll('.pkpFieldError, .pkpFormErrors, .pkpFormField__error, [role="alert"]')]
        .filter((e) => e.offsetParent !== null && e.innerText.trim()).map((e) => e.innerText.trim().replace(/\s+/g, ' ').slice(0, 300)));
    h.save = async (w, label, pg = page) => {
        const t0 = Date.now();
        h.step = `save ${label}`;
        await w.getByRole('button', {name: 'Save', exact: true}).click();
        await pg.waitForResponse((r) => /\/tasks(\/\d+)?(\/start)?$/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
        await idle(pg);
        await pg.waitForTimeout(500);
        if (h.answers.some((a) => a.t >= t0 && !/^GET/.test(a.method) && a.status < 300)) await w.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
        const closed = !(await w.isVisible().catch(() => false));
        const errs = closed ? [] : await h.errors(w).catch(() => []);
        const res = {label, closed, errors: errs, answers: h.since(t0)};
        if (!closed) res.dialogText = flat((await h.dialogs(pg)).slice(-1).map((d) => d.text).join(''), 900);
        L('save', label, JSON.stringify(res));
        return res;
    };
    h.cancel = async (w, pg = page) => {
        if (!(await w.isVisible().catch(() => false))) return null;
        await w.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
        const warn = pg.getByRole('dialog', {name: 'Warning'});
        let warned = null;
        await warn.waitFor({timeout: 1500}).then(async () => { warned = flat(await warn.innerText(), 300); await warn.getByRole('button', {name: 'Yes', exact: true}).click(); }).catch(() => {});
        await w.waitFor({state: 'hidden', timeout: 10000}).catch(() => L('window did not close on Cancel'));
        await idle(pg);
        return warned;
    };
    h.openItem = async (name, pg = page) => {
        h.step = `open item ${name}`;
        await h.row(name, pg).getByRole('button', {name, exact: true}).first().click();
        const w = pg.getByRole('dialog', {name, exact: true}).last();
        await w.waitFor({timeout: 30000});
        await pg.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && /Message from|assign yourself/.test(d.innerText) && !/Loading/.test(d.innerText); }, null, {timeout: 30000}).catch(() => L('window text never settled'));
        await idle(pg);
        await pg.waitForTimeout(600);
        return w;
    };
    h.winRead = (w) => w.evaluate((d) => {
        const details = [...d.querySelectorAll('[role=group]')].find((g) => /Details/.test(g.getAttribute('aria-label') || g.innerText.slice(0, 30)));
        return {
            title: (d.querySelector('h1, h2') || {}).innerText || null,
            details: details ? details.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 1500) : null,
            text: d.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 5000),
            messages: d.innerText.split('Message from').slice(1).map((m) => m.replace(/\s*\n+\s*/g, ' | ').slice(0, 300)),
        };
    });
    h.closeItem = async (w, pg = page) => {
        await w.getByRole('button', {name: 'Close', exact: true}).last().click({timeout: 5000}).catch(() => {});
        const warn = pg.getByRole('dialog', {name: 'Warning'});
        await warn.waitFor({timeout: 1200}).then(() => warn.getByRole('button', {name: 'Yes', exact: true}).click()).catch(() => {});
        await pg.waitForTimeout(600);
    };
    h.history = async (name, label) => {
        h.step = `history ${name}`;
        const m = await h.rowMenu(name, 'History');
        if (!m || !m.includes('History')) { h.fact(label, {menu: m, history: 'not offered'}); return null; }
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && /History/.test(d.innerText) && /created| by |No Items/.test(d.innerText) && !/Loading/.test(d.innerText); }, null, {timeout: 20000}).catch(() => L('history never filled'));
        await idle(page); await page.waitForTimeout(500);
        const table = await h.top().evaluate((d) => {
            const t = d.querySelector('table');
            const rows = t ? [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim().replace(/\s+/g, ' '))) : [];
            return {rows, text: d.innerText.replace(/\s*\n+\s*/g, ' | ').slice(0, 2500)};
        }).catch((e) => ({error: e.message}));
        await h.snap(label, {table});
        h.fact(label, table);
        await h.top().getByRole('button', {name: 'Close', exact: true}).first().click({timeout: 5000}).catch(() => {});
        await page.waitForTimeout(700);
        return table;
    };
    return h;
}

// ---------------------------------------------------------------------------
// Phase wf (R018; Rule 14a, A24, OPS2): the "Workflow Files" stage list.

async function readStages(h, label, pg) {
    const page = pg || h.page;
    const wf = page.getByRole('dialog', {name: 'Workflow Files', exact: true}).last();
    const sel = wf.getByRole('combobox', {name: 'Select submission stage'});
    await sel.waitFor({timeout: 30000});
    await idle(page); await page.waitForTimeout(600);
    const out = {
        initialValue: await sel.inputValue(),
        initialLabel: await sel.evaluate((s) => (s.options[s.selectedIndex] || {}).text || null),
        options: await sel.locator('option').evaluateAll((os) => os.map((o) => ({label: o.textContent.trim(), value: o.value, disabled: o.disabled, color: getComputedStyle(o).color, title: o.title || null}))),
        initialText: flat(await wf.innerText()),
        perStage: {},
    };
    await h.snap(`${label}-01-list`);
    for (const o of out.options) {
        const r = {disabled: o.disabled};
        r.choose = await sel.selectOption({label: o.label}, {timeout: 2500}).then(() => 'chosen').catch((e) => flat(e.message, 90));
        await idle(page); await page.waitForTimeout(800);
        r.valueAfter = await sel.inputValue();
        r.headings = (await wf.getByRole('heading').allInnerTexts()).map((x) => flat(x));
        r.fileBoxes = await wf.getByRole('checkbox').count();
        r.fileLabels = (await wf.getByRole('checkbox').evaluateAll((bs) => bs.map((b) => ((b.closest('label, tr, li') || {}).innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100)))).slice(0, 10);
        r.noItems = await wf.getByText('No Items', {exact: true}).count();
        r.text = flat(await wf.innerText(), 800);
        out.perStage[o.label] = r;
        await h.snap(`${label}-02-${o.label.replace(/\W+/g, '-').toLowerCase()}`);
    }
    // The keyboard, as a person's arrow keys walk the list from the last option.
    await sel.focus();
    const keys = [];
    for (let i = 0; i < out.options.length; i++) { await page.keyboard.press('ArrowUp'); keys.push(await sel.inputValue()); }
    out.keyboardArrowUpValues = keys;
    await loc(page, 'Workflow Files: Select submission stage', sel);
    return out;
}

async function openWorkflowFiles(h, box) {
    const page = h.page;
    await box.getByRole('button', {name: 'Attach Files'}).last().click();
    const attach = page.getByRole('dialog', {name: 'Attach Files', exact: true}).last();
    await attach.waitFor({timeout: 20000});
    await idle(page);
    const offered = await attach.getByRole('button', {name: 'Attach Workflow Files', exact: true}).count();
    if (!offered) return {offered: 0, attachText: flat(await attach.innerText(), 600)};
    await attach.getByRole('button', {name: 'Attach Workflow Files', exact: true}).click();
    await idle(page);
    return {offered};
}

async function backOut(h) {
    for (let i = 0; i < 4; i++) {
        const d = (await h.dialogs()).slice(-1)[0];
        if (!d || !/Attach|Upload|Workflow/.test(d.name || d.text.slice(0, 80))) return;
        const b = h.top().getByRole('button', {name: /^(Back|Close|Cancel)$/}).last();
        if (!(await b.count())) return;
        await b.click().catch(() => {});
        await idle(h.page); await h.page.waitForTimeout(400);
    }
}

async function phaseWf(app, X, h, page) {
    h.phase = 'wf';
    const u = h.u;
    const who = h.ops ? [['mg', 'workflow_5', X.SP], ['se', 'workflow_5', X.SP], ['mg', 'workflow_5', X.SPg]]
        : [['ce', 'workflow_4', X.SP], ['le', 'workflow_5', X.SP], ['se', 'workflow_4', X.SP], ['mg', 'workflow_5', X.SP], ['ce', 'workflow_4', X.SC], ['le', 'workflow_4', X.SC], ['se', 'workflow_4', X.SC]];
    for (const [k, key, S] of who) {
        const label = `wf-${k}-${key}${S === X.SPg ? '-galley' : ''}${S === X.SC ? '-sc' : ''}`;
        await signIn(page, u(k), {contextPath: X.path});
        await h.open(h.edUrl(S.submissionId, key));
        await h.snap(`${label}-panel`);
        if (!(await h.panel().getByRole('button', {name: 'Add', exact: true}).count())) { h.fact(`${label} Add window`, {panel: 'no panel', main: flat(await page.locator('[role=dialog]:visible').last().innerText().catch(() => ''), 400)}); continue; }
        await h.panel().getByRole('button', {name: 'Add', exact: true}).first().click();
        const w = h.win();
        await w.waitFor({timeout: 30000});
        await w.locator('input[name="participants"]').first().waitFor({timeout: 30000}).catch(() => h.L('no participant boxes'));
        await idle(page); await h.editorReady();
        const o = await openWorkflowFiles(h, w);
        let r = {offered: o.offered, attachText: o.attachText};
        if (o.offered) {
            r = {...r, ...(await readStages(h, label))};
            // "Attach Selected" pressed with nothing ticked: what it does.
            const t0 = Date.now();
            const wfd = page.getByRole('dialog', {name: 'Workflow Files', exact: true}).last();
            const ab = wfd.getByRole('button', {name: 'Attach Selected', exact: true});
            r.attachSelectedEmpty = {present: await ab.count(), disabled: await ab.isDisabled().catch(() => null)};
            if (r.attachSelectedEmpty.present && !r.attachSelectedEmpty.disabled) {
                await ab.click().catch(() => {});
                await idle(page); await page.waitForTimeout(800);
                const s = await h.snap(`${label}-03-attach-selected-empty`);
                r.attachSelectedEmpty.after = {dialogs: (await h.dialogs()).map((d) => d.name), notices: s.notices, answers: h.since(t0, true), chips: flat(await w.innerText().catch(() => ''), 300)};
            }
        }
        h.fact(`${label} Add window`, r);
        // Leave with something changed and unsaved: a file ticked in an enabled list (or a name typed), then out.
        const wfDlg = page.getByRole('dialog', {name: 'Workflow Files', exact: true}).last();
        let picked = null;
        if (o.offered) {
            const cur = r.options && r.options.find((x) => !x.disabled && r.perStage[x.label] && r.perStage[x.label].fileBoxes);
            if (cur) {
                await wfDlg.getByRole('combobox', {name: 'Select submission stage'}).selectOption({label: cur.label}).catch(() => {});
                await idle(page); await page.waitForTimeout(500);
                await wfDlg.getByRole('checkbox').first().check().catch(() => {});
                const attachBtn = wfDlg.getByRole('button', {name: /^Attach/}).last();
                picked = {stage: cur.label, button: await attachBtn.innerText().catch(() => null)};
                await attachBtn.click().catch(() => {});
                await idle(page); await page.waitForTimeout(600);
                picked.chips = flat(await w.innerText().catch(() => ''), 900);
            }
        }
        await backOut(h);
        await w.locator('input[name="title"]').fill(`I05 unsaved ${k}`);
        await h.snap(`${label}-changed-unsaved`);
        const warned = await h.cancel(w);
        h.fact(`${label} leave unsaved`, {picked, warned, browserDialogs: h.browserDialogs.slice(-2)});
    }
    if (h.ops) return;
    // The footnote's path: the Copyeditor's reply box on a saved discussion.
    await signIn(page, u('ce'), {contextPath: X.path});
    await h.open(h.edUrl(X.SP.submissionId, 'workflow_4'));
    const nm = `I05 wf reply ${X.t}`;
    if (!(await h.rowState(nm))) {
        await h.panel().getByRole('button', {name: 'Add', exact: true}).first().click();
        const w = h.win();
        await w.waitFor({timeout: 30000});
        await w.locator('input[name="participants"]').first().waitFor({timeout: 30000}).catch(() => {});
        await idle(page);
        await w.locator('input[name="title"]').fill(nm);
        await h.tick(w, u('se'));
        await h.typeMsg(w, 'I05 copyedit notes');
        h.fact('ce discussion save', await h.save(w, 'ce discussion'));
        await h.open(h.edUrl(X.SP.submissionId, 'workflow_4'));
    }
    const iw = await h.openItem(nm);
    await iw.getByRole('button', {name: 'Add New Message'}).click();
    await idle(page); await h.editorReady();
    const o = await openWorkflowFiles(h, iw);
    let r = {offered: o.offered};
    if (o.offered) r = {...r, ...(await readStages(h, 'wf-ce-reply'))};
    h.fact('wf-ce-reply', r);
    await backOut(h);
    await h.closeItem(iw);
}

// ---------------------------------------------------------------------------
// Phase conv (R024; Rule 15b, A28): whose name follows "Task created by".

async function phaseConv(app, X, h, page) {
    h.phase = 'conv';
    const u = h.u;
    const url = h.edUrl(X.S1.submissionId, h.key1);
    const {convA, convB} = X.names;
    await signIn(page, u('mg'), {contextPath: X.path});
    await h.open(url);
    await h.snap('conv-panel-before', {panel: await h.panelRead()});
    h.fact('rows before', {A: await h.rowState(convA), B: await h.rowState(convB)});
    await h.history(convA, 'conv-A-history-before');
    // A: the Journal Manager's "Add Task Details" on the Author's discussion.
    await h.open(url);
    let {w, items} = await h.openEdit(convA, 'Add Task Details');
    h.fact('A menu (mg)', items);
    h.fact('A Add Task Details window', await h.editRead(w));
    await w.locator('input[name="dateDue"]').fill(day(7));
    await h.owner(w, u('se')).first().check();
    await h.snap('conv-A-filled');
    h.fact('A save', await h.save(w, 'A Add Task Details'));
    await page.waitForTimeout(800);
    h.fact('A row same page', await h.rowState(convA));
    await h.history(convA, 'conv-A-history-same-page');
    await h.open(url);
    h.fact('A row after reload', await h.rowState(convA));
    await h.history(convA, 'conv-A-history-after-reload');
    // The assigned Section Editor, a participant who did not write it: no row menu (Actors, "May manage the item").
    await signIn(page, u('se'), {contextPath: X.path});
    await h.open(url);
    h.fact('B row menu (se)', await h.rowMenu(convB));
    await h.snap('conv-se-panel', {panel: await h.panelRead()});
    // B: the Journal Manager's "Edit" › "Enter task information" on the Author's discussion.
    await signIn(page, u('mg'), {contextPath: X.path});
    await h.open(url);
    await h.history(convB, 'conv-B-history-before');
    await h.open(url);
    ({w, items} = await h.openEdit(convB, 'Edit'));
    h.fact('B menu (mg)', items);
    await w.getByRole('checkbox', {name: 'Enter task information'}).check();
    await page.waitForTimeout(400);
    await w.locator('input[name="dateDue"]').fill(day(8));
    await h.owner(w, u('au')).first().check();
    h.fact('B edit window ticked', await h.editRead(w));
    await h.snap('conv-B-filled');
    h.fact('B save', await h.save(w, 'B Edit tick'));
    await page.waitForTimeout(800);
    await h.history(convB, 'conv-B-history-same-page');
    await h.open(url);
    h.fact('B row after reload', await h.rowState(convB));
    await h.history(convB, 'conv-B-history-after-reload');
    // The Author, the writer, reads the same History.
    await signIn(page, u('au'), {contextPath: X.path});
    const auUrl = app.url(`/index.php/${X.path}/en/dashboard/mySubmissions?workflowSubmissionId=${X.S1.submissionId}`);
    await page.goto(auUrl); await idle(page);
    if (h.ops) await page.getByRole('link', {name: 'Production Tasks & Discussions'}).first().click().catch(() => h.L('no author link'));
    await h.waitPanel();
    await h.snap('conv-au-panel', {panel: await h.panelRead()});
    const m = await h.rowMenu(convA);
    h.fact('A menu (au)', m);
    if (m && m.includes('History')) await h.history(convA, 'conv-A-history-au');
}

// Phase conv2 (after conv): the converted items' menus and messages, as the
// Journal Manager (who converted both) and the Author (who wrote both).
async function phaseConv2(app, X, h, page) {
    h.phase = 'conv2';
    const u = h.u;
    const url = h.edUrl(X.S1.submissionId, h.key1);
    await signIn(page, u('mg'), {contextPath: X.path});
    for (const nm of [X.names.convA, X.names.convB]) {
        await h.open(url);
        h.fact(`${nm.split(' ')[2]} menu (mg)`, await h.rowMenu(nm));
        await h.open(url);
        const iw = await h.openItem(nm);
        await h.snap(`conv2-${nm.split(' ')[2]}-window-mg`);
        const r = await h.winRead(iw);
        h.fact(`${nm.split(' ')[2]} window (mg)`, {messages: r.messages, taskInfo: (r.text.match(/Task Information.{0,300}/) || [''])[0]});
        await h.closeItem(iw);
    }
}

// ---------------------------------------------------------------------------
// Phase rec (R024; Rule 21 recommendation bullet): one deciding editor, then two.

async function recordRecommendation(app, X, h, page, S, label) {
    await signIn(page, h.u('rc'), {contextPath: X.path});
    await h.open(h.edUrl(S.submissionId, h.roundKey(S)));
    await page.locator('[data-cy="workflow-action-items"]').getByRole('button', {name: 'Recommend Accept', exact: true}).first().click();
    await page.waitForURL(/\/decision\//, {timeout: 20000}).catch(() => {});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
    await idle(page); await page.waitForTimeout(1000);
    const rec = page.getByRole('button', {name: /^Record (Decision|Recommendation)$/});
    for (let i = 0; i < 5 && !(await rec.isVisible().catch(() => false)); i++) { await page.getByRole('button', {name: 'Continue', exact: true}).first().click().catch(() => {}); await idle(page); await page.waitForTimeout(800); }
    await h.snap(`${label}-composer`);
    await rec.first().click();
    await page.waitForTimeout(2500); await idle(page);
    await h.snap(`${label}-recorded`);
}

async function phaseRec(app, X, h, page) {
    h.phase = 'rec';
    if (h.ops) return;
    const u = h.u;
    for (const [S, label, deciding] of [[X.SRec1, 'rec1', ['se']], [X.SRec2, 'rec2', ['se', 's2']]]) {
        const url = h.edUrl(S.submissionId, h.roundKey(S));
        if (!X[`${label}Done`]) { await recordRecommendation(app, X, h, page, S, label); X[`${label}Done`] = true; }
        await signIn(page, u('se'), {contextPath: X.path});
        await h.open(url);
        const names = (await h.panel().locator('[id^="discussion_name_"]').allInnerTexts().catch(() => [])).map((x) => x.trim());
        const nm = names.find((n) => /ecommend/i.test(n));
        await h.snap(`${label}-panel-se`, {panel: await h.panelRead()});
        h.fact(`${label} se rows`, {names, row: nm ? await h.rowState(nm) : null});
        if (!nm) continue;
        let iw = await h.openItem(nm);
        await h.snap(`${label}-window-se`);
        h.fact(`${label} window (se)`, (({details, messages}) => ({details, messages}))(await h.winRead(iw)));
        await h.closeItem(iw);
        await signIn(page, u('rc'), {contextPath: X.path});
        await h.open(url);
        await h.snap(`${label}-panel-rc`);
        h.fact(`${label} rc row`, await h.rowState(nm));
        // The manager: Edit › change the message › Save, without the recommender; then with.
        await signIn(page, u('mg'), {contextPath: X.path});
        await h.open(url);
        let {w} = await h.openEdit(nm);
        h.fact(`${label} mg edit window`, await h.editRead(w));
        await h.snap(`${label}-mg-edit`);
        await h.typeMsg(w, `I05 ${label} edited by the manager`, {replace: true});
        let r = await h.save(w, `${label} mg save`);
        if (!r.closed) { await h.snap(`${label}-mg-refused`, {r}); r.saveDisabled = await w.getByRole('button', {name: 'Save', exact: true}).isDisabled().catch(() => null); }
        h.fact(`${label} mg save (deciding ${deciding.join('+')})`, r);
        if (!r.closed) {
            // Two more reads of the refusal: the recommender alone ticked, and one deciding editor unticked.
            if (deciding.length === 2) {
                await h.tick(w, u('s2'), false);
                const r2 = await h.save(w, `${label} mg save one deciding unticked`);
                await h.snap(`${label}-mg-refused-one-unticked`, {r2});
                h.fact(`${label} mg save with s2 unticked`, r2);
                if (!r2.closed) await h.tick(w, u('s2'), true);
            }
            if (!(await w.isVisible().catch(() => false))) { await h.open(url); ({w} = await h.openEdit(nm)); }
            await h.tick(w, u('rc'));
            const r3 = await h.save(w, `${label} mg save rc ticked`);
            h.fact(`${label} mg save rc ticked`, r3);
            if (!r3.closed) { await h.snap(`${label}-mg-refused-rc-ticked`); await h.cancel(w); }
        }
        await h.open(url);
        iw = await h.openItem(nm);
        await h.snap(`${label}-window-mg-after`);
        h.fact(`${label} window after (mg, reload)`, (({details, messages}) => ({details, messages}))(await h.winRead(iw)));
        await h.closeItem(iw);
    }
}

// ---------------------------------------------------------------------------
// Phase raw (R070): the screens' paths to EditorialTaskController's refusals.

async function staleReply(app, X, h, page, {name, writer, remover, label}) {
    const u = h.u;
    const url = h.edUrl(X.S1.submissionId, h.key1);
    const B = await launch(app);
    h.attach(B.page, 'B');
    try {
        await signIn(page, u(writer), {contextPath: X.path});
        await h.open(url);
        const iw = await h.openItem(name);
        await h.snap(`${label}-A-window-before`);
        await signIn(B.page, u(remover), {contextPath: X.path});
        await h.open(url, B.page);
        const {w} = await h.openEdit(name, 'Edit', B.page);
        await h.tick(w, u(writer), false);
        const rb = await h.save(w, `${label} B untick ${writer}`, B.page);
        h.fact(`${label} remover save`, rb);
        // Back in the window opened before the removal.
        const t0 = Date.now();
        h.step = `${label} stale reply`;
        await iw.getByRole('button', {name: 'Add New Message'}).click();
        await idle(page); await h.editorReady();
        await h.typeMsg(iw, `I05 ${label} reply after removal`);
        await iw.getByRole('button', {name: 'Save', exact: true}).last().click();
        await page.waitForResponse((r) => /\/tasks\/\d+\/notes/.test(r.url()) && r.request().method() === 'POST', {timeout: 15000}).catch(() => h.L('no notes POST'));
        await idle(page); await page.waitForTimeout(1200);
        const s = await h.snap(`${label}-A-after-save`);
        const raw = await rawKeys(page).catch((e) => ({error: e.message}));
        const res = {answers: h.since(t0), dialogs: await h.dialogs(), errors: await h.errors(iw).catch(() => []), notices: s.notices, rawKeys: raw};
        h.fact(`${label} stale reply`, res);
        // Close whatever the save opened, then the window; reload and read the item.
        const err = page.getByRole('dialog', {name: 'Error'});
        if (await err.count()) await err.getByRole('button', {name: 'OK'}).click().catch(() => {});
        await h.closeItem(iw);
        await h.open(url);
        await h.snap(`${label}-A-after-reload`, {panel: await h.panelRead()});
        h.fact(`${label} writer's row after reload`, await h.rowState(name));
        if (await h.rowState(name)) {
            const w2 = await h.openItem(name);
            h.fact(`${label} writer's window after reload`, (({details, messages, text}) => ({details, messages, tail: text.slice(-400)}))(await h.winRead(w2)));
            await h.snap(`${label}-A-window-after-reload`);
            await h.closeItem(w2);
        }
    } finally {
        await B.close();
    }
}

async function phaseRaw(app, X, h, page) {
    h.phase = 'raw';
    const u = h.u;
    // A manager-level writer taken off by the item's Section Editor; a Section Editor taken off by the manager.
    await staleReply(app, X, h, page, {name: X.names.staleM, writer: 'mg', remover: 'se', label: 'raw-mg'});
    await staleReply(app, X, h, page, {name: X.names.staleS, writer: 'se', remover: 'mg', label: 'raw-se'});
    if (h.ops) return;
    // The reviewer's "Add" after the review was cancelled with the form open.
    const id = X.SR.submissionId;
    const B = await launch(app);
    h.attach(B.page, 'B');
    try {
        await signIn(page, u('r1'), {contextPath: X.path});
        await page.goto(app.url(`/index.php/${X.path}/en/reviewer/submission/${id}`));
        await idle(page);
        const sc1 = page.getByRole('button', {name: 'Save and continue'});
        if (await sc1.count()) { await sc1.first().click(); await idle(page); }
        const c3 = page.getByRole('button', {name: 'Continue to Step #3'});
        await c3.waitFor({timeout: 15000}).catch(() => {});
        if (await c3.count() && !(await c3.isDisabled())) { await c3.click(); await idle(page); }
        const tp = page.getByRole('tabpanel', {name: '3. Download & Review'});
        await tp.getByRole('button', {name: 'Add', exact: true}).waitFor({timeout: 30000}).catch(() => h.L('no Add on step 3'));
        await idle(page);
        await h.snap('raw-r1-step3-before');
        // The editor cancels the review in another browser.
        await signIn(B.page, u('mg'), {contextPath: X.path});
        await h.open(h.edUrl(id, h.roundKey(X.SR)), B.page);
        const row = B.page.getByRole('row').filter({hasText: NAMES.r1}).first();
        await row.getByRole('button', {name: /More Actions/}).first().click();
        await B.page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        const items = (await B.page.getByRole('menuitem').allInnerTexts()).map((x) => x.trim());
        await B.page.getByRole('menuitem', {name: 'Cancel Reviewer', exact: true}).click(); await idle(B.page);
        await B.page.waitForFunction(() => { const ta = [...document.querySelectorAll('textarea')].pop(); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 20000}).catch(() => {});
        await idle(B.page); await B.page.waitForTimeout(600);
        await h.top(B.page).getByRole('button', {name: 'Cancel Reviewer', exact: true}).last().click().catch((x) => h.L('cancel btn', x.message.slice(0, 100)));
        await idle(B.page); await B.page.waitForTimeout(1500); await idle(B.page);
        await h.snap('raw-mg-after-cancel-reviewer', null, B.page);
        h.fact('reviewer row menu (mg)', items);
        // Back on the open review form: "Add".
        const t0 = Date.now();
        h.step = 'reviewer Add after cancel';
        await tp.getByRole('button', {name: 'Add', exact: true}).click();
        await page.waitForResponse((r) => /participants/.test(r.url()), {timeout: 15000}).catch(() => h.L('no participants GET'));
        await idle(page); await page.waitForTimeout(1500);
        const s = await h.snap('raw-r1-add-after-cancel');
        const raw = await rawKeys(page).catch((e) => ({error: e.message}));
        h.fact('reviewer Add after cancel', {answers: h.since(t0, true), dialogs: await h.dialogs(), notices: s.notices, rawKeys: raw});
        const err = page.getByRole('dialog', {name: 'Error'});
        if (await err.count()) await err.getByRole('button', {name: 'OK'}).click().catch(() => {});
        // The same form reloaded.
        await page.reload(); await idle(page); await page.waitForTimeout(1000);
        const s2 = await h.snap('raw-r1-after-reload');
        h.fact('reviewer form after reload', {url: page.url(), text: flat(s2.text && s2.text.main, 600)});
    } finally {
        await B.close();
    }
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const xFile = outFile('x.json');
    let X;
    if (process.env.REUSE && fs.existsSync(xFile)) X = JSON.parse(fs.readFileSync(xFile, 'utf8'));
    else { X = await seed(app); fs.writeFileSync(xFile, JSON.stringify(X, null, 2)); }
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
        for (const [name, fn] of [['wf', phaseWf], ['conv', phaseConv], ['conv2', phaseConv2], ['rec', phaseRec], ['raw', phaseRaw]]) {
            if (PHASES.includes(name)) { await guard(name, () => fn(app, X, h, page)); fs.writeFileSync(xFile, JSON.stringify(X, null, 2)); }
        }
    } finally {
        const fFile = outFile('facts.json');
        const prev = fs.existsSync(fFile) ? JSON.parse(fs.readFileSync(fFile, 'utf8')) : {};
        fs.writeFileSync(fFile, JSON.stringify({...prev, ...facts}, null, 2));
        fs.writeFileSync(outFile('answers.json'), JSON.stringify(h.answers, null, 2));
        record('browser-dialogs', h.browserDialogs);
        await close();
    }
});
