// U75 claim check, chunk K1: the "Relations" control and who may save it.
// Spec: docs/specs/U75-preprint-relations.md — Purpose (12–27), Actors & permissions (36–54), Fields (58–68),
// Rules 1–6 (74–130), Side effects (193–200), Setting 1 (204–211), the scenarios preamble (245–248), Coverage
// (251–279), register A1–A4 (297–342); footnotes a, c, d, e, f, l, m, s0, td1–td6, td9, f-a1–f-a4.
//
//   PROBE_FEATURE=U75 PROBE_AGENT=ccK1 node bin/probe.js ops shared/playwright/checks/U75/K1/k1.js
//   PROBE_FEATURE=U75 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U75/K1/k1.js   (OJS/OMP: controls phase only)
//   PHASES=seed,where,levels,author,moderator,manager,versions,scheduled,wizard,setting,reach,leave,controls
//   (default: all; OPS state in k1-state-ops.json, so a phase can be re-run alone; delete it for a fresh seed)
//
// Scratch preprint server S (OPS), users: mg manager, mo Moderator (assigned, with the edit permission),
// mn Moderator (assigned, seeded without it on A; unticked on screen on B), mu Moderator not assigned,
// au Author (submitter), ab a second Author, eb Editorial Board Member, rd Reader; `admin` (site admin).
//   A  unposted, participants mo, mn(no edit)        — the gate on an unposted version, every level
//   B  posted, participants mo, mn                    — the gate on a posted version (A1, td1, td2)
//   C  unposted, the Author's own permission unticked on screen (Actors: Author without the permission)
//   D  unposted                                       — manager: td3 (bare DOI, full address, empty), td6 (A3), Rule 5a
//   E  posted                                         — td5: versions (Rule 1, 1a)
//   F  draft (submitted: false)                       — td4: the wizard's "For Readers" and "Review" (Rule 2)
//   G  unposted, then scheduled on screen             — the Author on a scheduled version (A1)
//   H  posted                                         — a seeded preprint's "Relations" before anyone answers (Rule 2)
// Scratch preprint server T (OPS): Settings bullet 1 (td9): Roles › Author / Moderator "Permit submission metadata
// edit." unticked and ticked again on screen; J unposted by au3 with mo3 assigned.
// OJS/OMP: a scratch context each, one submission; the publication pages' control region as read-only controls.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'where', 'levels', 'author', 'moderator', 'manager', 'versions', 'switch', 'scheduled', 'wizard', 'wizard2', 'wizard3', 'setting', 'preview', 'reach', 'leave', 'notes', 'controls'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k1]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 2000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const DOI_URL = 'https://doi.org/10.1234/elsewhere';
const PUBLISHED = 'This preprint has been published elsewhere.';
const NONE = 'This preprint has not been published elsewhere.';
const UNKNOWN = "This preprint's relations have not been entered.";

forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
    let S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : null;
    const saveState = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 2));
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('k1-facts', {[k]: v}, {merge: true}); log('FACT', k, JSON.stringify(v).slice(0, 600)); };

    // ------------------------------------------------------------------ OJS / OMP: read-only controls
    if (!isOPS) {
        if (!on('controls')) return;
        const ctx = tag('u75k1c');
        const users = [{username: `${ctx}mg`, roles: ['manager'], givenName: 'Mina', familyName: 'Manager'}, {username: `${ctx}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'}];
        const spec = {tag: ctx, context: {name: `Scratch ${ctx}`}, users};
        if (app.name === 'ojs') spec.sections = [{abbrev: 'ART', title: 'Articles'}];
        await app.api.createContext(spec);
        const sub = await app.api.createSubmission({tag: `${ctx}a`, context: ctx, submitter: `${ctx}au`, title: `K1 control ${ctx}`});
        const pub = await app.api.createSubmission({tag: `${ctx}b`, context: ctx, submitter: `${ctx}au`, title: `K1 control published ${ctx}`, published: true});
        const {page, close} = await launch(app);
        try {
            for (const [who, dash] of [[`${ctx}mg`, 'editorial'], [`${ctx}au`, 'mySubmissions']]) {
                await signIn(page, who, {contextPath: ctx});
                for (const [label, s] of [['unpublished', sub], ['published', pub]]) {
                    await page.goto(app.url(`/index.php/${ctx}/dashboard/${dash}?workflowSubmissionId=${s.submissionId}&workflowMenuKey=publication_${s.publicationId}_titleAbstract`));
                    await idle(page);
                    await page.locator('[data-cy="workflow-controls-left"]').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
                    await idle(page); await sleep(800);
                    const sc = await screen(page);
                    sc.controlsLeft = flat(await page.locator('[data-cy="workflow-controls-left"]').first().innerText().catch(() => null));
                    sc.relationsButtons = await page.getByRole('button', {name: /Relations/}).count();
                    sc.relationDropdown = await page.locator('.pkpWorkflow__publicationRelation').count();
                    const name = `z-control-${label}-${who.endsWith('mg') ? 'mgr' : 'author'}-ta`;
                    record(name, sc);
                    await shot(page, name).catch(() => {});
                    fact(name, {controlsLeft: sc.controlsLeft, relationsButtons: sc.relationsButtons, relationDropdown: sc.relationDropdown});
                }
            }
            // Roles › Author: "Permit submission metadata edit." default (Setting 1's "Default on a preprint server")
            await signIn(page, `${ctx}mg`, {contextPath: ctx});
            fact('roles-author-permit-default', await readRoleBox(page, app, ctx, 'Author', 'z-control-roles-author'));
        } finally {
            await close();
        }
        return;
    }

    // ------------------------------------------------------------------ OPS
    if (on('seed')) {
        const ctx = tag('u75k1s');
        const U = (k, roles, g, f, extra = {}) => ({username: `${ctx}${k}`, roles, givenName: g, familyName: f, ...extra});
        const users = [
            U('mg', ['manager'], 'Mina', 'Manager'),
            U('mo', ['sectionEditor'], 'Molly', 'Moderator'),
            U('mn', ['sectionEditor'], 'Nora', 'Noedit'),
            U('mu', ['sectionEditor'], 'Ulla', 'Unassigned'),
            U('au', ['author'], 'Ada', 'Author'),
            U('ab', ['author'], 'Bea', 'Otherauthor'),
            U('eb', ['editorialBoardMember'], 'Ebba', 'Board'),
            U('rd', ['reader'], 'Rita', 'Reader'),
        ];
        const created = await app.api.createContext({tag: ctx, context: {name: `Scratch ${ctx}`}, users});
        const sub = (k, extra = {}) => app.api.createSubmission({tag: `${ctx}${k}`, context: ctx, submitter: `${ctx}au`, title: `K1 ${k.toUpperCase()} ${ctx}`, ...extra});
        const mo = {username: `${ctx}mo`, role: 'sectionEditor'};
        const mnOff = {username: `${ctx}mn`, role: 'sectionEditor', canChangeMetadata: false};
        const mnOn = {username: `${ctx}mn`, role: 'sectionEditor'};
        const s = {};
        s.A = await sub('a', {participants: [mo, mnOff]});
        s.B = await sub('b', {participants: [mo, mnOn], published: true});
        s.C = await sub('c', {participants: [mo]});
        s.D = await sub('d', {participants: [mo]});
        s.E = await sub('e', {participants: [mo], published: true});
        s.F = await sub('f', {submitted: false});
        s.G = await sub('g', {participants: [mo]});
        s.H = await sub('h', {participants: [mo], published: true});
        // Server T for Setting 1
        const ctx2 = tag('u75k1t');
        await app.api.createContext({tag: ctx2, context: {name: `Scratch ${ctx2}`}, users: [
            {username: `${ctx2}mg`, roles: ['manager'], givenName: 'Tina', familyName: 'Manager'},
            {username: `${ctx2}au`, roles: ['author'], givenName: 'Theo', familyName: 'Author'},
            {username: `${ctx2}mo`, roles: ['sectionEditor'], givenName: 'Tom', familyName: 'Moderator'},
        ]});
        const J = await app.api.createSubmission({tag: `${ctx2}j`, context: ctx2, submitter: `${ctx2}au`, title: `K1 J ${ctx2}`, participants: [{username: `${ctx2}mo`, role: 'sectionEditor'}]});
        S = {ctx, ctx2, contextId: created.contextId, s, J, raw: {A: s.A}};
        saveState();
        log('seeded', ctx, ctx2, JSON.stringify(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, [v.submissionId, v.publicationId]]))), 'J', J.submissionId, J.publicationId);
        fact('seed', {ctx, ctx2, s: Object.fromEntries(Object.entries(s).map(([k, v]) => [k, {id: v.submissionId, pub: v.publicationId}])), J: {id: J.submissionId, pub: J.publicationId}, keysOfA: Object.keys(s.A)});
    }
    if (!S) throw new Error('no state: run the seed phase first');
    const {ctx, ctx2} = S;
    const u = (k) => `${ctx}${k}`;

    const {page, context, close} = await launch(app);
    let who = null;
    const as = async (user, c = ctx) => { await signIn(page, user, {contextPath: c}); await idle(page); who = user; };
    const visitor = async () => { await signOut(page).catch(() => {}); who = 'visitor'; };
    const wf = () => page.locator('[role="dialog"]:visible').first();
    const controlsLeft = () => page.locator('[data-cy="workflow-controls-left"]').first();
    const relBtn = () => controlsLeft().getByRole('button', {name: /^Relations/});
    const panel = () => page.locator('.pkpWorkflow__publicationRelation .pkpDropdown__content').first();

    async function snap(name, extra = {}) {
        const sc = await screen(page);
        Object.assign(sc, {who}, extra);
        record(name, sc);
        await shot(page, name).catch(() => {});
        return sc;
    }

    // The workflow's own GETs of the submission and its publications: the stored relation as the page received it.
    let lastPubs = {};
    page.on('response', async (r) => {
        try {
            if (r.request().method() !== 'GET') return;
            const url = r.url().split('?')[0];
            if (!/\/api\/v1\/submissions\/\d+(\/publications\/\d+)?$/.test(url)) return;
            const j = await r.json().catch(() => null);
            if (!j) return;
            const pubs = j.publications ? j.publications : [j];
            for (const x of pubs) if (x && x.id) lastPubs[x.id] = {relationStatus: x.relationStatus, vorDoi: x.vorDoi, status: x.status, version: x.version};
        } catch (e) { /* none */ }
    });
    const stored = (pid) => (lastPubs[pid] ? {...lastPubs[pid]} : null);

    async function gotoWf(sid, {author = false, pub = null, entry = 'titleAbstract', c = ctx} = {}) {
        const dash = author ? 'mySubmissions' : 'editorial';
        const key = pub ? `&workflowMenuKey=publication_${pub}_${entry}` : '';
        const resp = await page.goto(app.url(`/index.php/${c}/dashboard/${dash}?workflowSubmissionId=${sid}${key}`)).catch((e) => ({err: String(e.message).slice(0, 200)}));
        await idle(page);
        await Promise.race([
            controlsLeft().waitFor({state: 'visible', timeout: T}),
            page.getByRole('link', {name: 'Preprint', exact: true}).first().waitFor({state: 'visible', timeout: T}),
            page.getByText('The current role does not have access to this operation.').first().waitFor({state: 'visible', timeout: T}),
        ]).catch(() => {});
        await idle(page);
        if (pub && entry === 'titleAbstract') await wf().getByRole('button', {name: 'Save', exact: true}).first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
        await sleep(500);
        return resp && typeof resp.status === 'function' ? resp.status() : resp;
    }

    async function readPanel() {
        const p = panel();
        const open = await p.isVisible().catch(() => false);
        if (!open) return {open};
        const radios = await p.locator('input[name="relationStatus"]').evaluateAll((els) => els.map((e) => ({
            label: ((e.closest('label') || e.parentElement).innerText || '').replace(/\s+/g, ' ').trim(),
            value: e.value, checked: e.checked, disabled: e.disabled, required: e.required,
        }))).catch(() => []);
        const doiEl = p.locator('input[name="vorDoi"]');
        const doi = (await doiEl.count()) ? {
            visible: await doiEl.first().isVisible().catch(() => false),
            value: await doiEl.first().inputValue().catch(() => null),
            disabled: await doiEl.first().isDisabled().catch(() => null),
            label: flat(await p.locator('label').filter({hasText: /DOI/}).first().innerText().catch(() => null)),
            description: flat(await p.locator('.pkpFormField--text .pkpFormField__description, [id$="vorDoi-description"]').first().innerText({timeout: 1000}).catch(() => null)),
        } : {present: false};
        const save = p.getByRole('button', {name: 'Save', exact: true});
        return {
            open, radios, doi,
            save: {count: await save.count(), enabled: await save.first().isEnabled().catch(() => null)},
            fieldErrors: await p.locator('.pkpFieldError').allInnerTexts().catch(() => []),
            legend: flat(await p.locator('legend').first().innerText({timeout: 1000}).catch(() => null)),
            text: flat(await p.innerText().catch(() => null)),
            buttons: await p.getByRole('button').evaluateAll((els) => els.map((e) => ({t: e.textContent.replace(/\s+/g, ' ').trim(), disabled: e.disabled}))).catch(() => []),
        };
    }

    async function openRel(name) {
        const b = relBtn();
        const offered = await b.count();
        const btn = offered ? {
            text: flat(await b.first().innerText()), expanded: await b.first().getAttribute('aria-expanded'),
            hasIcon: await b.first().locator('svg, .pkpIcon, [class*="icon" i]').count(), enabled: await b.first().isEnabled(),
        } : null;
        if (!offered) { const sc = await snap(name, {relations: {offered: 0}}); return {offered: 0, sc}; }
        if (!(await panel().isVisible().catch(() => false))) await b.first().click();
        await panel().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
        await sleep(400);
        const state = await readPanel();
        // placement: the panel under the button?
        const geo = await page.evaluate(() => {
            const b = document.querySelector('.pkpWorkflow__publicationRelation button');
            const c = document.querySelector('.pkpWorkflow__publicationRelation .pkpDropdown__content');
            const r = (e) => (e ? (({x, y, width, height}) => ({x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height)}))(e.getBoundingClientRect()) : null);
            return {button: r(b), panel: r(c)};
        }).catch(() => null);
        await snap(name, {relations: {offered, btn, state, geo, controlsLeft: flat(await controlsLeft().innerText().catch(() => null))}});
        return {offered, btn, state, geo};
    }

    async function setStatus(label) {
        const r = panel().locator('input[name="relationStatus"]').filter({has: page.locator('xpath=.')});
        const radio = panel().getByRole('radio', {name: label, exact: true});
        if (await radio.count()) { await radio.first().check({timeout: 5000}).catch(async () => radio.first().click({force: true})); }
        else await r.first().click();
        await sleep(300);
    }
    async function setDoi(v) {
        const d = panel().locator('input[name="vorDoi"]').first();
        if (!(await d.isVisible().catch(() => false))) return false;
        await d.fill(v);
        return true;
    }

    // Press the panel's Save; read the answer, what shows at once, and what is on the page 6 s later.
    async function relSave(name) {
        await page.evaluate(() => {
            window.__k1added = [];
            window.__k1obs && window.__k1obs.disconnect();
            window.__k1obs = new MutationObserver((ms) => {
                for (const m of ms) for (const n of m.addedNodes) {
                    if (n.nodeType !== 1) continue;
                    const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
                    if (t && t.length < 400) window.__k1added.push({cls: String(n.className || '').slice(0, 80), role: n.getAttribute('role'), t});
                }
            });
            window.__k1obs.observe(document.body, {childList: true, subtree: true});
        });
        const reqs = [];
        const onReq = (r) => { if (/\/api\/v1\/submissions\/\d+\/publications\/\d+/.test(r.url()) && r.method() !== 'GET') reqs.push({method: r.method(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), override: r.headers()['x-http-method-override'] || null, body: (r.postData() || '').slice(0, 400)}); };
        page.on('request', onReq);
        const save = panel().getByRole('button', {name: 'Save', exact: true}).first();
        const enabled = await save.isEnabled().catch(() => null);
        const w = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/publications\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await save.click({timeout: 5000}).catch(() => {});
        const resp = await w;
        let body = null;
        if (resp) body = await resp.json().catch(() => null);
        await sleep(700);
        const immediate = {
            status: resp ? resp.status() : null,
            errorMessage: body && (body.errorMessage || body.error) ? (body.errorMessage || body.error) : null,
            bodyKeys: body && !body.errorMessage ? Object.keys(body).slice(0, 8) : null,
            saved: {relationStatus: body && body.relationStatus, vorDoi: body && body.vorDoi},
            statusTexts: await page.locator('.pkpWorkflow__publicationRelation [role="status"]').allInnerTexts().catch(() => []),
            anyStatus: await page.locator('[role="status"]:visible').allInnerTexts().catch(() => []),
            panel: await readPanel(),
            appDialogs: await page.locator('[data-cy="dialog"]:visible, [role="alertdialog"]:visible').allInnerTexts().catch(() => []),
        };
        const sc = await snap(`${name}`, {save: {enabled, immediate, reqs}});
        await sleep(5500);
        const later = {
            statusTexts: await page.locator('.pkpWorkflow__publicationRelation [role="status"]').allInnerTexts().catch(() => []),
            panelOpen: await panel().isVisible().catch(() => false),
            added: await page.evaluate(() => { window.__k1obs && window.__k1obs.disconnect(); return window.__k1added || []; }).catch(() => []),
        };
        page.off('request', onReq);
        record(`${name}-later`, {later});
        const out = {enabled, reqs, ...immediate, later: {statusTexts: later.statusTexts, panelOpen: later.panelOpen}, toasts: later.added.filter((a) => /notif|toast|alert|status/i.test(a.cls + ' ' + (a.role || ''))).map((a) => a.t).slice(0, 10), addedSample: later.added.map((a) => a.t).filter((t) => /allowed|saved|not saved|error|valid/i.test(t)).slice(0, 10)};
        log(name, JSON.stringify({status: out.status, err: out.errorMessage, statusTexts: out.statusTexts, toasts: out.toasts}));
        return out;
    }

    // The preprint page (or any frontend address) as a reader sees it: the notices and the lines around the title.
    async function readerPage(url, name) {
        const resp = await page.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)}));
        await idle(page).catch(() => {});
        const d = await page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const notes = [...document.querySelectorAll('.cmp_notification')].map((n) => ({cls: n.className, t: f(n.innerText), links: [...n.querySelectorAll('a')].map((a) => ({t: f(a.innerText), href: a.getAttribute('href'), target: a.getAttribute('target')}))}));
            return {h1: [...document.querySelectorAll('h1')].map((h) => f(h.innerText)), notices: notes, label: f(document.querySelector('.preprint_label, .label')?.innerText), top: f((document.querySelector('.obj_preprint_details, .page_article, main, .pkp_structure_main') || document.body).innerText).slice(0, 500)};
        }).catch((e) => ({err: String(e.message).slice(0, 200)}));
        d.status = resp && typeof resp.status === 'function' ? resp.status() : resp;
        await snap(name, {reader: d});
        return d;
    }

    // The header's "Preview": a new tab or the same one; the notices it shows.
    async function preview(name) {
        const pv = page.getByRole('button', {name: 'Preview', exact: true}).first();
        if (!(await pv.count())) return {offered: 0};
        const popup = context.waitForEvent('page', {timeout: 8_000}).catch(() => null);
        const before = page.url();
        await pv.click();
        const np = await popup;
        const tgt = np || page;
        await tgt.waitForLoadState('domcontentloaded').catch(() => {});
        await idle(tgt).catch(() => {}); await sleep(800);
        const sc = await screen(tgt);
        sc.notices = await tgt.locator('.cmp_notification').allInnerTexts().catch(() => []);
        sc.newTab = !!np;
        record(name, sc); await shot(tgt, name).catch(() => {});
        const out = {offered: 1, newTab: !!np, sameTabNavigated: !np && page.url() !== before, url: tgt.url().replace(/^https?:\/\/[^/]+/, ''), notices: sc.notices.map((t) => flat(t)), h1: flat(await tgt.locator('h1').first().innerText().catch(() => null))};
        if (np) await np.close();
        return out;
    }

    // The workflow's Activity Log: the "Submission metadata updated" rows with their user.
    async function activityLog(name) {
        const b = page.getByRole('button', {name: 'Activity Log', exact: true});
        if (!(await b.count())) return {offered: false};
        await b.first().click();
        const m = page.locator('[data-cy="active-modal"]').filter({hasText: 'Activity Log'}).last();
        await m.locator('tr.gridRow').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
        await idle(page); await sleep(500);
        const rows = await m.locator('tr.gridRow').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
        await snap(name, {activityRows: rows});
        await m.getByRole('button', {name: 'Close'}).first().click().catch(() => {});
        await page.getByText('Activity Log & Notes').first().waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
        await sleep(600);
        return {offered: true, rows: rows.length, metadataUpdated: rows.filter((r) => /Submission metadata updated/.test(r)), all: rows.slice(0, 20)};
    }

    const mailFor = async () => {
        const r = await app.mail._search({to: ctx}).catch(() => ({messages: []}));
        return (r.messages || []).map((m) => ({to: (m.To || []).map((t) => t.Address).join(','), subject: m.Subject, created: m.Created}));
    };

    // Full per-level drive of one version: open Title & Abstract, record its Save, open Relations, change, save, reload.
    async function gateDrive(label, sid, pub, {author = false, target = PUBLISHED, doi = DOI_URL, c = ctx} = {}) {
        const out = {};
        out.http = await gotoWf(sid, {author, pub, c});
        out.storedAtLoad = stored(pub);
        const ta = wf().getByRole('button', {name: 'Save', exact: true}).first();
        out.taSave = {count: await ta.count(), enabled: await ta.isEnabled().catch(() => null)};
        out.controlsLeft = flat(await controlsLeft().innerText().catch(() => null));
        out.heading = flat(await wf().getByRole('heading', {name: /^Preprint: /}).first().innerText().catch(() => null));
        out.warnings = flat(await wf().locator('.pkpNotification, [class*="warning" i]').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 400);
        await snap(`${label}-01-ta`, {gate: out});
        out.open = await openRel(`${label}-02-relations-open`);
        if (!out.open.offered) return out;
        await setStatus(target);
        if (target === PUBLISHED && doi != null) out.doiFilled = await setDoi(doi);
        out.beforeSave = await readPanel();
        out.save = await relSave(`${label}-03-saved`);
        // reload: what is stored
        await gotoWf(sid, {author, pub, c});
        out.storedAfterReload = stored(pub);
        out.reload = await openRel(`${label}-04-reload-relations`);
        out.after = out.reload.state;
        fact(label, {storedAtLoad: out.storedAtLoad, storedAfterReload: out.storedAfterReload, http: out.http, taSave: out.taSave, controlsLeft: out.controlsLeft, heading: out.heading, warnings: out.warnings,
            panel: out.open.state && {radios: out.open.state.radios, doi: out.open.state.doi, save: out.open.state.save},
            save: {enabled: out.save.enabled, status: out.save.status, errorMessage: out.save.errorMessage, statusTexts: out.save.statusTexts, later: out.save.later, toasts: out.save.toasts, added: out.save.addedSample, panelAfter: out.save.panel && {radios: (out.save.panel.radios || []).map((r) => r.checked && r.label), doi: out.save.panel.doi}, reqs: out.save.reqs},
            afterReload: out.after && {checked: (out.after.radios || []).filter((r) => r.checked).map((r) => r.label), doi: out.after.doi}});
        return out;
    }

    try {
        // ============================================================== where (Rule 4, Fields): every page of a version
        if (on('where')) {
            const {A} = S.s;
            await as(u('mg'));
            await gotoWf(A.submissionId);
            await snap('a-01-mgr-workflow-landing', {controlsLeft: flat(await controlsLeft().innerText().catch(() => null))});
            // the side menu's entries
            const links = await wf().getByRole('link').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
            const menuKeys = await wf().locator('a[href*="workflowMenuKey"], [data-menu-key]').evaluateAll((els) => els.map((e) => e.getAttribute('href') || e.getAttribute('data-menu-key'))).catch(() => []);
            fact('where-menu-mgr', {links, menuKeys: menuKeys.slice(0, 30)});
            const pages = {};
            const ENTRIES = ['Title & Abstract', 'Contributors', 'Metadata', 'References', 'Funding', 'Galleys', 'Media', 'Permissions & Disclosure', 'Preprint entry'];
            for (const entry of ENTRIES) {
                const link = wf().getByRole('treeitem', {level: 2}).getByRole('link', {name: entry, exact: true}).first();
                if (!(await link.isVisible().catch(() => false))) { pages[entry] = 'not in menu'; continue; }
                await link.click().catch(() => {});
                await idle(page); await sleep(700);
                const heading = flat(await wf().getByRole('heading').first().innerText().catch(() => null));
                const cl = flat(await controlsLeft().innerText().catch(() => null));
                const n = await relBtn().count();
                pages[entry] = {heading, controlsLeft: cl, relations: n};
                await snap(`a-02-mgr-page-${entry.replace(/[^A-Za-z]+/g, '').toLowerCase()}`, {page: pages[entry]});
            }
            fact('where-pages-mgr', pages);
            // Production stage page (not a version page): is "Relations" there?
            const prod = wf().getByRole('link', {name: 'Production', exact: true}).first();
            if (await prod.count()) { await prod.click(); await idle(page); await sleep(800); }
            fact('where-production-stage', {controlsLeft: flat(await controlsLeft().innerText().catch(() => null)), relations: await relBtn().count()});
            await snap('a-03-mgr-production-stage');
            // open the panel on Title & Abstract: the form (Fields), where it sits
            await gotoWf(A.submissionId, {pub: A.publicationId});
            const o = await openRel('a-04-mgr-relations-open-unposted');
            await loc(page, 'the "Relations" button (control region, left)', relBtn());
            await loc(page, 'the Relations panel', panel());
            await loc(page, 'the "Relation status" radios', panel().locator('input[name="relationStatus"]'));
            await loc(page, 'the panel\'s Save', panel().getByRole('button', {name: 'Save', exact: true}));
            // tick each choice in turn: the DOI box shows only with published
            const shows = {};
            for (const l of [PUBLISHED, NONE, UNKNOWN, PUBLISHED]) {
                await setStatus(l);
                const st = await readPanel();
                shows[l + (shows[l] ? ' (again)' : '')] = {doi: st.doi, checked: st.radios.filter((r) => r.checked).map((r) => r.label)};
            }
            await loc(page, 'the "DOI of the published preprint" box', panel().locator('input[name="vorDoi"]'));
            await snap('a-05-mgr-relations-published-ticked-unsaved');
            fact('where-panel', {btn: o.btn, geo: o.geo, state: o.state, shows, stored: stored(A.publicationId)});
            // Author's side menu and pages (Rule 4 for the Author)
            await as(u('au'));
            await gotoWf(A.submissionId, {author: true});
            await snap('a-06-author-workflow-landing', {controlsLeft: flat(await controlsLeft().innerText().catch(() => null))});
            const alinks = await wf().getByRole('link').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
            const apages = {};
            for (const entry of ['Title & Abstract', 'Contributors', 'Metadata', 'References', 'Funding', 'Galleys', 'Media', 'Permissions & Disclosure', 'Preprint entry', 'Production Tasks & Discussions']) {
                const link = wf().getByRole('link', {name: entry, exact: true}).first();
                if (!(await link.isVisible().catch(() => false))) { apages[entry] = 'not in menu'; continue; }
                await link.click().catch(() => {});
                await idle(page); await sleep(700);
                apages[entry] = {heading: flat(await wf().getByRole('heading').first().innerText().catch(() => null)), controlsLeft: flat(await controlsLeft().innerText().catch(() => null)), relations: await relBtn().count()};
                await snap(`a-07-author-page-${entry.replace(/[^A-Za-z]+/g, '').toLowerCase()}`, {page: apages[entry]});
            }
            fact('where-pages-author', {links: alinks, pages: apages});
        }

        // ============================================================== author (td1, A1, Actors row 3 bullet 3)
        if (on('author')) {
            const {A, B} = S.s;
            await as(u('au'));
            // control: unposted, own, default permission
            const a = await gateDrive('b-au-unposted-A', A.submissionId, A.publicationId, {author: true});
            // posted: expected refused
            const b = await gateDrive('b-au-posted-B', B.submissionId, B.publicationId, {author: true});
            await visitor();
            fact('b-reader-page-B-after-author', await readerPage(app.url(`/index.php/${ctx}/preprint/view/${B.submissionId}`), 'b-05-reader-B-after-author-save'));
            fact('b-reader-page-A-unposted-visitor', await readerPage(app.url(`/index.php/${ctx}/preprint/view/${A.submissionId}`), 'b-06-reader-A-unposted-visitor'));
            // manager's "Preview" of A: the notice on an unposted version after the Author's save
            await as(u('mg'));
            await gotoWf(A.submissionId, {pub: A.publicationId});
            fact('b-mgr-preview-A', await preview('b-07-mgr-preview-A'));
        }

        // ============================================================== moderator (td2, A2, Rule 6, Actors row 3 bullets 2 and 4)
        if (on('moderator')) {
            const {A, B} = S.s;
            // mn seeded without the permission on A (unposted)
            await as(u('mn'));
            await gateDrive('c-mn-noedit-unposted-A', A.submissionId, A.publicationId, {target: NONE});
            // td2 on screen: the manager unticks mn's "Permissions" on posted B
            await as(u('mg'));
            await gotoWf(B.submissionId);
            const prod = wf().getByRole('link', {name: 'Production', exact: true}).first();
            if (await prod.count()) { await prod.click(); await idle(page); }
            await page.locator('[data-cy="participant-manager"]').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
            await snap('c-01-mgr-B-participants');
            const ea = await editAssignment('Nora Noedit', false, 'c-02-mgr-B-edit-assignment-mn');
            fact('c-mgr-untick-mn-on-B', ea);
            await as(u('mn'));
            await gateDrive('c-mn-unticked-posted-B', B.submissionId, B.publicationId, {target: NONE});
            // control: mo with the permission on posted B
            await as(u('mo'));
            await gateDrive('c-mo-edit-posted-B', B.submissionId, B.publicationId, {target: PUBLISHED});
            await visitor();
            fact('c-reader-page-B-after-mo', await readerPage(app.url(`/index.php/${ctx}/preprint/view/${B.submissionId}`), 'c-05-reader-B-after-mo-save'));
            // control: mo on unposted A
            await as(u('mo'));
            await gateDrive('c-mo-edit-unposted-A', A.submissionId, A.publicationId, {target: NONE});
        }

        // ============================================================== manager & admin & author-without-permission (Actors; Rule 5a; side effects)
        if (on('levels')) {
            const {B, C} = S.s;
            // the manager unticks the Author's own permission on C (Author without the edit permission)
            await as(u('mg'));
            await gotoWf(C.submissionId);
            const prod = wf().getByRole('link', {name: 'Production', exact: true}).first();
            if (await prod.count()) { await prod.click(); await idle(page); }
            await page.locator('[data-cy="participant-manager"]').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
            fact('d-mgr-untick-au-on-C', await editAssignment('Ada Author', false, 'd-01-mgr-C-edit-assignment-au'));
            await as(u('au'));
            await gateDrive('d-au-noedit-unposted-C', C.submissionId, C.publicationId, {author: true});
            // Site Administrator on posted B
            await as('admin');
            await gateDrive('d-admin-posted-B', B.submissionId, B.publicationId, {target: NONE});
            // Manager on posted B: "published elsewhere" with DOI; the preprint page at once; no new version / posting
            await as(u('mg'));
            const mailBefore = await mailFor();
            await gotoWf(B.submissionId, {pub: B.publicationId});
            const logBefore = await activityLog('d-02-mgr-B-activity-before');
            const auHeaderBefore = null;
            const g = await gateDrive('d-mgr-posted-B', B.submissionId, B.publicationId, {target: PUBLISHED});
            await gotoWf(B.submissionId, {pub: B.publicationId});
            const logAfter = await activityLog('d-03-mgr-B-activity-after');
            const versions = await wf().getByRole('link').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter((t) => /Version|^\d+\.\d+|Posted|Unposted/.test(t))).catch(() => []);
            fact('d-mgr-B-log-and-versions', {logBefore, logAfter, versions, controlsLeft: flat(await controlsLeft().innerText().catch(() => null))});
            await sleep(3000);
            const mailAfter = await mailFor();
            fact('d-mail', {before: mailBefore.length, after: mailAfter.length, new: mailAfter.slice(0, Math.max(0, mailAfter.length - mailBefore.length))});
            await visitor();
            fact('d-reader-page-B-after-mgr', await readerPage(app.url(`/index.php/${ctx}/preprint/view/${B.submissionId}`), 'd-04-reader-B-after-mgr'));
            // notifications: the Author's header and dashboard after the saves
            await as(u('au'));
            await page.goto(app.url(`/index.php/${ctx}/dashboard/mySubmissions`)); await idle(page);
            const sc = await snap('d-05-author-dashboard-after-saves');
            const tasks = page.getByRole('button', {name: /Tasks|Notifications/}).first();
            let tasksText = null;
            if (await tasks.count()) { tasksText = flat(await tasks.innerText().catch(() => null)); await tasks.click().catch(() => {}); await idle(page); await sleep(800); const s2 = await snap('d-06-author-tasks-panel'); tasksText = {button: tasksText, panel: flat(s2.text.dialog || s2.text.main, 800)}; }
            fact('d-author-notifications', {header: flat(sc.text.header, 400), tasks: tasksText});
        }

        // ============================================================== manager (td3: the DOI box's values; td6: A3; Rule 5a/5b)
        if (on('manager')) {
            const {D} = S.s;
            await as(u('mg'));
            await gotoWf(D.submissionId, {pub: D.publicationId});
            const logBefore = await activityLog('e-00-mgr-D-activity-before');
            await openRel('e-01-mgr-D-relations-open');
            await setStatus(PUBLISHED);
            const vals = {};
            for (const [k, v] of [['bare', '10.1234/abcd'], ['noScheme', 'doi.org/10.1234/abcd'], ['doiPrefix', 'doi:10.1234/abcd'], ['full', 'https://doi.org/10.1234/abcd'], ['empty', ''], ['http', 'http://example.org/x']]) {
                if (!(await panel().isVisible().catch(() => false))) { await relBtn().first().click(); await panel().waitFor({state: 'visible', timeout: 5000}).catch(() => {}); }
                await setStatus(PUBLISHED);
                await setDoi(v);
                const r = await relSave(`e-02-mgr-D-save-${k}`);
                vals[k] = {value: v, status: r.status, errorMessage: r.errorMessage, fieldErrors: r.panel && r.panel.fieldErrors, statusTexts: r.statusTexts, toasts: r.toasts, added: r.addedSample, saveEnabledAfter: r.panel && r.panel.save, stored: r.saved};
                // after a refusal: reload and read what is stored
                await gotoWf(D.submissionId, {pub: D.publicationId});
                const rl = await openRel(`e-03-mgr-D-reload-after-${k}`);
                vals[k].afterReload = rl.state && {checked: rl.state.radios.filter((x) => x.checked).map((x) => x.label), doi: rl.state.doi && rl.state.doi.value};
            }
            fact('e-td3-values', vals);
            // td6 / A3: published + DOI saved; tick "not published" (box hides), save; reload; tick published again
            if (!(await panel().isVisible().catch(() => false))) { await relBtn().first().click(); await panel().waitFor({state: 'visible', timeout: 5000}).catch(() => {}); }
            await setStatus(PUBLISHED); await setDoi(DOI_URL);
            const s1 = await relSave('e-04-mgr-D-save-published-doi');
            if (!(await panel().isVisible().catch(() => false))) { await relBtn().first().click(); await panel().waitFor({state: 'visible', timeout: 5000}).catch(() => {}); }
            await setStatus(NONE);
            const hidden = await readPanel();
            const s2 = await relSave('e-05-mgr-D-save-none');
            await gotoWf(D.submissionId, {pub: D.publicationId});
            const r1 = await openRel('e-06-mgr-D-reload-none');
            await setStatus(PUBLISHED);
            const back = await readPanel();
            await snap('e-07-mgr-D-published-ticked-again-after-reload', {back});
            // and "not entered" with the box holding the DOI
            await setStatus(UNKNOWN);
            const s3 = await relSave('e-08-mgr-D-save-unknown');
            await gotoWf(D.submissionId, {pub: D.publicationId});
            const r2 = await openRel('e-09-mgr-D-reload-unknown');
            await setStatus(PUBLISHED);
            const back2 = await readPanel();
            fact('e-td6', {save1: s1.saved, s1status: s1.status, hiddenDoi: hidden.doi, save2: {status: s2.status, stored: s2.saved, reqBody: s2.reqs && s2.reqs.map((r) => r.body)}, reloadNone: r1.state && {checked: r1.state.radios.filter((x) => x.checked).map((x) => x.label), doi: r1.state.doi}, backDoi: back.doi, save3: {status: s3.status, stored: s3.saved}, reloadUnknown: r2.state && {checked: r2.state.radios.filter((x) => x.checked).map((x) => x.label)}, back2Doi: back2.doi});
            // leave the panel unsaved (published ticked) by reloading; then the Preview has no notice (status unknown)
            await gotoWf(D.submissionId, {pub: D.publicationId});
            const logAfter = await activityLog('e-10-mgr-D-activity-after');
            fact('e-activity', {before: logBefore, after: logAfter});
            fact('e-preview-D', await preview('e-11-mgr-D-preview'));
        }

        // ============================================================== versions (td5; Rule 1, 1a)
        if (on('versions')) {
            const {E} = S.s;
            await as(u('mg'));
            await gateDrive('f-mgr-E-v1', E.submissionId, E.publicationId, {target: PUBLISHED});
            await gotoWf(E.submissionId, {pub: E.publicationId});
            // Create New Version
            let link = wf().getByRole('link', {name: 'Create New Version', exact: true}).first();
            const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await link.click();
            const dlg = page.getByRole('dialog').filter({has: page.locator('#version-versionSource-control')});
            await dlg.locator('#version-versionSource-control').waitFor({state: 'visible', timeout: T}).catch(() => {});
            await snap('f-01-mgr-E-create-version-dialog');
            await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
            const cr = await created;
            const v2 = cr ? await cr.json().catch(() => null) : null;
            await idle(page); await sleep(1200);
            S.v2 = v2 && v2.id; saveState();
            await snap('f-02-mgr-E-after-create', {v2: v2 && {id: v2.id, relationStatus: v2.relationStatus, vorDoi: v2.vorDoi, version: v2.version}});
            // Relations on the page the workflow shows now (the new version) — without reloading
            const liveAfterCreate = await openRel('f-03-mgr-E-relations-after-create-no-reload');
            // the new version by address
            await gotoWf(E.submissionId, {pub: S.v2});
            const v2open = await openRel('f-04-mgr-E-v2-relations');
            // save "not published" on v2
            await setStatus(NONE);
            const v2save = await relSave('f-05-mgr-E-v2-save-none');
            // select v1 in the side menu (no reload) and press Relations
            const labels = await wf().getByRole('link').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
            const tree = await wf().getByRole('treeitem').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || e.textContent).replace(/\s+/g, ' ').trim())).catch(() => []);
            await snap('f-06-mgr-E-side-menu', {labels, tree});
            let switched = null;
            const v1link = wf().getByRole('link', {name: /Version 1|1\.0|Posted/}).first();
            if (await v1link.count()) {
                const t = flat(await v1link.innerText());
                await v1link.click(); await idle(page); await sleep(800);
                // open its Title & Abstract if the group has entries
                const ta = wf().getByRole('link', {name: 'Title & Abstract', exact: true});
                const n = await ta.count();
                switched = {clicked: t, taLinks: n, url: page.url().replace(/^https?:\/\/[^/]+/, '')};
            }
            if (await panel().isVisible().catch(() => false)) await relBtn().first().click();
            const v1viaMenu = await openRel('f-07-mgr-E-v1-relations-via-side-menu');
            // v1 by address (reload)
            await gotoWf(E.submissionId, {pub: E.publicationId});
            const v1addr = await openRel('f-08-mgr-E-v1-relations-by-address');
            await visitor();
            const v1page = await readerPage(app.url(`/index.php/${ctx}/preprint/view/${E.submissionId}/version/${E.publicationId}`), 'f-09-reader-E-v1-version-page');
            const curPage = await readerPage(app.url(`/index.php/${ctx}/preprint/view/${E.submissionId}`), 'f-10-reader-E-current-page');
            const pick = (o) => o && o.state && {checked: (o.state.radios || []).filter((x) => x.checked).map((x) => x.label), doi: o.state.doi && o.state.doi.value};
            fact('f-td5', {v2json: v2 && {relationStatus: v2.relationStatus, vorDoi: v2.vorDoi, status: v2.status}, liveAfterCreate: pick(liveAfterCreate), v2open: pick(v2open), v2save: {status: v2save.status, url: v2save.reqs && v2save.reqs.map((r) => r.url)}, switched, v1viaMenu: pick(v1viaMenu), v1addr: pick(v1addr), v1page: v1page.notices, curPage: curPage.notices});
            // the reverse: a save made after switching versions in the side menu goes to which version? (Rule 1: "saves the relation of the version whose pages are open")
            await as(u('mg'));
            await gotoWf(E.submissionId, {pub: S.v2});
            const v1l = wf().getByRole('link', {name: /Version 1|1\.0/}).first();
            let rev = {};
            if (await v1l.count()) {
                await v1l.click(); await idle(page); await sleep(800);
                const o = await openRel('f-11-mgr-E-switch-to-v1-then-relations');
                await setStatus(UNKNOWN);
                const r = await relSave('f-12-mgr-E-switched-save-unknown');
                rev = {panelBefore: pick(o), saveUrl: r.reqs && r.reqs.map((x) => x.url), status: r.status, stored: r.saved};
                await gotoWf(E.submissionId, {pub: E.publicationId});
                rev.v1after = pick(await openRel('f-13-mgr-E-v1-after-switched-save'));
                await gotoWf(E.submissionId, {pub: S.v2});
                rev.v2after = pick(await openRel('f-14-mgr-E-v2-after-switched-save'));
            }
            fact('f-switched-save', {v1: E.publicationId, v2: S.v2, ...rev});
        }

        // ============================================================== switch (Rule 1: "Relations" follows the version chosen in the side menu)
        if (on('switch') && S.v2) {
            const {E} = S.s;
            const pick = (o) => o && o.state && {checked: (o.state.radios || []).filter((x) => x.checked).map((x) => x.label), doi: o.state.doi && o.state.doi.value};
            const labelOf = async (pid) => (lastPubs[pid] && lastPubs[pid].version) || null;
            const res = {};
            await as(u('mg'));
            // v1 and v2 names in the side menu
            await gotoWf(E.submissionId, {pub: S.v2});
            const items = await wf().getByRole('treeitem', {level: 1}).evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') || e.firstElementChild?.textContent || '').replace(/\s+/g, ' ').trim()));
            res.items = items;
            const verNames = items.filter((t) => !/^(Production|Create New Version)$/.test(t));
            // stored relations at this moment
            res.storedV1 = stored(E.publicationId); res.storedV2 = stored(S.v2);
            const openVersionPage = async (vname) => {
                const item = wf().getByRole('treeitem', {name: vname, exact: true}).first();
                const ta = item.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
                if (!(await ta.isVisible().catch(() => false))) { await item.getByRole('link', {name: vname, exact: true}).first().click(); await sleep(600); }
                await ta.click().catch(() => {});
                await idle(page); await sleep(900);
                return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), status: flat(await controlsLeft().innerText().catch(() => null))};
            };
            // from v2's page, switch to v1 through the side menu (no reload)
            res.toV1 = await openVersionPage(verNames[0]);
            res.relV1viaMenu = pick(await openRel('m-01-mgr-E-v2-then-menu-v1-relations'));
            await setStatus(NONE);
            const sv = await relSave('m-02-mgr-E-menu-v1-save-none');
            res.saveV1viaMenu = {url: sv.reqs && sv.reqs.map((x) => x.url), status: sv.status, stored: sv.saved};
            // back to v2 through the side menu
            if (await panel().isVisible().catch(() => false)) await relBtn().first().click();
            res.toV2 = await openVersionPage(verNames[verNames.length - 1]);
            res.relV2viaMenu = pick(await openRel('m-03-mgr-E-menu-back-v2-relations'));
            // reload reads
            await gotoWf(E.submissionId, {pub: E.publicationId});
            res.v1reload = pick(await openRel('m-04-mgr-E-v1-reload'));
            res.storedV1after = stored(E.publicationId);
            await gotoWf(E.submissionId, {pub: S.v2});
            res.v2reload = pick(await openRel('m-05-mgr-E-v2-reload'));
            res.storedV2after = stored(S.v2);
            // other direction: land on v1, switch to v2 through the menu
            await gotoWf(E.submissionId, {pub: E.publicationId});
            res.landV1 = pick(await openRel('m-06-mgr-E-land-v1'));
            await relBtn().first().click(); await sleep(300);
            res.toV2b = await openVersionPage(verNames[verNames.length - 1]);
            res.relV2viaMenu2 = pick(await openRel('m-07-mgr-E-v1-then-menu-v2-relations'));
            fact('m-switch', res);
        }

        // ============================================================== scheduled (A1: an Author on a scheduled version)
        if (on('scheduled')) {
            const G = process.env.SCHED === 'G' ? S.s.G : S.s.D;
            const tagG = process.env.SCHED === 'G' ? 'G' : 'D';
            await as(u('mg'));
            await gotoWf(G.submissionId, {pub: G.publicationId});
            const entry = wf().getByRole('treeitem', {level: 2}).getByRole('link', {name: 'Preprint entry', exact: true}).first();
            await entry.click().catch(() => {});
            const box = wf().getByRole('textbox', {name: 'Date Posted', exact: true}).first();
            await box.waitFor({state: 'visible', timeout: T}).catch(() => {});
            await idle(page); await sleep(500);
            const future = `${new Date().getFullYear() + 1}-01-15`;
            let dp = null;
            const found = await box.count();
            if (found) {
                await box.fill(future);
                const w = page.waitForResponse((r) => /\/publications\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
                const r = await w; dp = r ? r.status() : null;
                await sleep(800);
                await snap(`g-01-mgr-${tagG}-date-posted-future`, {found, dp});
            }
            const post = page.getByRole('button', {name: 'Post', exact: true}).first();
            let posted = null; let windowText = null;
            if (await post.count()) {
                await post.click();
                const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|All requirements|Schedule/});
                await confirm.first().waitFor({state: 'visible', timeout: T}).catch(() => {});
                await idle(page); await sleep(800);
                const sc = await snap(`g-02-mgr-${tagG}-post-window`);
                windowText = flat(sc.text.dialog, 600);
                const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await confirm.first().getByRole('button', {name: /^(Post|Schedule)/}).last().click().catch(() => {});
                const r = await w; posted = r ? r.status() : null;
                await idle(page); await sleep(1000);
            }
            await gotoWf(G.submissionId, {pub: G.publicationId});
            fact(`g-scheduled-${tagG}`, {found, future, dp, posted, windowText, controlsLeft: flat(await controlsLeft().innerText().catch(() => null)), stored: stored(G.publicationId)});
            await snap(`g-03-mgr-${tagG}-after-post`);
            await as(u('au'));
            await gateDrive(`g-au-scheduled-${tagG}`, G.submissionId, G.publicationId, {author: true, target: NONE});
            // control: the manager on the scheduled version
            await as(u('mg'));
            await gateDrive(`g-mgr-scheduled-${tagG}`, G.submissionId, G.publicationId, {target: PUBLISHED});
        }

        // ============================================================== wizard (td4; Rule 2)
        if (on('wizard')) {
            const {F, A} = S.s;
            // A seeded preprint's "Relations" (never answered): which choice is ticked?
            await as(u('mg'));
            await gotoWf(S.s.H.submissionId, {pub: S.s.H.publicationId});
            const h = await openRel('h-00-mgr-H-seeded-never-answered');
            fact('h-seeded-default', h.state && {checked: h.state.radios.filter((x) => x.checked).map((x) => x.label), radios: h.state.radios});
            await as(u('au'));
            await page.goto(app.url(`/index.php/${ctx}/submission?id=${F.submissionId}`)); await idle(page); await sleep(800);
            await snap('h-01-author-F-wizard-landing');
            const rail = await page.locator('nav button, .pkpSteps button, [role="tab"]').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
            // step to "For Readers" through Continue
            const reached = [];
            for (let i = 0; i < 6; i++) {
                const hd = flat(await page.locator('h2, h1').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 200);
                reached.push(hd);
                if (await page.locator('input[name="relationStatus"]').first().isVisible().catch(() => false)) break;
                const cont = page.getByRole('button', {name: 'Continue', exact: true}).first();
                if (!(await cont.count())) break;
                await cont.click().catch(() => {}); await idle(page); await sleep(900);
            }
            const fr = await page.locator('input[name="relationStatus"]').evaluateAll((els) => els.map((e) => ({label: ((e.closest('label') || e.parentElement).innerText || '').replace(/\s+/g, ' ').trim(), checked: e.checked, required: e.required}))).catch(() => []);
            const frSection = flat(await page.locator('fieldset, .pkpFormGroup').filter({has: page.locator('input[name="relationStatus"]')}).first().innerText().catch(() => null), 800);
            await snap('h-02-author-F-for-readers', {radios: fr, section: frSection});
            await loc(page, 'wizard "For Readers" relationStatus radios', page.locator('input[name="relationStatus"]'));
            // continue to Review without touching
            const cont = page.getByRole('button', {name: 'Continue', exact: true}).first();
            if (await cont.count()) { await cont.click().catch(() => {}); await idle(page); await sleep(1000); }
            const panelLine = async () => {
                const box = page.locator('.submissionWizard__reviewPanel, .pkpPanel, section').filter({hasText: 'Relation status'}).last();
                return flat(await box.innerText().catch(() => null), 600);
            };
            const rv1 = await panelLine();
            await snap('h-03-author-F-review-untouched', {relationPanel: rv1});
            // back to For Readers, tick "not published", back to Review
            const edit = page.locator('.submissionWizard__reviewPanel, .pkpPanel, section').filter({hasText: 'Relation status'}).last().getByRole('button', {name: 'Edit'}).first();
            let editWorked = null;
            if (await edit.count()) {
                await edit.click(); await idle(page); await sleep(800);
                editWorked = await page.locator('input[name="relationStatus"]').first().isVisible().catch(() => false);
            }
            await page.getByRole('radio', {name: NONE, exact: true}).first().check().catch(() => {});
            await sleep(400);
            const cont2 = page.getByRole('button', {name: 'Continue', exact: true}).first();
            if (await cont2.count()) { await cont2.click().catch(() => {}); await idle(page); await sleep(1000); }
            const rv2 = await panelLine();
            await snap('h-04-author-F-review-after-none', {relationPanel: rv2});
            // reload: does the wizard keep the choice? (the step saves itself)
            await page.reload(); await idle(page); await sleep(1000);
            const rv3 = await panelLine();
            await snap('h-05-author-F-review-after-reload', {relationPanel: rv3});
            fact('h-td4', {rail, reached, forReaders: fr, section: frSection, reviewUntouched: rv1, editWorked, reviewAfterNone: rv2, reviewAfterReload: rv3});
        }

        // ============================================================== wizard2 (td4, Rule 2 on a submission started on screen)
        if (on('wizard2')) {
            const W = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
            await as(u('au'));
            await page.goto(app.url(W.startUrl(ctx))); await idle(page);
            await W.beginSubmission(page, {title: `K1 W ${ctx}`});
            const wid = Number(new URL(page.url()).searchParams.get('id'));
            S.W = wid; saveState();
            await snap('n-01-author-W-new-draft');
            await W.continueTo(page, W.STEPS.details);
            await W.continueTo(page, W.STEPS.contributors);
            await W.continueTo(page, W.STEPS.readers);
            const radios = () => page.locator('input[name="relationStatus"]').evaluateAll((els) => els.map((e) => ({label: ((e.closest('label') || e.parentElement).innerText || '').replace(/\s+/g, ' ').trim(), checked: e.checked})));
            const r0 = await radios();
            const grp = page.locator('fieldset').filter({has: page.locator('input[name="relationStatus"]')}).first();
            const grpText = flat(await grp.innerText().catch(() => null));
            await snap('n-02-author-W-for-readers', {radios: r0, grpText});
            await W.openReview(page);
            const line1 = flat(await W.reviewPanel(page, 'Relation status').innerText().catch(() => null));
            const problems1 = flat(await W.problemsBanner(page).innerText().catch(() => null));
            const submitEnabled1 = await W.footer(page).getByRole('button', {name: 'Submit', exact: true}).isEnabled().catch(() => null);
            await snap('n-03-author-W-review-untouched', {line1, problems1, submitEnabled1});
            // the panel's Edit
            await W.reviewPanel(page, 'Relation status').getByRole('button', {name: /Edit/}).first().click().catch(() => {});
            await idle(page); await sleep(800);
            const current = flat(await W.currentRailStep(page).innerText().catch(() => null));
            const r1 = await radios();
            await W.setRelationStatus(page, NONE);
            await sleep(300);
            await W.openReview(page);
            const line2 = flat(await W.reviewPanel(page, 'Relation status').innerText().catch(() => null));
            await snap('n-04-author-W-review-after-none', {line2});
            await page.reload(); await idle(page); await sleep(1200);
            const line3 = flat(await W.reviewPanel(page, 'Relation status').innerText().catch(() => null));
            await snap('n-05-author-W-review-reloaded', {line3, step: flat(await W.currentRailStep(page).innerText().catch(() => null))});
            fact('n-wizard2', {wid, forReaders: r0, grpText, reviewUntouched: line1, problems1, submitEnabled1, editLandsOn: current, radiosAfterEdit: r1, reviewAfterNone: line2, reviewAfterReload: line3});
        }

        // ============================================================== wizard3 (Rule 2 / Fields "Required": the Review step's Edit, and a submit with no answer)
        if (on('wizard3') && S.W) {
            const W = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
            const out = {};
            await as(u('au'));
            await page.goto(app.url(W.wizardUrl(ctx, S.W))); await idle(page);
            await W.expectWizardOpen(page).catch(() => {});
            out.landsOn = flat(await W.currentRailStep(page).innerText().catch(() => null));
            const toReview = async (viaRail) => {
                const btn = viaRail ? page.locator('.pkpSteps__buttons button.pkpSteps__step__label').filter({hasText: /Review$/}).first() : W.footer(page).getByRole('button', {name: 'Continue', exact: true});
                for (let i = 0; i < 3; i++) {
                    await btn.click().catch(() => {});
                    const ok = await page.locator('.submissionWizard__reviewPanel').first().waitFor({state: 'visible', timeout: 8000}).then(() => true).catch(() => false);
                    if (ok) break;
                }
                await page.locator('.submissionWizard__loadingReview').first().waitFor({state: 'detached', timeout: 20_000}).catch(() => {});
                await idle(page); await sleep(600);
            };
            await toReview(true);
            out.line0 = flat(await W.reviewPanel(page, 'Relation status').innerText().catch(() => null));
            // the panel's Edit
            const edit = W.reviewPanel(page, 'Relation status').getByRole('button').first();
            out.editName = flat(await edit.innerText().catch(() => null));
            await edit.click().catch(() => {});
            await idle(page); await sleep(1200);
            out.editLandsOn = flat(await W.currentRailStep(page).innerText().catch(() => null));
            out.radiosVisible = await page.locator('input[name="relationStatus"]').count();
            await snap('o-01-author-W-after-review-edit', {out});
            // make everything else valid, leave Relation status unanswered
            await W.gotoStep(page, W.STEPS.files).catch(() => {});
            await W.addGalleyFile(page).catch((e) => { out.galleyErr = String(e.message).slice(0, 200); });
            await W.continueTo(page, W.STEPS.details).catch(() => {});
            await W.fillRichText(page, 'titleAbstract-abstract-control-en', 'An abstract typed by K1.').catch((e) => { out.abstractErr = String(e.message).slice(0, 200); });
            await W.continueTo(page, W.STEPS.contributors).catch(() => {});
            await W.continueTo(page, W.STEPS.readers).catch(() => {});
            out.readersRadios = await page.locator('input[name="relationStatus"]').evaluateAll((els) => els.map((e) => e.checked)).catch(() => []);
            await toReview(false);
            const sc = await snap('o-02-author-W-review-all-but-relation');
            out.problems = flat(await W.problemsBanner(page).innerText().catch(() => null));
            out.reviewText = flat(sc.text.main, 1500);
            out.line1 = flat(await W.reviewPanel(page, 'Relation status').innerText().catch(() => null));
            const submit = W.footer(page).getByRole('button', {name: 'Submit', exact: true});
            out.submitEnabled = await submit.isEnabled().catch(() => null);
            if (out.submitEnabled) {
                const dlg = page.getByRole('dialog').filter({hasText: 'Are you sure you want to submit'});
                await submit.click();
                await dlg.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
                const w = page.waitForResponse((r) => /\/submit$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await dlg.getByRole('button', {name: 'Submit', exact: true}).click().catch(() => {});
                const r = await w;
                out.submitStatus = r ? r.status() : null;
                out.submitBody = r ? flat(await r.text().catch(() => null), 400) : null;
                await idle(page); await sleep(1500);
                const sc2 = await snap('o-03-author-W-after-submit-unanswered');
                out.after = flat(sc2.text.main, 600);
            }
            // if it went through: the manager's "Relations" on it
            await as(u('mg'));
            await gotoWf(S.W);
            const pubId = Object.keys(lastPubs).map(Number).filter((id) => lastPubs[id]).pop();
            out.storedW = Object.fromEntries(Object.entries(lastPubs).filter(([k]) => Number(k) >= 23).map(([k, v]) => [k, v]));
            await wf().getByRole('treeitem', {level: 2}).getByRole('link', {name: 'Title & Abstract', exact: true}).first().click().catch(() => {});
            await idle(page); await sleep(800);
            const o = await openRel('o-04-mgr-W-relations');
            out.mgrRelations = o.state && {checked: (o.state.radios || []).filter((x) => x.checked).map((x) => x.label)};
            fact('o-wizard3', out);
        }

        // ============================================================== setting (td9; Settings bullet 1)
        if (on('setting')) {
            const {J} = S;
            await as(`${ctx2}mg`, ctx2);
            fact('i-roles-author-default', await readRoleBox(page, app, ctx2, 'Author', 'i-01-mgr-T-roles-author-default'));
            fact('i-roles-moderator-default', await readRoleBox(page, app, ctx2, 'Moderator', 'i-02-mgr-T-roles-moderator-default'));
            fact('i-untick-author', await readRoleBox(page, app, ctx2, 'Author', 'i-03-mgr-T-roles-author-untick', false));
            await as(`${ctx2}au`, ctx2);
            await gateDrive('i-au3-author-role-unticked-J', J.submissionId, J.publicationId, {author: true, c: ctx2, target: NONE});
            // control: tick again
            await as(`${ctx2}mg`, ctx2);
            fact('i-retick-author', await readRoleBox(page, app, ctx2, 'Author', 'i-04-mgr-T-roles-author-retick', true));
            await as(`${ctx2}au`, ctx2);
            await gateDrive('i-au3-author-role-reticked-J', J.submissionId, J.publicationId, {author: true, c: ctx2, target: NONE});
            // Moderator role
            await as(`${ctx2}mg`, ctx2);
            fact('i-untick-moderator', await readRoleBox(page, app, ctx2, 'Moderator', 'i-05-mgr-T-roles-moderator-untick', false));
            await as(`${ctx2}mo`, ctx2);
            await gateDrive('i-mo3-moderator-role-unticked-J', J.submissionId, J.publicationId, {c: ctx2, target: PUBLISHED});
            await as(`${ctx2}mg`, ctx2);
            fact('i-retick-moderator', await readRoleBox(page, app, ctx2, 'Moderator', 'i-06-mgr-T-roles-moderator-retick', true));
            await as(`${ctx2}mo`, ctx2);
            await gateDrive('i-mo3-moderator-role-reticked-J', J.submissionId, J.publicationId, {c: ctx2, target: PUBLISHED});
        }

        // ============================================================== preview (td1's control: the notice in the manager's "Preview" of an unposted version saved "published elsewhere")
        if (on('preview')) {
            const {J} = S;
            await as(`${ctx2}mg`, ctx2);
            await gotoWf(J.submissionId, {pub: J.publicationId, c: ctx2});
            const st = stored(J.publicationId);
            fact('p-preview-J', {stored: st, preview: await preview('p-01-mgr-T-J-preview')});
        }

        // ============================================================== reach (Actors "Open Relations": who reaches the pages)
        if (on('reach')) {
            const {A} = S.s;
            const r = {};
            for (const [k, dash] of [['mu', 'editorial'], ['eb', 'editorial'], ['rd', 'editorial'], ['ab', 'mySubmissions'], ['rd', 'mySubmissions']]) {
                await as(u(k));
                const http = await gotoWf(A.submissionId, {author: dash === 'mySubmissions', pub: A.publicationId});
                const sc = await snap(`j-${k}-${dash}-A-typed-address`);
                r[`${k}-${dash}`] = {http, url: sc.url.replace(/^https?:\/\/[^/]+/, ''), relations: await relBtn().count(), dialog: flat(sc.text.dialog, 300), main: flat(sc.text.main, 300)};
            }
            // unassigned Moderator's dashboard: does the preprint show?
            fact('j-reach', r);
        }

        // ============================================================== leave (the tab/page left with an unsaved change)
        if (on('leave')) {
            const {A} = S.s;
            await as(u('mg'));
            await gotoWf(A.submissionId, {pub: A.publicationId});
            const o = await openRel('k-01-mgr-A-open');
            const saved = o.state && o.state.radios.filter((x) => x.checked).map((x) => x.label);
            const pick = [PUBLISHED, NONE, UNKNOWN].find((l) => !(saved || []).includes(l));
            await setStatus(pick);
            if (pick === PUBLISHED) await setDoi('https://doi.org/10.9999/unsaved');
            const dialogs = [];
            const h = (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
            page.on('dialog', h);
            // close the panel by pressing the button again, reopen
            await relBtn().first().click(); await sleep(500);
            const closedReopen = await openRel('k-02-mgr-A-reopened-after-close');
            // move to another page of the same version, reopen
            const contrib = wf().getByRole('link', {name: 'Contributors', exact: true}).first();
            await contrib.click().catch(() => {}); await idle(page); await sleep(800);
            const otherPage = await openRel('k-03-mgr-A-contributors-relations');
            const appDlg = await page.locator('[data-cy="dialog"]:visible').allInnerTexts().catch(() => []);
            // leave the workflow by address
            await page.goto(app.url(`/index.php/${ctx}/dashboard/editorial`)).catch(() => {}); await idle(page);
            await gotoWf(A.submissionId, {pub: A.publicationId});
            const back = await openRel('k-04-mgr-A-relations-after-leaving');
            page.off('dialog', h);
            const pk = (x) => x && x.state && {checked: (x.state.radios || []).filter((y) => y.checked).map((y) => y.label), doi: x.state.doi && x.state.doi.value};
            fact('k-leave', {saved, picked: pick, closedReopen: pk(closedReopen), otherPage: pk(otherPage), appDialogs: appDlg, browserDialogs: dialogs, afterLeaving: pk(back)});
        }

        // ============================================================== notes: what later agents on these screens need
        if (on('notes')) {
            note('ccK1 [ops] Workflow › any page of a version: "Relations" is `[data-cy="workflow-controls-left"]` getByRole("button", {name: /^Relations/}); the panel is `.pkpWorkflow__publicationRelation .pkpDropdown__content` (radios `input[name="relationStatus"]` values 0/1/3, box `input[name="vorDoi"]` only in the DOM while value 3 is ticked, Save = panel getByRole("button", {name: "Save", exact: true})). The save is POST …/publications/{id} with X-Http-Method-Override PUT.');
            note('ccK1 [ops] premise: a preprint seeded through scenarios/submission, and one submitted through the wizard with "Relation status" left unanswered, stores relationStatus null (not 0): "Relations" then shows NO choice ticked and the wizard Review reads "This preprint has not been published elsewhere.". "This preprint\'s relations have not been entered." is only reached by saving it on screen.');
            note('ccK1 [ops] a refused relation save answers 401 {errorMessage: "You are not allowed to edit this publication."} but the page shows only the toast "An unexpected error has occurred. Please reload the page and try again." (Form.vue shows errorMessage for 403/404 only). Catch toasts with a MutationObserver: they live ~5 s.');
            note('ccK1 [ops] side menu: a version\'s tree item link ("Author Original 1.0") only expands the version; open its "Title & Abstract" inside that treeitem to switch versions. The header also carries a "##common.help##" link (missing locale key).');
            note('ccK1 [ops] "Preview" in the workflow header opens the preprint page in the SAME tab (no popup); a signed-out visitor gets 404 on an unposted preprint\'s page.');
            note('ccK1 [ops] Preprint entry page: "Date Posted" textbox (getByRole textbox exact) saved with a future date, then "Post" makes the version "Status: Scheduled" (publication status 5).');
            note('ccK1 [ops] leaving: an unsaved choice in "Relations" survives closing the panel and moving to another page of the version (it reopens showing the unsaved choice), and is dropped without any question when the workflow is left.');
        }
    } finally {
        await close();
    }

    // ------------------------------------------------------------------ helpers needing page closures
    async function editAssignment(displayName, want, name) {
        const more = page.getByRole('button', {name: `${displayName} More Actions`}).first();
        await more.waitFor({state: 'visible', timeout: T});
        await more.click();
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).first().click();
        const modal = page.locator('[data-cy="active-modal"]').filter({hasText: 'Edit Assignment'}).last();
        const box = modal.locator('input[name="canChangeMetadata"]');
        await box.waitFor({state: 'visible', timeout: T});
        const before = await box.isChecked();
        const labelText = flat(await modal.locator(`label[for="${await box.getAttribute('id')}"]`).innerText().catch(() => null) || await modal.locator('label').filter({has: box}).innerText().catch(() => null));
        await snap(name, {editAssignment: {displayName, before, labelText}});
        if (want !== before) { if (want) await box.check(); else await box.uncheck(); }
        await modal.getByRole('button', {name: 'OK', exact: true}).click();
        await box.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page); await sleep(500);
        return {displayName, before, set: want, labelText};
    }
});

// Roles › <role> › Edit: read (and optionally set) "Permit submission metadata edit."; returns the box's state and the window's text.
async function readRoleBox(page, app, ctx, roleName, name, want) {
    await page.goto(app.url(`/index.php/${ctx}/management/settings/access`));
    await idle(page);
    const rolesTab = page.getByRole('tab', {name: 'Roles', exact: true}).or(page.locator('#roles-button')).first();
    if (await rolesTab.count()) await rolesTab.click();
    await idle(page);
    const cellRe = new RegExp(`^\\s*(Settings\\s+)?${roleName}\\s*$`, 'i');
    const row = page.locator('tr.gridRow').filter({has: page.locator('td').filter({hasText: cellRe})}).first();
    if (!(await row.count())) { record(name, await screen(page)); return {row: 'absent'}; }
    await row.locator('a.show_extras').click();
    await idle(page);
    await page.getByRole('link', {name: 'Edit', exact: true}).last().click();
    const form = page.locator('form#userGroupForm');
    await form.waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
    const box = form.locator('input[name="permitMetadataEdit"]');
    await box.waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    const found = await box.count();
    const before = found ? await box.isChecked() : null;
    const label = found ? await page.locator(`label[for="${await box.getAttribute('id')}"]`).innerText().catch(() => null) : null;
    const sc = await screen(page);
    sc.roleBox = {roleName, before, label};
    record(name, sc);
    await shot(page, name).catch(() => {});
    let saved = null;
    if (typeof want === 'boolean' && found) {
        if (want !== before) { if (want) await box.check(); else await box.uncheck(); }
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /userGroup|updateUserGroup|role/i.test(r.url()), {timeout: 30_000}).catch(() => null);
        await form.getByRole('button', {name: /^(OK|Save)$/}).first().click();
        const r = await w; saved = r ? r.status() : null;
        await box.waitFor({state: 'detached', timeout: 15_000}).catch(() => {});
        await idle(page);
    } else {
        const cancel = form.getByRole('link', {name: 'Cancel', exact: true}).or(form.getByRole('button', {name: 'Cancel', exact: true})).first();
        await cancel.click().catch(() => {});
        await box.waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
    }
    return {roleName, before, label, set: typeof want === 'boolean' ? want : null, saved};
}
