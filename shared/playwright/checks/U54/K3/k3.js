const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U54 claim check, chunk K3: the role window and removing a role.
// Spec: docs/specs/U54-roles-configuration.md, Fields (the role window, the
// level table), Rules 12-21, Settings "Forms", register A3, A4, A6, A7, OPS2.
//
// Run (one app per process, each seeds its own scratch context):
//   PROBE_FEATURE=U54 PROBE_AGENT=ccK3 node bin/probe.js ojs shared/playwright/checks/U54/K3/k3.js
//   PHASES=window,save node bin/probe.js ... narrows the phases.
// Outputs: .reports/U54/ccK3/ (k3-<phase>-*.json facts, snapshots, PNGs).
//
// Phases, in order (the later ones rely on the earlier ones only through the
// seeded context):
//   window   Create New Role as it opens, every level fresh and in sequence,
//            boxes ticked then greyed by a level change, "Cancel", "Close",
//            leaving the page (Fields, level table, Rules 12, 13, 17)
//   greyed   what a save keeps of a box a level change greyed while ticked
//   save     empty name / abbreviation, whitespace, no stage, two stages,
//            manager level (Rule 15, Rule 16 on a new role)
//   edit     "Edit" on an installed and a created role, rename, untick every
//            stage (Rule 14, Rule 15's changed row)
//   forms    a context with two form languages (Settings "Forms")
//   mgrsave  the Production editor's window saved (Rule 16, A3) {OJS OMP}
//   lockout  the Settings box guard (Rule 18), then OK pressed behind it
//   meta     "Permit submission metadata edit." against a participant (Rule 19)
//   remove   the confirmation and every "OK" outcome (Rules 20-21, A4, A6)
//   ops2     the level filter and a Reviewer-level role (OPS2; controls on OJS, OMP)
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag} = require('../../../probe');

const T = 20_000;
const ALL = ['window', 'greyed', 'save', 'edit', 'forms', 'mgrsave', 'lockout', 'meta', 'remove', 'ops2'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const VOC = {
    ojs: {
        levels: ['Journal Manager', 'Section Editor', 'Assistant', 'Author', 'Reviewer', 'Reader', 'Subscription Manager'],
        stages: ['Submission', 'Review', 'Copyediting', 'Production'], firstStage: 'Submission', stageWord: 'copyediting',
        mgr: 'Journal manager', editor: 'Journal editor', pe: 'Production editor', se: 'Section editor', unheldDefault: 'Copyeditor',
        sectionsTab: 'Sections', sectionsGrid: '#sectionsGridContainer', sectionForm: 'form#sectionForm', wfStage: 'workflow_1',
    },
    omp: {
        levels: ['Press Manager', 'Series Editor', 'Assistant', 'Author', 'Reviewer', 'Reader'],
        stages: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'], firstStage: 'Submission', stageWord: 'copyediting',
        mgr: 'Press manager', editor: 'Press editor', pe: 'Production editor', se: 'Series editor', unheldDefault: 'Copyeditor',
        sectionsTab: 'Series', sectionsGrid: '#seriesGridContainer', sectionForm: 'form#seriesForm', wfStage: 'workflow_1',
    },
    ops: {
        levels: ['Manager', 'Moderator', 'Assistant', 'Author', 'Reviewer', 'Reader'],
        stages: ['Production'], firstStage: 'Production', stageWord: 'production',
        mgr: 'Preprint Server manager', editor: null, pe: null, se: 'Moderator', unheldDefault: 'Editorial Board Member',
        sectionsTab: null, wfStage: 'workflow_5',
    },
};

// Every notice-like node added to the page, with its element chain, so a
// notice is read whatever it lands in (.app__notifications, .ui-pnotify, a form label).
const NOTICE_WATCH = () => {
    window.__k3n = [];
    const re = /saved|removed|remove|default one|required|error|Error|not|define|abbrev/i;
    const obs = new MutationObserver((muts) => {
        for (const m of muts) for (const n of m.addedNodes) {
            const el = n.nodeType === 1 ? n : n.parentElement;
            if (!el) continue;
            const t = (el.innerText || el.textContent || '').trim();
            if (!t || t.length > 400 || !re.test(t)) continue;
            if (el.closest && el.closest('#roleGridContainer table, form#userGroupForm fieldset, select')) continue;
            const chain = [];
            let p = el;
            for (let i = 0; p && i < 5; i++, p = p.parentElement) chain.push(`${p.tagName.toLowerCase()}${p.id ? '#' + p.id : ''}${p.className && typeof p.className === 'string' ? '.' + p.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.') : ''}`);
            const r = el.getBoundingClientRect();
            window.__k3n.push({at: Date.now(), text: t.replace(/\s+/g, ' ').slice(0, 300), chain, box: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width)}});
        }
    });
    const go = () => obs.observe(document.documentElement, {childList: true, subtree: true});
    if (document.documentElement) go(); else document.addEventListener('DOMContentLoaded', go);
};

// The role window as data.
const FORM_READ = (f) => {
    const vis = (e) => !!(e && e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
    const lab = (i) => {
        const l = (i.id && f.querySelector(`label[for="${i.id}"]`)) || i.closest('label');
        return l ? l.innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : null;
    };
    const dlg = f.closest('[role=dialog]');
    const sel = f.querySelector('select[name=roleId]');
    const cont = f.querySelector('#userGroupStageContainer');
    return {
        title: dlg ? ((dlg.querySelector('h1') || {}).innerText || '').trim() : null,
        heading: ((f.querySelector('h3') || {}).innerText || '').trim(),
        level: sel ? {text: sel.options[sel.selectedIndex].text, disabled: sel.disabled, options: [...sel.options].map((o) => o.text)} : null,
        stageSection: cont ? {visible: vis(cont), display: getComputedStyle(cont).display} : null,
        texts: [...f.querySelectorAll('input[type=text]')].map((i) => ({name: i.name, value: i.value, visible: vis(i), label: lab(i)})),
        boxes: [...f.querySelectorAll('input[type=checkbox]')].map((i) => ({name: i.name, value: i.value, label: lab(i), checked: i.checked, disabled: i.disabled, visible: vis(i)})),
        errors: [...f.querySelectorAll('label.error, .error, .pkp_form_error')].filter(vis).map((e) => ({text: e.innerText.trim().slice(0, 200), for: e.getAttribute('for'), cls: String(e.className).slice(0, 60)})),
        buttons: [...f.querySelectorAll('button, a, input[type=submit]')].filter(vis).map((b) => (b.innerText || b.value || '').trim()).filter(Boolean),
        required: ((f.querySelector('.formRequired') || {}).innerText || '').trim(),
        order: [...f.querySelectorAll('h3, label.pkp_form_label, legend, .label, label')].filter(vis).map((h) => h.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30),
    };
};
// One line per box: label=state, x ticked, d greyed, h hidden.
const brief = (r) => r && r.boxes ? r.boxes.map((b) => `${(b.label || b.name).slice(0, 18)}=${b.checked ? 'x' : '-'}${b.disabled ? 'd' : ''}${b.visible ? '' : 'h'}`).join(' | ') : null;

const ROWS = (g) => [...g.querySelectorAll('tr.gridRow')].map((r) => {
    const tds = [...r.querySelectorAll('td')];
    return {
        name: (tds[0] ? tds[0].innerText : '').replace(/\s+/g, ' ').replace(/^Settings\s*/, '').trim(),
        level: (tds[1] ? tds[1].innerText : '').trim(),
        boxes: [...r.querySelectorAll('input[type=checkbox]')].map((c) => `${c.checked ? 'x' : '-'}${c.disabled ? 'd' : ''}`).join(' '),
        arrow: !!r.querySelector('a.show_extras, a.hide_extras'),
        id: r.id,
    };
});

forEachApp(async (app) => {
    const V = VOC[app.name];
    const isOPS = app.name === 'ops';
    const isOMP = app.name === 'omp';
    const facts = {};
    const abbrevSeen = [];
    const fact = (k, v) => { facts[k] = v; log(`[${app.name}] ${k}:`, typeof v === 'string' ? v : JSON.stringify(v).slice(0, 900)); };

    // ---- seed ------------------------------------------------------------------------------------
    const x = tag('u54k3');
    const u = (s) => `${x}${s}`;
    const customRoles = [
        {key: 'cur', level: 'assistant', name: 'K3 Current', abbrev: 'QZC', stages: [V.stageWord]},
        {key: 'past', level: 'author', name: 'K3 Past', abbrev: 'QZP'},
        {key: 'mix', level: 'assistant', name: 'K3 Mix', abbrev: 'QZM'},
        {key: 'cmgr', level: 'manager', name: 'K3 Manager', abbrev: 'QZG'},
        {key: 'spare', level: 'reader', name: 'K3 Spare', abbrev: 'QZS'},
    ];
    const users = [
        {username: u('m'), roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
        {username: u('se'), roles: ['sectionEditor'], givenName: 'Sena', familyName: 'Editor'},
        {username: u('au'), roles: ['author'], givenName: 'Ada', familyName: 'Author'},
        {username: u('h'), roles: ['reader', 'cur', 'mix'], givenName: 'Hana', familyName: 'Holder'},
        {username: u('p'), roles: ['reader'], pastRoles: [{role: 'past'}, {role: 'mix'}], givenName: 'Paul', familyName: 'Past'},
        {username: u('cm'), roles: ['cmgr'], givenName: 'Cato', familyName: 'Custom'},
    ];
    if (!isOPS) {
        users.push({username: u('e'), roles: ['editor'], givenName: 'Eda', familyName: 'Editor'});
        users.push({username: u('e2'), roles: ['editor', 'productionEditor'], givenName: 'Eli', familyName: 'Twice'});
        users.push({username: u('pe'), roles: ['productionEditor'], givenName: 'Pia', familyName: 'Production'});
    }
    await app.api.createContext({tag: x, context: {name: `U54 K3 ${x}`}, customRoles, users});
    const parts = [{username: u('se'), role: 'sectionEditor'}];
    if (!isOPS) parts.push({username: u('pe'), role: 'productionEditor'});
    const s1 = await app.api.createSubmission({tag: `${x}s1`, context: x, submitter: u('au'), title: `K3 S1 ${x}`, participants: parts});
    const S1 = s1.submissionId;
    let S2 = null;
    try {
        const s2 = await app.api.createSubmission({tag: `${x}s2`, context: x, submitter: u('au'), title: `K3 S2 ${x}`, participants: [{username: u('h'), role: 'cur'}]});
        S2 = s2.submissionId;
    } catch (e) { fact('seed.s2CustomParticipant', `refused: ${flat(e.message, 300)}`); }
    fact('seed', {ctx: x, S1, S2});

    // ---- browser ---------------------------------------------------------------------------------
    const {page, context, close} = await launch(app);
    await context.addInitScript(NOTICE_WATCH);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({at: Date.now(), type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    const posts = [];
    page.on('request', (r) => { if (/user-group|userGroup/i.test(r.url()) && r.method() === 'POST') posts.push({at: Date.now(), url: r.url().replace(/^.*\$\$\$call\$\$\$/, ''), body: (r.postData() || '').replace(/csrfToken=[^&]*&?/, '')}); });
    const bad = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push({at: Date.now(), status: r.status(), url: r.url().replace(/^.*index\.php/, '').slice(0, 160)}); });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), text: flat(e.message, 200)}));
    const since = (arr, t0) => arr.filter((e) => e.at >= t0);
    const noticesSince = (t0) => page.evaluate((t) => (window.__k3n || []).filter((n) => n.at >= t), t0).catch(() => []);
    const nowIn = () => page.evaluate(() => Date.now()).catch(() => Date.now());

    let snapN = 0;
    async function snap(name, extra, {png = true} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `k3-${String(++snapN).padStart(3, '0')}-${name}`;
        record(n, s);
        if (png) await shot(page, n).catch(() => {});
        const all = [s.text && s.text.main, s.text && s.text.dialog, s.text && s.text.header].join('\n');
        const m = all.match(/QZ[A-Z]/g);
        if (m) abbrevSeen.push({snap: n, url: s.url, codes: [...new Set(m)], roleWindowOpen: /Role details/.test((s.text && s.text.dialog) || '')});
        return {name: n, s};
    }
    async function sect(name, fn) {
        try { return await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 900));
            await snap(`zz-failed-${name}`).catch(() => {});
            return null;
        }
    }
    const as = async (who) => { await signIn(page, u(who), {contextPath: x}); await idle(page).catch(() => {}); };
    const accessURL = (ctx = x) => app.url(`/index.php/${ctx}/en/management/settings/access`);
    const settle = async () => {
        await idle(page).catch(() => {});
        await page.waitForFunction(() => !window.jQuery || window.jQuery(':animated').length === 0, null, {timeout: 5000}).catch(() => {});
        await sleep(250);
    };
    const grid = () => page.locator('#roleGridContainer');
    const form = () => page.locator('form#userGroupForm');
    const readForm = () => form().evaluate(FORM_READ).catch((e) => ({error: flat(e.message, 200)}));
    const readRows = () => grid().evaluate(ROWS).catch(() => []);
    const rowOf = async (name) => (await readRows()).find((r) => r.name === name) || null;

    // Ground truth for a role the list shows first (no "Edit" there, A1): psql, never a request.
    const CTX = {ojs: ['journals', 'journal_id'], omp: ['presses', 'press_id'], ops: ['servers', 'server_id']}[app.name];
    function dbRole(name, ctx = x) {
        try {
            const q = `select ug.role_id, ug.permit_self_registration, ug.permit_metadata_edit, ug.permit_settings, ug.masthead, coalesce((select string_agg(stage_id::text, ',' order by stage_id) from user_group_stage s where s.user_group_id = ug.user_group_id), '') from user_groups ug join ${CTX[0]} c on c.${CTX[1]} = ug.context_id join user_group_settings n on n.user_group_id = ug.user_group_id and n.setting_name = 'name' and n.locale = 'en' where c.path = '${ctx}' and n.setting_value = '${name}'`;
            const [roleId, selfReg, metadata, settings, masthead, stages] = execFileSync('psql', ['-d', `${dbName(app.name)}`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim().split('|');
            return {source: 'psql', roleId, selfReg, metadata, settings, masthead, stages};
        } catch (e) { return {source: 'psql', error: flat(e.message, 200)}; }
    }
    async function gotoRoles(ctx = x) {
        const r = await page.goto(`${accessURL(ctx)}?k3=${Date.now()}#roles`).catch((e) => ({err: flat(e.message, 200)}));
        await idle(page).catch(() => {});
        if (!(await grid().locator('tr.gridRow').first().isVisible().catch(() => false))) {
            const tab = page.getByRole('tab', {name: 'Roles', exact: true});
            if (await tab.count()) { await tab.click(); await idle(page).catch(() => {}); }
        }
        await grid().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        await settle();
        // more roles than one page: show 50 a page (the list's own "Items per page:" link)
        const line = (await grid().innerText().catch(() => '')).match(/(\d+) - (\d+) of (\d+) items/);
        if (line && Number(line[2]) < Number(line[3])) {
            const per = grid().locator('select').filter({has: page.locator('option', {hasText: /^\s*50\s*$/})}).first();
            await per.selectOption({label: '50'}).catch((e) => log('per page', flat(e.message, 100)));
            await idle(page).catch(() => {});
            await page.waitForFunction(() => /1 - \d+ of (\d+) items/.test(document.querySelector('#roleGridContainer')?.innerText || '') && (() => { const m = document.querySelector('#roleGridContainer').innerText.match(/1 - (\d+) of (\d+) items/); return m && m[1] === m[2]; })(), null, {timeout: 10000}).catch(() => {});
            await settle();
            fact('note.paged', `${line[0]} -> 50 a page`);
        }
        return r && r.status ? r.status() : r;
    }
    // A role created on screen can land FIRST in the list (it has no ORDER BY), where the row has no
    // "Edit" (A1): a filler made first takes that place so the roles under test keep their "Edit".
    async function filler(ctx = x) {
        await gotoRoles(ctx);
        if (await rowOf('K3 Filler')) return;
        await openCreate();
        await chooseLevel('Reader');
        await fillNames('K3 Filler', 'QZH');
        await pressOK('filler');
        await gotoRoles(ctx);
        fact('filler.position', (await readRows()).findIndex((r) => r.name === 'K3 Filler'));
    }
    async function waitWindow() {
        await form().locator('select[name=roleId]').waitFor({state: 'attached', timeout: T});
        await settle();
    }
    async function openCreate() {
        await grid().getByRole('link', {name: 'Create New Role', exact: true}).or(grid().getByRole('button', {name: 'Create New Role', exact: true})).first().click();
        await waitWindow();
    }
    async function rowAction(name, action) {
        const rows = await readRows();
        const i = rows.findIndex((r) => r.name === name);
        if (i < 0) return {rowAbsent: true, names: rows.map((r) => r.name)};
        const row = grid().locator('tr.gridRow').nth(i);
        const id = await row.getAttribute('id');
        // the arrow stays open (a.hide_extras) after an action until the grid redraws
        const tog = row.locator('a.show_extras');
        if (await tog.count()) { await tog.first().click(); await sleep(300); }
        else if (!(await row.locator('a.hide_extras').count())) return {noArrow: true};
        const link = page.locator(`tr[id="${id}"] + tr`).getByRole('link', {name: action, exact: true});
        if (!(await link.count())) return {noAction: true};
        await link.first().click();
        return {ok: true};
    }
    async function openEdit(name) {
        const r = await rowAction(name, 'Edit');
        if (!r.ok) return r;
        await waitWindow();
        return {ok: true};
    }
    async function pressCancel() {
        const t0 = Date.now();
        await form().getByRole('link', {name: 'Cancel', exact: true}).or(form().getByRole('button', {name: 'Cancel', exact: true})).first().click();
        await form().waitFor({state: 'detached', timeout: 8000}).catch(() => {});
        await sleep(700);
        return {dialogs: since(dialogs, t0), windowOpen: await form().isVisible().catch(() => false)};
    }
    async function pressOK(label) {
        const t0 = await nowIn();
        const tLocal = Date.now();
        const w = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: 8000}).catch(() => null);
        await form().getByRole('button', {name: 'OK', exact: true}).click();
        const r = await w;
        await sleep(1200);
        await settle();
        const open = await form().isVisible().catch(() => false);
        let answer = null;
        if (r) { const b = await r.text().catch(() => ''); answer = {status: (b.match(/"status":\s*(true|false)/) || [])[1], event: (b.match(/"event":\s*\{[^}]*"name":\s*"([^"]+)"/) || [])[1] || null, len: b.length}; }
        const out = {request: r ? {status: r.status(), answer} : 'none sent', windowOpen: open, after: open ? await readForm() : null,
            notices: (await noticesSince(t0)).map((n) => ({text: n.text, chain: n.chain.slice(0, 3).join('<'), box: n.box})),
            dialogs: since(dialogs, tLocal), failed: since(bad, tLocal), pageErrors: since(pageErrors, tLocal), posted: since(posts, tLocal).map((p) => p.body.slice(0, 600))};
        await snap(`${label}-after-ok`, out);
        return out;
    }
    async function setBoxes(set) {
        for (const [lbl, v] of Object.entries(set)) {
            const b = form().getByRole('checkbox', {name: lbl, exact: true}).first();
            if (v) await b.check({timeout: 3000}).catch((e) => log('check fail', lbl, flat(e.message, 80)));
            else await b.uncheck({timeout: 3000}).catch((e) => log('uncheck fail', lbl, flat(e.message, 80)));
        }
    }
    async function chooseLevel(label) {
        await form().locator('select[name=roleId]').selectOption({label});
        await settle();
        await sleep(700); // jQuery show('slow')/hide('slow') is 600 ms
        await settle();
    }
    async function fillNames(name, abbrev) {
        if (name !== undefined) await form().locator('input[name="name[en]"]').fill(name);
        if (abbrev !== undefined) await form().locator('input[name="abbrev[en]"]').fill(abbrev);
    }
    async function removeRole(name, label) {
        await gotoRoles();
        const a = await rowAction(name, 'Remove');
        if (!a.ok) return {action: a};
        const dlg = page.getByRole('dialog').last();
        await dlg.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: T});
        const confirm = {heading: flat(await dlg.locator('h1, h2, .pkp_modal_title, [class*=title]').first().innerText().catch(() => ''), 80), text: flat(await dlg.innerText(), 500)};
        const t0 = await nowIn();
        const tLocal = Date.now();
        const w = page.waitForResponse((resp) => resp.url().includes('remove-user-group'), {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'OK', exact: true}).click();
        const resp = await w;
        await sleep(1500); await settle();
        const out = {confirm, status: resp ? resp.status() : null, notices: (await noticesSince(t0)).map((n) => ({text: n.text, chain: n.chain.slice(0, 3).join('<'), box: n.box})),
            rowRightAfter: await rowOf(name), failed: since(bad, tLocal), pageErrors: since(pageErrors, tLocal)};
        await snap(`${label}-remove-ok`, out);
        await gotoRoles();
        out.rowAfterReload = await rowOf(name);
        return out;
    }

    try {
        // ============================================================ window
        if (on('window')) await sect('window', async () => {
            await as('m');
            await gotoRoles();
            const s0 = await snap('w-roles-list', {rows: await readRows()});
            await openCreate();
            const open = await readForm();
            await snap('w-create-open', {form: open});
            await loc(page, 'Role window: form#userGroupForm', form());
            await loc(page, 'Role window: "Permission level" select[name=roleId]', form().locator('select[name=roleId]'));
            await loc(page, 'Role window: "Stage Assignment" #userGroupStageContainer', form().locator('#userGroupStageContainer'));
            await loc(page, 'Role window: a Role Options box getByRole(checkbox, {name, exact})', form().getByRole('checkbox', {name: 'Consider role in masthead list', exact: true}));
            await loc(page, 'Role window: "OK" button', form().getByRole('button', {name: 'OK', exact: true}));
            await loc(page, 'Role window: "Cancel" link', form().getByRole('link', {name: 'Cancel', exact: true}));
            fact('window.open', {title: open.title, heading: open.heading, level: open.level, stageSection: open.stageSection, boxes: brief(open), texts: open.texts, buttons: open.buttons, required: open.required, order: open.order});
            // the level list in sequence from the first entry
            const seq = {};
            for (const lv of [...V.levels.slice(1), V.levels[0]]) {
                await chooseLevel(lv);
                const r = await readForm();
                seq[lv] = {stageSection: r.stageSection, boxes: brief(r)};
            }
            await snap('w-sequence-end', {seq});
            fact('window.sequence', seq);
            await pressCancel();
            // every level fresh (from the window as it opens)
            const fresh = {};
            for (const lv of V.levels.slice(1)) {
                await openCreate();
                await chooseLevel(lv);
                const r = await readForm();
                fresh[lv] = {stageSection: r.stageSection, boxes: brief(r)};
                await snap(`w-fresh-${lv.replace(/\s+/g, '')}`, {form: r});
                await pressCancel();
            }
            fact('window.fresh', fresh);
            // boxes ticked, then greyed by a level change: manager -> sub-editor -> assistant
            await openCreate();
            await setBoxes({'This role is only allowed to recommend a review decision and will require an authorised editor to record a final decision.': true, 'Consider role in masthead list': true, 'Permit changes to Settings': true});
            const a0 = brief(await readForm());
            await chooseLevel(V.levels[1]);
            const a1 = brief(await readForm());
            await chooseLevel('Assistant');
            const a2 = brief(await readForm());
            await snap('w-greying-a', {a0, a1, a2});
            fact('window.greyingA', {ticked: a0, [V.levels[1]]: a1, Assistant: a2});
            await pressCancel();
            // author: self-registration and the first stage ticked, metadata unticked; -> reviewer -> reader -> manager -> author
            await openCreate();
            await chooseLevel('Author');
            await setBoxes({'Allow user self-registration': true, [V.firstStage]: true, 'Permit submission metadata edit.': false});
            const b0 = brief(await readForm());
            const b = {Author_ticked: b0};
            for (const lv of ['Reviewer', 'Reader', V.levels[0], 'Author']) { await chooseLevel(lv); const r = await readForm(); b[`${lv}`] = {stageSection: r.stageSection && r.stageSection.visible, boxes: brief(r)}; }
            await snap('w-greying-b', b);
            fact('window.greyingB', b);
            await pressCancel();
            // Rule 17: "Cancel" after typing, no question; reopened empty
            await openCreate();
            await fillNames('K3 Cancelled', 'QZX');
            await setBoxes({'Consider role in masthead list': true});
            await form().locator('input[name="abbrev[en]"]').blur();
            const c1 = await pressCancel();
            const rowsAfterCancel = (await readRows()).map((r) => r.name);
            await openCreate();
            const reopened = await readForm();
            fact('window.cancel', {cancel: c1, cancelledRowListed: rowsAfterCancel.includes('K3 Cancelled'), reopenedTexts: reopened.texts.filter((t) => t.visible).map((t) => `${t.name}=${t.value}`), reopenedBoxes: brief(reopened)});
            await snap('w-cancel-reopened', {form: reopened});
            // the window's "Close" with a change typed
            await fillNames('K3 Closed');
            await form().locator('input[name="name[en]"]').blur();
            let t0 = Date.now();
            await page.getByRole('dialog').filter({has: form()}).getByRole('button', {name: 'Close', exact: true}).first().click().catch((e) => log('close fail', flat(e.message, 100)));
            await sleep(1200);
            fact('window.closeWithChange', {dialogs: since(dialogs, t0), windowOpen: await form().isVisible().catch(() => false)});
            if (await form().isVisible().catch(() => false)) await pressCancel();
            await gotoRoles();
            // leaving the page with a change typed in the window
            await openCreate();
            await fillNames('K3 Leaving');
            await form().locator('input[name="name[en]"]').blur();
            t0 = Date.now();
            await page.goto(app.url(`/index.php/${x}/en/management/settings/context`)).catch((e) => log('leave goto', flat(e.message, 100)));
            await idle(page).catch(() => {});
            fact('window.leavePage', {dialogs: since(dialogs, t0), url: page.url().replace(/^.*index\.php/, '')});
            await gotoRoles();
            fact('window.leftRowListed', !!(await rowOf('K3 Leaving')) || !!(await rowOf('K3 Closed')));
            // Rule 17 on "Edit": change the name, Cancel, reopen
            const target = V.unheldDefault;
            await openEdit(target);
            const e0 = await readForm();
            await fillNames('K3 Changed');
            await setBoxes({'Consider role in masthead list': !e0.boxes.find((bx) => bx.name === 'masthead').checked});
            const ec = await pressCancel();
            await openEdit(target);
            const e1 = await readForm();
            await snap('w-edit-cancel-reopened', {form: e1});
            fact('window.editCancel', {cancel: ec, before: e0.texts.filter((t) => t.visible).map((t) => t.value), reopened: e1.texts.filter((t) => t.visible).map((t) => t.value), mastheadBefore: e0.boxes.find((bx) => bx.name === 'masthead').checked, mastheadReopened: e1.boxes.find((bx) => bx.name === 'masthead').checked});
            await pressCancel();
            await signOut(page);
            void s0;
        });

        // ============================================================ greyed: what a save keeps of a greyed ticked box
        if (on('greyed')) await sect('greyed', async () => {
            await as('m');
            await filler();
            // A: Author with self-registration ticked -> Assistant (self-registration greyed), saved
            await gotoRoles();
            await openCreate();
            await chooseLevel('Author');
            await setBoxes({'Allow user self-registration': true});
            await chooseLevel('Assistant');
            await fillNames('K3 Greyed A', 'QZA');
            const fa = await readForm();
            await snap('g-a-before-ok', {form: fa});
            const oa = await pressOK('g-a');
            fact('greyed.A', {before: brief(fa), request: oa.request, windowOpen: oa.windowOpen, posted: oa.posted, notices: oa.notices.map((n) => n.text)});
            await gotoRoles();
            const ra = await rowOf('K3 Greyed A');
            const oa2 = await openEdit('K3 Greyed A');
            let ea = null;
            if (oa2.ok) { ea = await readForm(); await snap('g-a-edit-reopened', {form: ea, row: ra}); await pressCancel(); }
            fact('greyed.A.stored', {row: ra, edit: ea ? brief(ea) : oa2, db: dbRole('K3 Greyed A')});
            fact('greyed.A.remove', await removeRole('K3 Greyed A', 'g-a'));
            // B: Author with the first stage ticked -> Reviewer (that stage greyed), saved
            await gotoRoles();
            await openCreate();
            await chooseLevel('Author');
            await setBoxes({[V.firstStage]: true});
            await chooseLevel('Reviewer');
            await fillNames('K3 Greyed R', 'QZR');
            const fb = await readForm();
            await snap('g-r-before-ok', {form: fb});
            const ob = await pressOK('g-r');
            fact('greyed.R', {before: brief(fb), stageSection: fb.stageSection, request: ob.request, windowOpen: ob.windowOpen, posted: ob.posted, notices: ob.notices.map((n) => n.text)});
            await gotoRoles();
            const rb = await rowOf('K3 Greyed R');
            const ob2 = await openEdit('K3 Greyed R');
            let eb = null;
            if (ob2.ok) { eb = await readForm(); await snap('g-r-edit-reopened', {form: eb, row: rb}); await pressCancel(); }
            fact('greyed.R.stored', {row: rb, edit: eb ? brief(eb) : ob2, db: dbRole('K3 Greyed R')});
            fact('greyed.R.remove', await removeRole('K3 Greyed R', 'g-r'));
            await signOut(page);
        });

        // ============================================================ save (Rule 15)
        if (on('save')) await sect('save', async () => {
            await as('m');
            await gotoRoles();
            await openCreate();
            // name empty, abbreviation filled
            await fillNames('', 'TR');
            const r1 = await pressOK('s-empty-name');
            fact('save.emptyName', {request: r1.request, windowOpen: r1.windowOpen, errors: r1.after && r1.after.errors, notices: r1.notices.map((n) => n.text)});
            // abbreviation empty
            await fillNames('K3 NoAbbrev', '');
            const r2 = await pressOK('s-empty-abbrev');
            fact('save.emptyAbbrev', {request: r2.request, windowOpen: r2.windowOpen, errors: r2.after && r2.after.errors, notices: r2.notices.map((n) => n.text)});
            // blanks only
            await fillNames('   ', '   ');
            const r3 = await pressOK('s-blank');
            fact('save.blank', {request: r3.request, windowOpen: r3.windowOpen, errors: r3.after && r3.after.errors, notices: r3.notices.map((n) => n.text)});
            if (!r3.windowOpen) { await gotoRoles(); fact('save.blankRows', (await readRows()).slice(-3)); }
            else await pressCancel();
            // Assistant, no stage
            await gotoRoles();
            await openCreate();
            await chooseLevel('Assistant');
            await fillNames('K3 Nostage', 'QZN');
            const r4 = await pressOK('s-nostage');
            const right = await rowOf('K3 Nostage');
            await gotoRoles();
            const reload = await rowOf('K3 Nostage');
            fact('save.noStage', {request: r4.request, windowOpen: r4.windowOpen, notices: r4.notices, rowRightAfter: right, rowAfterReload: reload, lastRows: (await readRows()).slice(-2)});
            await snap('s-nostage-reloaded', {row: reload});
            // Rule 15's changed row: rename it
            await openEdit('K3 Nostage');
            await fillNames('K3 Renamed');
            const r5 = await pressOK('s-rename');
            const right5 = {old: await rowOf('K3 Nostage'), neu: await rowOf('K3 Renamed')};
            await gotoRoles();
            fact('save.rename', {request: r5.request, windowOpen: r5.windowOpen, notices: r5.notices.map((n) => n.text), rightAfter: right5, afterReload: {old: await rowOf('K3 Nostage'), neu: await rowOf('K3 Renamed')}});
            fact('save.renamedRemove', await removeRole('K3 Renamed', 's-renamed'));
            // the other end: two stages ticked
            await gotoRoles();
            await openCreate();
            await chooseLevel('Assistant');
            const two = isOPS ? ['Production'] : ['Copyediting', 'Production'];
            await setBoxes(Object.fromEntries(two.map((s) => [s, true])));
            await fillNames('K3 Twostage', 'QZT');
            const r6 = await pressOK('s-twostage');
            const right6 = await rowOf('K3 Twostage');
            await gotoRoles();
            fact('save.twoStages', {request: r6.request, notices: r6.notices.map((n) => n.text), rowRightAfter: right6, rowAfterReload: await rowOf('K3 Twostage')});
            // Edit it: untick every stage, OK
            await openEdit('K3 Twostage');
            const e0 = await readForm();
            await setBoxes(Object.fromEntries(two.map((s) => [s, false])));
            const r7 = await pressOK('s-untick-all');
            const right7 = await rowOf('K3 Twostage');
            await gotoRoles();
            const reload7 = await rowOf('K3 Twostage');
            await openEdit('K3 Twostage');
            const e1 = await readForm();
            await snap('s-untick-all-reopened', {form: e1, row: reload7});
            fact('save.untickAllStages', {before: brief(e0), request: r7.request, posted: r7.posted, notices: r7.notices.map((n) => n.text), rowRightAfter: right7, rowAfterReload: reload7, reopened: brief(e1)});
            await pressCancel();
            fact('save.twoStagesRemove', await removeRole('K3 Twostage', 's-twostage'));
            // manager level, nothing touched (Rule 16 on a new role)
            await gotoRoles();
            await openCreate();
            await fillNames('K3 NewMgr', 'QZW');
            const r8 = await pressOK('s-newmgr');
            const right8 = await rowOf('K3 NewMgr');
            await gotoRoles();
            fact('save.newManager', {request: r8.request, notices: r8.notices.map((n) => n.text), rowRightAfter: right8, rowAfterReload: await rowOf('K3 NewMgr')});
            await openEdit('K3 NewMgr');
            const e8 = await readForm();
            await snap('s-newmgr-edit', {form: e8});
            fact('save.newManagerEdit', {boxes: brief(e8), stageSection: e8.stageSection, level: e8.level});
            await pressCancel();
            fact('save.newManagerRemove', await removeRole('K3 NewMgr', 's-newmgr'));
            await signOut(page);
        });

        // ============================================================ edit (Rule 14)
        if (on('edit')) await sect('edit', async () => {
            await as('m');
            for (const name of [V.unheldDefault, 'K3 Current', V.se]) {
                await gotoRoles();
                const row = await rowOf(name);
                const r = await openEdit(name);
                if (!r.ok) { fact(`edit.${name}`, r); continue; }
                const f = await readForm();
                await snap(`e-${name.replace(/\s+/g, '')}`, {form: f, row});
                fact(`edit.${name}`, {row, title: f.title, heading: f.heading, level: f.level, stageSection: f.stageSection, texts: f.texts.map((t) => `${t.name}=${t.value}${t.visible ? '' : '(hidden)'}`), boxes: brief(f), buttons: f.buttons});
                // can the level be changed?
                const sel = form().locator('select[name=roleId]');
                const changed = await sel.selectOption({label: 'Author'}, {timeout: 2000}).then(() => true).catch(() => false);
                fact(`edit.${name}.levelChange`, {accepted: changed, after: await sel.evaluate((s) => s.options[s.selectedIndex].text).catch(() => null)});
                await pressCancel();
            }
            await signOut(page);
        });

        // ============================================================ forms (Settings bullet 2)
        if (on('forms')) await sect('forms', async () => {
            const x2 = tag('u54k3f');
            await app.api.createContext({tag: x2, context: {name: `U54 K3 forms ${x2}`, supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
                users: [{username: `${x2}m`, roles: ['manager'], givenName: 'Fia', familyName: 'Forms'}]});
            await signIn(page, `${x2}m`, {contextPath: x2});
            await filler(x2);
            await gotoRoles(x2);
            await openCreate();
            const f0 = await readForm();
            await form().locator('input[name="name[en]"]').focus();
            await sleep(500);
            const f1 = await readForm();
            await snap('f-two-languages-open', {form: f1});
            fact('forms.boxes', {asOpened: f0.texts.map((t) => `${t.name}${t.visible ? '' : '(hidden)'}`), enFocused: f1.texts.map((t) => `${t.name}${t.visible ? '' : '(hidden)'}`)});
            // French alone: primary empty
            await chooseLevel('Assistant');
            await form().locator('input[name="name[en]"]').focus();
            await form().locator('input[name="name[fr_CA]"]').fill('K3 Rôle FR');
            await form().locator('input[name="abbrev[en]"]').focus();
            await form().locator('input[name="abbrev[fr_CA]"]').fill('QZF');
            const o1 = await pressOK('f-french-only');
            fact('forms.frenchOnly', {request: o1.request, windowOpen: o1.windowOpen, errors: o1.after && o1.after.errors, notices: o1.notices.map((n) => n.text)});
            // English filled, French left
            if (o1.windowOpen) {
                await form().locator('input[name="name[en]"]').fill('K3 Bilingual');
                await form().locator('input[name="abbrev[en]"]').fill('QZB');
                const o2 = await pressOK('f-english-too');
                fact('forms.englishToo', {request: o2.request, windowOpen: o2.windowOpen, errors: o2.after && o2.after.errors, notices: o2.notices.map((n) => n.text)});
            }
            await gotoRoles(x2);
            const rb = await rowOf('K3 Bilingual');
            await openCreate();
            await chooseLevel('Assistant');
            await fillNames('K3 English only', 'QZE');
            const o3 = await pressOK('f-english-only');
            fact('forms.englishOnly', {request: o3.request, windowOpen: o3.windowOpen, notices: o3.notices.map((n) => n.text)});
            await gotoRoles(x2);
            const r = await openEdit('K3 Bilingual');
            const e = r.ok ? await readForm() : r;
            if (r.ok) { await snap('f-bilingual-edit', {form: e}); await pressCancel(); }
            fact('forms.stored', {row: rb, englishOnlyRow: await rowOf('K3 English only'), edit: e.texts ? e.texts.map((t) => `${t.name}=${t.value}`) : e});
            // the French interface's list shows the French name
            await page.goto(app.url(`/index.php/${x2}/fr_CA/management/settings/access?k3=1#roles`)).catch(() => {});
            await idle(page).catch(() => {});
            await grid().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await settle();
            const frRows = await readRows();
            await snap('f-french-interface', {rows: frRows.slice(-3)});
            fact('forms.frenchInterfaceRows', frRows.slice(-2).map((x_) => x_.name));
            await signOut(page);
        });

        // ============================================================ mgrsave (Rule 16, A3)
        if (on('mgrsave')) await sect('mgrsave', async () => {
            const readAssignBoxes = async () => {
                if (!V.sectionsTab) return null;
                await page.goto(app.url(`/index.php/${x}/en/management/settings/context?k3=${Date.now()}`));
                await idle(page).catch(() => {});
                await page.getByRole('tab', {name: V.sectionsTab, exact: true}).first().click();
                await idle(page).catch(() => {});
                const g = page.locator(V.sectionsGrid).first();
                await g.locator('tr.gridRow, tbody.empty').first().waitFor({state: 'attached', timeout: T}).catch(() => {});
                await sleep(500);
                if (isOMP) {
                    await g.getByRole('link', {name: /Add Series/}).first().click();
                } else {
                    const row = g.locator('tr.gridRow').first();
                    const id = await row.getAttribute('id');
                    await row.locator('a.show_extras').first().click(); await sleep(400);
                    await page.locator(`tr[id="${id}"] + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
                }
                const f = page.locator(V.sectionForm).first();
                await f.locator('input[name^="title"]').first().waitFor({timeout: T});
                await settle(); await sleep(500);
                const boxes = await f.locator('input[name^="subEditors"]').evaluateAll((els) => els.map((e) => (e.closest('label') || e.parentElement).innerText.replace(/\s+/g, ' ').trim()));
                const s = await snap('m-editorial-assignments', {boxes});
                const c = f.getByRole('link', {name: 'Cancel', exact: true}).first();
                if (await c.count()) await c.click().catch(() => {});
                await sleep(800);
                return {boxes, snap: s.name};
            };
            const peStageAccess = async (label) => {
                await as('pe');
                const out = {};
                for (const key of ['workflow_1', 'workflow_3', 'workflow_4']) {
                    const k = isOMP && key === 'workflow_3' ? 'workflow_2' : key;
                    await page.goto(app.url(`/index.php/${x}/en/dashboard/editorial?workflowSubmissionId=${S1}&workflowMenuKey=${k}`));
                    await idle(page).catch(() => {});
                    await page.locator('[role="dialog"]:visible').first().waitFor({timeout: T}).catch(() => {});
                    await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
                    await settle();
                    const s = await snap(`${label}-pe-${k}`);
                    const d = (s.s.text && s.s.text.dialog) || '';
                    out[k] = /don't currently have access/i.test(d) ? 'no access' : flat(d, 160);
                }
                await signOut(page);
                return out;
            };
            if (isOPS) {
                await as('m');
                await gotoRoles();
                fact('mgrsave.opsRows', {first: (await readRows())[0], customManager: await rowOf('K3 Manager')});
                await snap('m-ops-rows', {rows: await readRows()});
                await signOut(page);
                return;
            }
            fact('mgrsave.peBefore', await peStageAccess('m-before'));
            await as('m');
            await gotoRoles();
            const before = await rowOf(V.pe);
            const eaBefore = await readAssignBoxes();
            await gotoRoles();
            await openEdit(V.pe);
            const f = await readForm();
            await snap('m-pe-window', {form: f});
            await setBoxes({'Consider role in masthead list': true});
            const ok = await pressOK('m-pe');
            const right = await rowOf(V.pe);
            await gotoRoles();
            const after = await rowOf(V.pe);
            await snap('m-pe-rows-reloaded', {row: after});
            const eaAfter = await readAssignBoxes();
            await signOut(page);
            fact('mgrsave.pe', {rowBefore: before, window: {stageSection: f.stageSection, boxes: brief(f)}, request: ok.request, posted: ok.posted, notices: ok.notices.map((n) => n.text), rowRightAfter: right, rowAfterReload: after, editorialAssignmentsBefore: eaBefore, editorialAssignmentsAfter: eaAfter});
            fact('mgrsave.peAfter', await peStageAccess('m-after'));
        });

        // ============================================================ lockout (Rule 18)
        if (on('lockout')) await sect('lockout', async () => {
            const permitSettingsIn = async (who, roleName, label) => {
                await as(who);
                const st = await gotoRoles();
                const r = await openEdit(roleName);
                if (!r.ok) { const s = await snap(`l-${label}-no-edit`); await signOut(page); return {status: st, edit: r, snap: s.name}; }
                const f = await readForm();
                await snap(`l-${label}`, {form: f});
                const b = f.boxes.find((x_) => x_.name === 'permitSettings');
                await pressCancel();
                await signOut(page);
                return {checked: b.checked, disabled: b.disabled};
            };
            const L = {};
            if (!isOPS) {
                L.editorOnly_JournalEditor = await permitSettingsIn('e', V.editor, 'e-editor');
                L.editorOnly_ProductionEditor = await permitSettingsIn('e', V.pe, 'e-pe');
                L.twoRoles_JournalEditor = await permitSettingsIn('e2', V.editor, 'e2-editor');
                L.manager_JournalEditor = await permitSettingsIn('m', V.editor, 'm-editor');
            }
            // a custom manager-level role: give it the Settings box, then its only holder opens it
            await as('m');
            await gotoRoles();
            await openEdit('K3 Manager');
            const fm = await readForm();
            L.manager_CustomBefore = brief(fm);
            await setBoxes({'Permit changes to Settings': true});
            const okm = await pressOK('l-m-custom-tick');
            L.manager_CustomTick = {request: okm.request, notices: okm.notices.map((n) => n.text)};
            await signOut(page);
            L.customOnly_Custom = await permitSettingsIn('cm', 'K3 Manager', 'cm-custom');
            fact('lockout.boxes', L);
            // behind the guard: the only holder presses OK without touching the box
            const lockOut = async (who, roleName, label) => {
                const out = {};
                await as(who);
                await gotoRoles();
                await openEdit(roleName);
                const f = await readForm();
                out.boxBefore = f.boxes.find((b) => b.name === 'permitSettings');
                const ok = await pressOK(`l-${label}-ok`);
                out.request = ok.request; out.posted = ok.posted; out.notices = ok.notices.map((n) => n.text);
                const st = await gotoRoles();
                const s = await snap(`l-${label}-after-reload`);
                out.accessAfter = {status: st, rolesListShown: await grid().locator('tr.gridRow').first().isVisible().catch(() => false), main: flat(s.s.text && s.s.text.main, 200)};
                await signOut(page);
                await as('m');
                await gotoRoles();
                await openEdit(roleName);
                const fm2 = await readForm();
                out.storedAsSeenByManager = fm2.boxes.find((b) => b.name === 'permitSettings');
                await snap(`l-${label}-manager-reads`, {form: fm2});
                await pressCancel();
                await signOut(page);
                await as(who);
                const st2 = await page.goto(accessURL()).catch(() => null);
                await idle(page).catch(() => {});
                const s2 = await snap(`l-${label}-fresh-session`);
                out.accessFreshSession = {status: st2 && st2.status ? st2.status() : null, title: s2.s.title, main: flat(s2.s.text && s2.s.text.main, 200)};
                await signOut(page);
                return out;
            };
            fact('lockout.customOK', await lockOut('cm', 'K3 Manager', 'cm'));
            if (!isOPS) fact('lockout.editorOK', await lockOut('e', V.editor, 'e'));
        });

        // ============================================================ meta (Rule 19)
        if (on('meta')) await sect('meta', async () => {
            await as('m');
            const readPerm = async (label) => {
                await page.goto(app.url(`/index.php/${x}/en/dashboard/editorial?workflowSubmissionId=${S1}&workflowMenuKey=${V.wfStage}`));
                await idle(page).catch(() => {});
                const wf = page.locator('[role="dialog"]:visible').first();
                await wf.waitFor({timeout: T}).catch(() => {});
                await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
                await settle();
                const btn = wf.getByRole('button', {name: 'Sena Editor More Actions', exact: true});
                if (!(await btn.count())) { await snap(`${label}-no-row`); return {rowAbsent: true}; }
                await btn.first().click();
                await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
                const win = page.getByRole('dialog').filter({hasText: 'Edit Assignment'}).last();
                await win.locator('input[name="canChangeMetadata"]').waitFor({state: 'attached', timeout: T});
                await settle();
                const box = await win.locator('input[name="canChangeMetadata"]').evaluate((i) => {
                    const l = (i.id && document.querySelector(`label[for="${i.id}"]`)) || i.closest('label');
                    return {checked: i.checked, disabled: i.disabled, label: l ? l.innerText.trim() : null};
                });
                await snap(`${label}-edit-assignment`, {box});
                await win.locator('form').getByRole('link', {name: /^\s*Cancel\s*$/}).or(win.locator('form').getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
                await sleep(800);
                return box;
            };
            const setME = async (v, label) => {
                await gotoRoles();
                await openEdit(V.se);
                const before = brief(await readForm());
                await setBoxes({'Permit submission metadata edit.': v});
                const ok = await pressOK(label);
                return {before, request: ok.request, notices: ok.notices.map((n) => n.text)};
            };
            const out = {before: await readPerm('r19-before')};
            out.untick = await setME(false, 'r19-untick');
            out.afterUntick = await readPerm('r19-after-untick');
            out.tick = await setME(true, 'r19-tick');
            out.afterTick = await readPerm('r19-after-tick');
            fact('meta', out);
            await signOut(page);
        });

        // ============================================================ remove (Rules 20-21, A4, A6)
        if (on('remove')) await sect('remove', async () => {
            await as('m');
            await gotoRoles();
            const namesBefore = (await readRows()).map((r) => r.name);
            // the confirmation, then "Cancel"
            const a = await rowAction(V.unheldDefault, 'Remove');
            const dlg = page.getByRole('dialog').last();
            await dlg.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: T});
            const aria = await dlg.ariaSnapshot().catch(() => null);
            const s = await snap('r-confirm', {aria});
            await loc(page, 'Remove confirmation: getByRole(dialog).last() with button OK', dlg);
            const confirm = {action: a, text: s.s.text && s.s.text.dialog, aria};
            const t0 = Date.now();
            await dlg.getByRole('button', {name: 'Cancel', exact: true}).click();
            await sleep(900);
            const namesAfterCancel = (await readRows()).map((r) => r.name);
            await gotoRoles();
            const namesAfterCancelReload = (await readRows()).map((r) => r.name);
            fact('remove.confirmCancel', {confirm, requests: since(posts, t0).length, sameListRightAfter: JSON.stringify(namesBefore) === JSON.stringify(namesAfterCancel), sameListAfterReload: JSON.stringify(namesBefore) === JSON.stringify(namesAfterCancelReload)});
            // every outcome
            const O = {};
            O.unheldDefault = await removeRole(V.unheldDefault, 'r-unheld-default');
            O.heldDefault = await removeRole(V.se, 'r-held-default');
            O.current = await removeRole('K3 Current', 'r-current');
            O.pastOnly = await removeRole('K3 Past', 'r-past');
            O.currentAndPast = await removeRole('K3 Mix', 'r-mix');
            O.unheldCreated = await removeRole('K3 Spare', 'r-spare');
            for (const [k, v] of Object.entries(O)) fact(`remove.${k}`, {confirm: v.confirm && v.confirm.text, status: v.status, notices: v.notices && v.notices.map((n) => `${n.text} @${n.chain} ${JSON.stringify(n.box)}`), rowRightAfter: !!v.rowRightAfter, rowAfterReload: !!v.rowAfterReload, failed: v.failed});
            // A5: "Remove" again on the removed role's row, before a reload
            await gotoRoles();
            await openCreate();
            await chooseLevel('Reader');
            await fillNames('K3 Twice', 'QZZ');
            await pressOK('r-twice-create');
            await gotoRoles();
            const tw = {};
            const a1 = await rowAction('K3 Twice', 'Remove');
            let d = page.getByRole('dialog').last();
            await d.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: T});
            let tt = await nowIn();
            await d.getByRole('button', {name: 'OK', exact: true}).click();
            await sleep(1500); await settle();
            tw.first = {action: a1, notices: (await noticesSince(tt)).map((n) => n.text), rowStill: !!(await rowOf('K3 Twice'))};
            const a2 = await rowAction('K3 Twice', 'Remove');
            if (a2.ok) {
                d = page.getByRole('dialog').last();
                await d.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: T});
                tt = await nowIn();
                const tl = Date.now();
                await d.getByRole('button', {name: 'OK', exact: true}).click();
                await sleep(1500); await settle();
                tw.second = {notices: (await noticesSince(tt)).map((n) => n.text), failed: since(bad, tl), dialogs: since(dialogs, tl)};
                await snap('r-twice-second', tw);
            } else tw.second = a2;
            await gotoRoles();
            tw.rowAfterReload = !!(await rowOf('K3 Twice'));
            fact('remove.twice', tw);
            // gone from the invitation's role list (the screen that offers a role to a person)
            await page.goto(accessURL()); await idle(page).catch(() => {});
            const inv = page.getByRole('button', {name: 'Invite to a role'});
            if (await inv.count()) {
                await inv.click();
                const search = page.getByLabel(/Search for a user by email address/);
                await search.waitFor({timeout: T});
                await search.fill(`${u('au')}@mail.test`);
                await page.getByRole('button', {name: 'Search User', exact: true}).click();
                await page.getByRole('heading', {name: /Enter details/}).first().waitFor({timeout: T}).catch(() => {});
                await settle();
                let newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).last();
                if (!(await newRow.count())) { await page.getByRole('button', {name: 'Add Another Role'}).click().catch(() => {}); await sleep(500); newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).last(); }
                const opts = await newRow.getByRole('combobox').first().locator('option').allInnerTexts().catch(() => []);
                await snap('r-invite-role-options', {opts});
                fact('remove.inviteOptions', {spare: opts.some((o) => o.includes('K3 Spare')), twice: opts.some((o) => o.includes('K3 Twice')), current: opts.some((o) => o.includes('K3 Current')), count: opts.length});
            } else fact('remove.inviteOptions', 'no "Invite to a role" button');
            await signOut(page);
        });

        // ============================================================ ops2 (OPS2; controls on OJS, OMP)
        if (on('ops2')) await sect('ops2', async () => {
            await as('m');
            await gotoRoles();
            const filt = await grid().locator('select').evaluateAll((els) => els.map((s) => ({name: s.name, label: (s.labels && s.labels[0] ? s.labels[0].innerText : '').trim(), options: [...s.options].map((o) => o.text.trim())})));
            await snap('o-filter', {filt});
            fact('ops2.filters', filt);
            await openCreate();
            await chooseLevel('Reviewer');
            const f = await readForm();
            await snap('o-reviewer-window', {form: f});
            await fillNames('K3 Rev', 'QZV');
            const ok = await pressOK('o-reviewer');
            await gotoRoles();
            const row = await rowOf('K3 Rev');
            fact('ops2.reviewer', {stageSection: f.stageSection, boxes: brief(f), request: ok.request, notices: ok.notices.map((n) => n.text), row});
            fact('ops2.remove', await removeRole('K3 Rev', 'o-rev'));
            await signOut(page);
        });

        // ============================================================ A7: where the abbreviation shows
        await sect('abbrev', async () => {
            await as('m');
            await page.goto(accessURL()); await idle(page).catch(() => {});
            await page.getByRole('table', {name: /Current Users \(/}).waitFor({timeout: T}).catch(() => {});
            await snap('a-users-list');
            if (S2) {
                await page.goto(app.url(`/index.php/${x}/en/dashboard/editorial?workflowSubmissionId=${S2}&workflowMenuKey=${isOPS ? 'workflow_5' : 'workflow_4'}`));
                await idle(page).catch(() => {});
                await page.locator('[role="dialog"]:visible').first().waitFor({timeout: T}).catch(() => {});
                await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
                await settle();
                await snap('a-s2-participants');
            }
            await page.goto(app.url(`/index.php/${x}/en/about/editorialMasthead`)); await idle(page).catch(() => {});
            await snap('a-masthead');
            await signOut(page);
            await as('h');
            await page.goto(app.url(`/index.php/${x}/en/user/profile`)); await idle(page).catch(() => {});
            await snap('a-h-profile');
            const rolesTab = page.getByRole('tab', {name: 'Roles', exact: true}).or(page.getByRole('link', {name: 'Roles', exact: true}));
            if (await rolesTab.count()) { await rolesTab.first().click(); await idle(page).catch(() => {}); await snap('a-h-profile-roles'); }
            await signOut(page);
        });
        fact('abbrevSeen', abbrevSeen);
    } finally {
        record('k3-facts', facts);
        await close();
    }
});
