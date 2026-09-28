// U74 "ONIX metadata & export" claim check, chunk K1: framing and who may do what.
// Spec: docs/specs/U74-onix-metadata-export.md — Purpose with the OJS/OPS absence paragraph (12–37),
// Actors & permissions (41–59), the Fields intro on the code lists (63–66), Settings bullet 1 (385–393),
// Cross-feature interactions (397–421), the Canonical preamble (425–428), Coverage, register A2 (507–517);
// footnotes a, b, c, d, i, l, s, td1–td5, td18, f-a2.
//
// Run: RUN=r1 PROBE_FEATURE=U74 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U74/K1/k1.js
//      RUN=r2 …  (a second, independent run: its own scratch presses, its own facts file k1-<RUN>-facts-<app>.json)
//      PHASES=seed,purpose,lists,roles,audience,reps,formats,fmtlists,extra,assign,tools,settings (OMP) · control (OJS, OPS). Default: all.
//      Later phases read k1-state-<RUN>-<app>.json; FRESH=1 seeds anew. A full OMP run outlasts the Bash cap:
//      launch it detached (nohup … &).
//
// Scratch contexts per run (tag u74k1…), OMP:
//   P1  a press with its four ONIX details and one account per role: mg (Press manager), ed (Press editor),
//       pe (Production editor), se/se2 (Series editor), ce, le/le2, de, ix, pr, mk/mk2, fu (the assistant roles),
//       au (author, submits every book), rd (reader); `admin` is enrolled by the test API. Books:
//         A    published: "Paperback" (sales rights, market) + "Ebook", an audience, an agent and a supplier;
//              se, le, mk assigned
//         BP   Production, "Paperback"; se and all seven assistant roles assigned (le2, se2, mk2 are not)
//         BS   Submission stage; mk, se, le assigned            BC  Copyediting; le, mk, ce assigned
//         BM/BE/BPE/BAD  Production, one per manager-level save of "Audience" (mg, ed, pe, admin)
//         BS0/BS1  Production, se assigned with "Permit submission metadata edit." off / on
//   PN  a press with none of the four ONIX details (td18), one book at Production with "Paperback"
//   PT  a press with three of the four (no "Publisher Code Type"), one book at Production with "Paperback"
// OJS, OPS: publicknowledge read as manager.maya (the Tools list, the ONIX tool's address typed), plus a scratch
//   journal / server with one galley (the side menu, the galley window, the "Marketing" addresses typed).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'purpose', 'lists', 'roles', 'audience', 'reps', 'formats', 'fmtlists', 'extra', 'assign', 'tools', 'settings', 'control'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k1]', RUN, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const VIS = '[role="dialog"]:visible';
const SR = 'salesRightsGridContainer';
const MK = 'marketsGridContainer';
const SRFORM = 'form#addSalesRightsForm';
const MKFORM = 'form#marketForm';
const ONIX = 'Onix30ExportPlugin';
const NATIVE = 'NativeImportExportPlugin';
const MISSING = /missing some required information/i;
// the assistant roles, as the spec names them, and the scenario role keys
const ASSIST = [['ce', 'copyeditor', 'Copyeditor'], ['le', 'layoutEditor', 'Layout Editor'], ['de', 'designer', 'Designer'],
    ['ix', 'indexer', 'Indexer'], ['pr', 'proofreader', 'Proofreader'], ['mk', 'marketing', 'Marketing and sales coordinator'],
    ['fu', 'funding', 'Funding coordinator']];
const MANAGERS = [['mg', 'manager', 'Press manager'], ['ed', 'editor', 'Press editor'], ['pe', 'productionEditor', 'Production editor']];

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const sf = path.join(outDir(), `k1-state-${RUN}-${app.name}.json`);
    let S = (!process.env.FRESH && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k1-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const sql = (q) => { try { return execFileSync('psql', ['-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `SQL ERROR ${String(e.stderr).trim()}`; } };

    const {page, close} = await launch(app);
    // browser dialogs: every one accepted and kept with a time
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    const dlgSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
    // page notices as they appear
    const notices = [];
    await page.exposeFunction('__k1Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                seen.add(e);
                window.__k1Notice(t);
            });
        }).observe(document, {childList: true, subtree: true});
    });
    const noticesSince = (t0) => notices.filter((n) => n.at >= t0).map((n) => n.text);
    // non-GET answers and every error answer
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        if (m === 'GET' && r.status() < 400) return;
        const u = r.url();
        if (/\.(js|css|png|svg|woff2?)(\?|$)/.test(u)) return;
        let body = '';
        try { body = (await r.text()).slice(0, 600); } catch { /* ignore */ }
        posts.push({at: Date.now(), method: m, override: r.request().headers()['x-http-method-override'] || null, status: r.status(), url: u.replace(/^.*\/index\.php/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 180), body: flat(body, 300)});
    });
    const since = (t0) => posts.filter((p) => p.at >= t0).map(({at, ...p}) => `${p.method}${p.override ? `(${p.override})` : ''} ${p.status} ${p.url}${p.status >= 400 ? ` BODY ${p.body}` : ''}`);

    const pfx = (n) => `${RUN}-${n}`;
    async function snap(name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(s, extra);
        record(pfx(name), s);
        await shot(page, pfx(name)).catch(() => {});
        s.file = `${pfx(name)}-${app.name}.json`;
        return s;
    }
    const safe = async (label, fn) => {
        try { return await fn(); } catch (e) {
            const err = String(e.message || e).split('\n')[0].slice(0, 300);
            log(`[${app.name} ${label}] ERROR`, err);
            await snap(`err-${label.replace(/[^a-z0-9-]/gi, '-')}`).catch(() => {});
            return {error: err};
        }
    };
    const rel = (u) => String(u).replace(/^https?:\/\/[^/]+/, '');
    const top = () => page.locator(VIS).last();
    const dialogCount = () => page.locator(VIS).count();
    const waitTop = (sel, n) => page.waitForFunction(({sel, n}) => {
        const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length);
        return d.length >= n && d[d.length - 1].querySelector(sel);
    }, {sel, n}, {timeout: T});
    const waitCount = (n) => page.waitForFunction((n) => [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length <= n, n, {timeout: 12_000}).then(() => true).catch(() => false);
    let who = null;
    const as = async (u, ctx) => {
        if (who === `${u}@${ctx}`) return;
        await signIn(page, u, {contextPath: ctx}); await idle(page).catch(() => {}); who = `${u}@${ctx}`;
    };
    const cu = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const edUrl = (ctx, sid, key) => cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    const auUrl = (ctx, sid, key) => cu(ctx, `/dashboard/mySubmissions?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);

    // ------------------------------------------------------------ the workflow panel
    const wfDialog = () => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
    const errDialog = () => page.getByRole('dialog', {name: 'Error', exact: true});
    const heading = async () => flat(await wfDialog().locator('.pkp-modal-scroll-container h2').first().textContent({timeout: 3000}).catch(() => null));
    const primary = () => wfDialog().locator('[data-cy="workflow-primary-items"]');
    const menuEntries = () => page.locator('[data-cy="sidemodal-header"]').count().then((n) => (n ? wfDialog().getByRole('navigation').getByRole('link').evaluateAll((anchors) => anchors.map((a) => {
        const cls = a.className;
        let level = 1;
        if (/!px-(7|9)\b/.test(cls)) level = 2;
        if (/!px-(10|12)\b/.test(cls)) level = 3;
        if (/!px-(14|16)\b/.test(cls)) level = 4;
        return `${'  '.repeat(level - 1)}${(a.textContent || '').trim()}${a.getClientRects().length ? '' : ' [hidden]'}`;
    })).catch(() => []) : []));
    const marketingGroup = (entries) => {
        const i = entries.findIndex((e) => e.trim() === 'Marketing' && !e.startsWith(' '));
        if (i < 0) return null;
        const out = [];
        for (const e of entries.slice(i + 1)) { if (!e.startsWith(' ')) break; out.push(e.trim()); }
        return out;
    };
    /** Open a workflow address; wait for the panel, the "Error" window or the access-denied page. */
    async function openWf(url, wait) {
        const t0 = Date.now();
        const r = await page.goto(url).catch((e) => ({status: () => `goto error ${String(e.message).slice(0, 80)}`}));
        await Promise.any([
            page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 20_000}),
            errDialog().waitFor({timeout: 20_000}),
            page.waitForURL(/authorizationDenied|\/login/, {timeout: 20_000}),
        ]).catch(() => {});
        if (wait === 'audience') await primary().locator('select').first().waitFor({timeout: 15_000}).catch(() => {});
        if (wait === 'reps') await page.locator('div[id^="component-grid-catalogentry-representativesgrid"] table').first().waitFor({timeout: 15_000}).catch(() => {});
        if (wait === 'dates') await primary().locator('input[type=radio]').first().waitFor({timeout: 15_000}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(500);
        const err = (await errDialog().count()) ? flat(await errDialog().innerText().catch(() => null), 300) : null;
        return {status: r ? r.status() : null, url: rel(page.url()), panel: await page.locator('[data-cy="sidemodal-header"]').count(), errorWindow: err,
            heading: await heading(), primaryText: flat(await primary().innerText({timeout: 2000}).catch(() => null), 600), bad: since(t0).filter((x) => / [45]\d\d /.test(x))};
    }
    const audState = () => primary().evaluate((root) => {
        const sels = [...root.querySelectorAll('select')].map((s) => {
            const lab = s.id ? root.querySelector(`label[for="${s.id}"]`) : null;
            return {label: lab ? lab.innerText.replace(/\s+/g, ' ').trim() : s.name, value: s.value, text: s.selectedIndex >= 0 ? s.options[s.selectedIndex].text.trim() : null, disabled: s.disabled};
        });
        const b = [...root.querySelectorAll('button')].filter((x) => x.innerText.trim() === 'Save')[0];
        return {selects: sels, save: b ? {visible: !!b.getClientRects().length, disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'} : null,
            status: [...root.querySelectorAll('.pkpFormPage__status, [role=status]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)};
    }).catch((e) => ({error: flat(e.message, 200)}));
    const chooseAud = async (label, option) => {
        const id = await primary().locator('label').filter({hasText: new RegExp(`^\\s*${label.replace(/[()]/g, '\\$&')}\\s*\\*?\\s*$`)}).first().getAttribute('for');
        await page.locator(`[id="${id}"]`).selectOption({label: option});
    };
    /** Press the form's "Save" (Audience or Publication Dates) and read what answers. */
    async function pressSave() {
        const t0 = Date.now();
        const resp = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await primary().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await primary().locator('.pkpFormPage__status').filter({hasText: /Saved|rror/}).first().waitFor({timeout: 8000}).catch(() => {});
        await sleep(1200);
        const status = await primary().locator('.pkpFormPage__status, [role="status"]').allInnerTexts().then((a) => a.map((x) => flat(x)).filter(Boolean)).catch(() => []);
        const err = (await errDialog().count()) ? flat(await errDialog().innerText().catch(() => null), 300) : null;
        return {answer: r ? r.status() : 'no request', statusByButton: status, errorWindow: err, notices: noticesSince(t0), dialogs: dlgSince(t0), posts: since(t0)};
    }
    const audDb = (sid) => sql(`select setting_name||'='||coalesce(setting_value,'<null>') from submission_settings where submission_id=${sid} and setting_name like 'audience%' order by 1`).split('\n').filter(Boolean);

    // ------------------------------------------------------------ the Representatives page
    const repGrid = () => page.locator('div[id^="component-grid-catalogentry-representativesgrid"]').first();
    const repRows = () => repGrid().evaluate((g) => {
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const out = [];
        let group = null;
        for (const tb of [...g.querySelectorAll('table tbody')].filter(vis)) {
            for (const tr of [...tb.querySelectorAll('tr')].filter(vis)) {
                if (/control-row/.test(tr.id) || /row_controls/.test(tr.className)) continue;
                const copy = tr.cloneNode(true);
                copy.querySelectorAll('script, .pkp_screen_reader').forEach((n) => n.remove());
                const cells = [...copy.querySelectorAll(':scope > td, :scope > th')].map((c) => c.innerText.replace(/\s+/g, ' ').trim());
                if (/empty/.test(tb.className)) { out.push(`${group}: ${cells.join(' ')}`); continue; }
                if (cells.length >= 2 && cells[1] === '' && /^(Agents|Suppliers)$/.test(cells[0])) { group = cells[0]; continue; }
                out.push(`${group}: ${cells.join(' | ')}`);
            }
        }
        const header = g.querySelector('.header');
        return {heading: header && header.querySelector('h4, h3') ? header.querySelector('h4, h3').innerText.trim() : null,
            headerLinks: header ? [...header.querySelectorAll('a')].filter(vis).map((a) => a.innerText.trim()) : [], rows: out};
    }).catch((e) => ({error: flat(e.message, 200)}));
    const repForm = () => page.locator('form#representativeForm:visible');
    async function repOK() {
        const t0 = Date.now();
        await repForm().getByRole('button', {name: 'OK', exact: true}).click();
        const closed = await page.locator('form#representativeForm').waitFor({state: 'hidden', timeout: 10_000}).then(() => true).catch(() => false);
        await idle(page).catch(() => {}); await sleep(900);
        const o = {closed, notices: noticesSince(t0), dialogs: dlgSince(t0), posts: since(t0)};
        if (!closed) {
            o.windowErrors = await repForm().locator('label.error, .error, .pkp_form_error').allInnerTexts().then((a) => a.map((x) => flat(x)).filter(Boolean)).catch(() => []);
            await repForm().locator('a, button').filter({hasText: /^\s*Cancel\s*$/}).first().click().catch(() => {});
            await sleep(900);
        }
        return o;
    }
    async function repEntry(name, label) {
        const row = repGrid().locator('tr.gridRow').filter({hasText: name}).first();
        const id = await row.getAttribute('id', {timeout: 10_000});
        const controls = page.locator(`[id="${id}-control-row"]`);
        if (!(await controls.isVisible())) await row.locator('a.show_extras').click();
        await controls.waitFor({timeout: T});
        const entries = (await controls.locator('a:visible').allInnerTexts()).map((x) => flat(x));
        await controls.locator('a:visible').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).click();
        return entries;
    }
    /** td4: add "name" as a Supplier, "Wholesaler to retailers (04)"; then Edit › OK and Delete › OK. */
    async function repCycle(sid, name, {edit = true, del = true, snapKey}) {
        const o = {};
        const d = sql(`select count(*) from representatives where submission_id=${sid}`);
        o.dbBefore = d;
        const t0 = Date.now();
        await repGrid().locator('.header a').filter({hasText: /^\s*Add Representative\s*$/}).first().click();
        await repForm().locator('input[name="name"]').waitFor({timeout: T});
        await idle(page).catch(() => {});
        o.windowTitle = flat(await top().locator('h1, h2').first().innerText().catch(() => null));
        o.windowOpenPosts = since(t0).filter((x) => / [45]\d\d /.test(x));
        await repForm().locator('input[name="isSupplier"][value="0"]').check(); await sleep(200);
        await repForm().locator('input[name="isSupplier"][value="1"]').check(); await sleep(200);
        await repForm().locator('select[name="supplierRole"]').selectOption({label: 'Wholesaler to retailers (04)'});
        await repForm().locator('input[name="name"]').fill(name);
        o.add = await repOK();
        const sa = await snap(`${snapKey}-added`);
        o.add.snap = sa.file;
        o.rowsAfterAdd = (await repRows()).rows;
        o.dbAfterAdd = sql(`select count(*) from representatives where submission_id=${sid} and name='${name}'`);
        if (edit && o.rowsAfterAdd && o.rowsAfterAdd.some((r) => r.includes(name))) {
            const t1 = Date.now();
            o.rowEntries = await repEntry(name, 'Edit');
            await repForm().locator('input[name="name"]').waitFor({timeout: T});
            await idle(page).catch(() => {}); await sleep(300);
            o.editTitle = flat(await top().locator('h1, h2').first().innerText().catch(() => null));
            o.editOpenPosts = since(t1).filter((x) => / [45]\d\d /.test(x));
            // the supplier's Edit carries the same Agent-list trap (screen notes): click Agent then Supplier
            await repForm().locator('input[name="isSupplier"][value="0"]').check().catch(() => {}); await sleep(200);
            await repForm().locator('input[name="isSupplier"][value="1"]').check().catch(() => {}); await sleep(200);
            await repForm().locator('select[name="supplierRole"]').selectOption({label: 'Wholesaler to retailers (04)'}).catch(() => {});
            o.edit = await repOK();
            o.rowsAfterEdit = (await repRows()).rows;
        }
        if (del && o.rowsAfterAdd && o.rowsAfterAdd.some((r) => r.includes(name))) {
            const t2 = Date.now();
            await repEntry(name, 'Delete');
            const cd = page.getByRole('dialog', {name: 'Delete', exact: true});
            await cd.waitFor({timeout: 15_000}).catch(() => {});
            o.deleteQuestion = flat(await cd.innerText().catch(() => null), 300);
            await cd.getByRole('button', {name: 'OK', exact: true}).click();
            const gone = await cd.waitFor({state: 'detached', timeout: 10_000}).then(() => true).catch(() => false);
            await idle(page).catch(() => {}); await sleep(1200);
            if (!gone) { await cd.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {}); await sleep(800); }
            const sd = await snap(`${snapKey}-deleted`);
            o.del = {confirmClosed: gone, notices: noticesSince(t2), dialogs: dlgSince(t2), posts: since(t2), snap: sd.file};
            o.rowsAfterDelete = (await repRows()).rows;
            o.dbAfterDelete = sql(`select count(*) from representatives where submission_id=${sid} and name='${name}'`);
        }
        return o;
    }

    // ------------------------------------------------------------ the format window and its "Metadata" tab
    const wfTop = () => page.locator(VIS).first();
    const fmtUrl = (ctx, id, pub) => edUrl(ctx, id, `publication_${pub}_publicationFormats`);
    async function openFormats(ctx, id, pub) {
        const r = await openWf(fmtUrl(ctx, id, pub));
        await Promise.any([wfTop().locator('tr.gridRow').first().waitFor({timeout: 15_000}), page.getByText(/don't currently have access/).first().waitFor({timeout: 15_000})]).catch(() => {});
        await idle(page).catch(() => {}); await sleep(300);
        return r;
    }
    const fmtRow = (n) => wfTop().locator('tr.gridRow').filter({has: page.locator('span.label', {has: page.locator('.onix_code'), hasText: new RegExp(`^\\s*${n}`)})}).first();
    async function openEdit(n) {
        const r = fmtRow(n);
        await r.waitFor({timeout: 15_000});
        const id = await r.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const edit = ctl.getByRole('link', {name: 'Edit', exact: true}).first();
        if (!(await edit.isVisible().catch(() => false))) { await r.locator('a.show_extras').first().click(); await edit.waitFor({state: 'visible', timeout: 10_000}); }
        const n0 = await dialogCount();
        await edit.click();
        await waitTop('[role=tab]', n0 + 1);
        await idle(page).catch(() => {}); await sleep(400);
        return (await top().locator('[role=tab]').allInnerTexts()).map((x) => x.trim());
    }
    const metaForm = () => top().locator('form[id^="publicationMetadataEntryForm-"]');
    async function metaTab() {
        const t0 = Date.now();
        await top().locator('[role=tab]').filter({hasText: /^\s*Metadata\s*$/}).first().click();
        const f = metaForm();
        await f.waitFor({state: 'visible', timeout: T}).catch(() => {});
        for (const g of ['identificationCodeGridContainer', SR, MK, 'publicationDateGridContainer']) {
            await f.locator(`[id^="${g}"] table`).first().waitFor({timeout: 12_000}).catch(() => {});
        }
        await idle(page).catch(() => {}); await sleep(1500);
        return {bad: since(t0).filter((x) => / [45]\d\d /.test(x)), dialogs: dlgSince(t0)};
    }
    const tabState = () => top().evaluate((d) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.getClientRects().length);
        const f = d.querySelector('form[id^="publicationMetadataEntryForm-"]');
        if (!f) return {form: false, text: t(d).slice(0, 600)};
        const grids = {};
        for (const g of ['identificationCodeGridContainer', 'salesRightsGridContainer', 'marketsGridContainer', 'publicationDateGridContainer']) {
            const el = f.querySelector(`[id^="${g}"]`);
            grids[g] = el ? {loaded: !!el.querySelector('table'), heading: t(el.querySelector('.header h4')), links: [...el.querySelectorAll('.header a')].filter(vis).map(t),
                rows: [...el.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => t(tr)), empty: [...el.querySelectorAll('tbody.empty')].filter(vis).map(t), text: t(el).slice(0, 300)} : null;
        }
        const legends = [...f.querySelectorAll('legend, .pkp_form .section > label, h3, h4')].filter(vis).map(t).filter(Boolean);
        return {form: true, grids, legends: [...new Set(legends)].slice(0, 40), text: t(f).slice(0, 1500)};
    }).catch((e) => ({error: flat(e.message, 200)}));
    const grid = (g) => metaForm().locator(`div[id^="${g}"]`).first();
    async function openAdd(g, linkName, formSel) {
        const n0 = await dialogCount();
        await grid(g).locator('.header a').filter({hasText: new RegExp(`^\\s*${linkName}\\s*$`)}).first().click();
        await waitTop(formSel, n0 + 1);
        await idle(page).catch(() => {}); await sleep(400);
    }
    async function subOK(formSel, opRe) {
        const t0 = Date.now();
        const n0 = await dialogCount();
        const resp = page.waitForResponse((r) => opRe.test(r.url()) && r.request().method() === 'POST', {timeout: 15_000}).catch(() => null);
        await top().locator(formSel).getByRole('button', {name: 'OK', exact: true}).first().click();
        const r = await resp;
        await idle(page).catch(() => {}); await sleep(900);
        const closed = await waitCount(n0 - 1);
        const o = {answer: r ? r.status() : 'no request', closed, notices: noticesSince(t0), dialogs: dlgSince(t0), posts: since(t0)};
        if (!closed) {
            o.errors = await top().locator('label.error, .pkp_form_error, .error').allInnerTexts().then((a) => a.map((x) => flat(x)).filter(Boolean)).catch(() => []);
            await top().locator(formSel).getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            await waitCount(n0 - 1);
        }
        return o;
    }
    async function subCancel(formSel) {
        const n0 = await dialogCount();
        await top().locator(formSel).getByRole('link', {name: 'Cancel', exact: true}).first().click();
        await waitCount(n0 - 1); await sleep(700);
    }
    async function closeFormatWindow() {
        const n0 = await dialogCount();
        const t0 = Date.now();
        await top().getByRole('button', {name: 'Close', exact: true}).first().click();
        const closed = await waitCount(n0 - 1);
        await sleep(700);
        return {closed, dialogs: dlgSince(t0)};
    }
    /** Add a sales-rights entry (the first type offered, Canada) and a market (Canada, a price) on the open tab. */
    async function addBoth(price) {
        const o = {};
        await openAdd(SR, 'Add Sales Rights', SRFORM);
        const f = top().locator(SRFORM);
        const opts = await f.locator('select[name="type"] option').evaluateAll((os) => os.map((x) => `${x.value}|${x.text.trim()}`));
        const pick = opts.find((x) => !x.startsWith('|'));
        await f.locator('select[name="type"]').selectOption(pick.split('|')[0]);
        await f.locator('select[name="countriesIncluded[]"]').selectOption(['CA']);
        o.rightsType = pick;
        o.rights = await subOK(SRFORM, /sales-rights-grid\/update-rights|updateRights/);
        o.rightsRows = (await tabState()).grids?.[SR]?.rows;
        await openAdd(MK, 'Add Market', MKFORM);
        const m = top().locator(MKFORM);
        await m.locator('input[name="date"]').fill('20260301');
        await m.locator('select[name="countriesIncluded[]"]').selectOption(['CA']);
        await m.locator('input[name="price"]').fill(price);
        await m.locator('select[name="currencyCode"]').selectOption('CAD').catch(() => {});
        o.market = await subOK(MKFORM, /markets-grid\/update-market|updateMarket/);
        o.marketRows = (await tabState()).grids?.[MK]?.rows;
        return o;
    }

    // ------------------------------------------------------------ the tool pages
    const pageFacts = () => page.evaluate(() => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.getClientRects().length);
        const main = document.querySelector('.app__contentPanel') || document.querySelector('main') || document.body;
        return {
            h1: t(document.querySelector('h1.app__pageHeading, main h1, h1')),
            content: t(main).slice(0, 1500),
            links: [...main.querySelectorAll('a')].filter(vis).map((a) => `${t(a)} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`).slice(0, 30),
            tabs: [...document.querySelectorAll('#importExportTabs [role="tab"]')].map((x) => `${t(x)}${x.getAttribute('aria-selected') === 'true' ? ' *' : ''}`),
            lists: [...main.querySelectorAll('.listPanel')].length,
            items: [...main.querySelectorAll('.listPanel__item')].length,
            sideMenu: [...document.querySelectorAll('nav a, .app__nav a')].filter(vis).map(t).filter(Boolean).slice(0, 30),
        };
    }).catch((e) => ({error: flat(e.message, 200)}));
    const onixUrl = (ctx) => cu(ctx, `/management/importexport/plugin/${ONIX}`);
    const nativeUrl = (ctx) => cu(ctx, `/management/importexport/plugin/${NATIVE}`);
    async function openOnix(ctx, name) {
        const t0 = Date.now();
        const r = await page.goto(onixUrl(ctx)); await idle(page).catch(() => {});
        if (await page.locator('#export-tab').count()) {
            await page.locator('#export-tab .listPanel__item, #export-tab .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {}); await sleep(400);
        }
        const s = name ? await snap(name) : null;
        return {status: r ? r.status() : null, url: rel(page.url()), page: await pageFacts(), snap: s && s.file, bad: since(t0).filter((x) => / [45]\d\d /.test(x))};
    }
    async function toolsList(ctx) {
        await page.goto(cu(ctx, '/management/tools')); await idle(page).catch(() => {});
        await page.getByRole('tab', {name: 'Import/Export'}).first().click().catch(() => {});
        await page.locator('.pkp_page_importexport_plugins li').first().waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {});
        return page.locator('.pkp_page_importexport_plugins li').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
    }
    const readXml = (xml) => ({
        bytes: xml.length,
        formats: [...xml.matchAll(/<publication_format\b[\s\S]*?<\/publication_format>/g)].map((m) => ({
            name: flat((m[0].match(/<name[^>]*>([^<]*)</) || [])[1]),
            products: (m[0].match(/<(?:onix:)?Product[ >]/g) || []).length,
        })),
        products: (xml.match(/<(?:onix:)?Product[ >]/g) || []).length,
        onixAnywhere: /onix/i.test(xml),
    });
    async function exportTool(ctx, plugin, words, name, {validation = true} = {}) {
        const r = {plugin, words, validation};
        await page.goto(plugin === ONIX ? onixUrl(ctx) : nativeUrl(ctx)); await idle(page).catch(() => {});
        const tabSel = plugin === ONIX ? '#export-tab' : '#exportSubmissions-tab';
        if (plugin !== ONIX) await page.getByRole('tab', {name: 'Export', exact: true}).first().click();
        const et = page.locator(tabSel);
        await et.locator('.listPanel__item').first().waitFor({timeout: T});
        await idle(page).catch(() => {}); await sleep(500);
        r.reminder = MISSING.test(await et.innerText().catch(() => ''));
        const items = et.locator('.listPanel__item');
        r.ticked = [];
        for (let i = 0; i < await items.count(); i++) {
            const it = items.nth(i);
            const tx = flat(await it.innerText());
            if (words.some((w) => tx.includes(w))) { await it.locator('input[type=checkbox]').check(); r.ticked.push(flat(tx, 80)); }
        }
        const vbox = et.locator('input[name="validation"]').first();
        if (await vbox.count()) await vbox.setChecked(validation);
        const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
        const t0 = Date.now();
        await et.getByRole('button', {name: 'Export Submissions', exact: true}).click();
        for (let i = 0; i < 60; i++) { await sleep(500); if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) break; }
        await idle(page).catch(() => {}); await sleep(800);
        const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
        await panel.getByText(/Download Exported File|failed|error|completed/i).first().waitFor({timeout: 60_000}).catch(() => {});
        await sleep(500);
        const s = await snap(name);
        r.snap = s.file;
        r.results = flat(await panel.innerText().catch(() => null), 1200);
        r.posts = since(t0).filter((x) => / [45]\d\d /.test(x));
        const b = panel.getByRole('button', {name: 'Download Exported File'});
        r.downloadButton = await b.count();
        if (r.downloadButton) {
            const dl = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
            await b.first().click();
            const d = await dl;
            if (d) {
                const xml = fs.readFileSync(await d.path(), 'utf8');
                fs.writeFileSync(path.join(outDir(), `${pfx(name)}-${app.name}.xml`), xml);
                r.file = readXml(xml);
            } else r.file = 'no download event';
        }
        return r;
    }
    async function openMasthead(ctx) {
        await page.goto(cu(ctx, '/management/settings/context')); await idle(page).catch(() => {});
        await page.getByRole('tab', {name: 'Masthead'}).first().click().catch(() => {});
        await page.locator('[name="publisher"]').first().waitFor({timeout: T});
        await idle(page).catch(() => {}); await sleep(300);
        return page.locator('form').filter({has: page.locator('[name=publisher]')}).first();
    }
    const readMasthead = (f) => f.evaluate((form) => {
        const g = (n) => form.querySelector(`[name="${n}"]`);
        const sel = g('codeType');
        const lab = (n) => { const e = g(n); const l = e && e.id ? form.querySelector(`label[for="${e.id}"]`) : null; return l ? l.innerText.replace(/\s+/g, ' ').trim() : null; };
        const grp = g('publisher') && g('publisher').closest('fieldset');
        return {group: grp ? (grp.querySelector('legend') || {}).innerText : null,
            labels: ['publisher', 'location', 'codeType', 'codeValue'].map(lab),
            publisher: g('publisher') && g('publisher').value, location: g('location') && g('location').value,
            codeType: sel ? `${sel.value}|${sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].text.trim() : ''}` : null,
            codeValue: g('codeValue') && g('codeValue').value};
    });
    async function saveMasthead(f) {
        const t0 = Date.now();
        await f.getByRole('button', {name: 'Save', exact: true}).first().click();
        const saved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 15_000}).then(() => true).catch(() => false);
        await idle(page).catch(() => {}); await sleep(500);
        const errs = await f.locator('.pkpFieldError, .pkpFormField__error').allInnerTexts().catch(() => []);
        return {saved, notices: noticesSince(t0), errors: errs.map((x) => flat(x)), posts: since(t0)};
    }

    // ============================================================ OJS / OPS: the read-only control (td1)
    if (!isOMP) {
        if (!on('control')) { await close(); return; }
        if (!S.J) {
            const t = tag('u74k1');
            const isOJS = app.name === 'ojs';
            const r = await app.api.createContext({tag: `${t}j`, context: {name: `U74 K1 control ${t}`, contactName: 'K1 Contact', contactEmail: `${t}jc@mail.test`},
                users: [{username: `${t}jmg`, roles: ['manager']}, {username: `${t}jau`, roles: ['author']}]});
            const sub = await app.api.createSubmission({tag: `${t}s`, context: r.path, submitter: `${t}jau`, title: `K1 control ${t}`,
                ...(isOJS ? {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']} : {}), galleys: [{label: 'PDF', file: isOJS ? 'article.pdf' : 'preprint.pdf'}]});
            S = {t, J: r.path, mg: `${t}jmg`, au: `${t}jau`, sub: {id: sub.submissionId, pub: sub.publicationId}};
            save();
        }
        const o = await safe('control', async () => {
            const o = {};
            // the seeded context as its manager: the Tools list and the ONIX tool's address typed
            await as('manager.maya', 'publicknowledge');
            o.pkTools = await toolsList('publicknowledge');
            await snap('x-01-tools-publicknowledge');
            o.pkToolsOnix = o.pkTools.filter((x) => /onix/i.test(x));
            const oo = await openOnix('publicknowledge', 'x-02-onix-address-publicknowledge');
            o.pkOnixTyped = {status: oo.status, url: oo.url, h1: oo.page.h1, content: flat(oo.page.content, 300), bad: oo.bad};
            // a scratch submission: the side menu, the galley window, the "Marketing" addresses
            await as(S.mg, S.J);
            const w = await openWf(edUrl(S.J, S.sub.id));
            const menu = await menuEntries();
            await snap('x-03-workflow-menu');
            o.workflow = {open: w, menu, marketing: marketingGroup(menu), anyMarketing: menu.some((e) => /Marketing|Audience|Representatives/.test(e))};
            for (const key of ['marketing_audience', 'marketing_representatives', 'marketing_publicationDates']) {
                const k = await openWf(edUrl(S.J, S.sub.id, key));
                const s = await snap(`x-04-typed-${key}`);
                o[`typed_${key}`] = {url: k.url, heading: k.heading, errorWindow: k.errorWindow, snap: s.file, bad: k.bad};
            }
            // the galley window
            await openWf(edUrl(S.J, S.sub.id, `publication_${S.sub.pub}_galleys`));
            await page.locator('[data-cy="galley-manager"] button[aria-label="More Actions"]').first().waitFor({timeout: T});
            await idle(page).catch(() => {});
            await page.locator('[data-cy="galley-manager"] button[aria-label="More Actions"]').first().click();
            o.galleyRowMenu = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x));
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await waitTop('form', 2);
            await idle(page).catch(() => {}); await sleep(500);
            const s2 = await snap('x-05-galley-edit-window');
            o.galleyWindow = {tabs: (await top().locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim()), text: flat(s2.text && s2.text.dialog, 900)};
            o.galleyWindow.anyTradeWords = /Metadata|Sales Rights|Market/.test(`${o.galleyWindow.tabs.join(' ')} ${o.galleyWindow.text}`);
            await loc(page, `${app.name} galley window: tabs`, top().locator('[role=tab]'));
            await top().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await waitCount(1);
            // the scratch context's Tools list too
            o.scratchTools = await toolsList(S.J);
            return o;
        });
        fact('control', o);
        await close();
        return;
    }

    // ============================================================ OMP: seed
    const BASE = {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']};
    const RIGHTS = {type: 'For sale with exclusive rights in the specified countries or territories (01)', countriesIncluded: ['Canada (CA)']};
    const REPS = [{type: 'agent', role: 'Exclusive sales agent (05)', name: 'K1 Agent Ada'}, {type: 'supplier', role: 'Distributor to end-customers (12)', name: 'K1 Supplier Sam'}];
    const AUD = {audience: 'Professional and scholarly (06)', rangeQualifier: 'US school grade range (11)', rangeFrom: 'Ninth Grade (9)', rangeTo: 'Twelfth Grade (12)'};
    const ONIXD = {publisher: 'K1 Press Ltd', location: 'Vancouver, Canada', codeType: 'Proprietary (01)', codeValue: 'K1-0001'};
    const U = (k) => `${S.t}a${k}`;
    if (on('seed') && !S.P1) {
        const t = tag('u74k1');
        S.t = t;
        const keys = [['mg', 'manager'], ['ed', 'editor'], ['pe', 'productionEditor'], ['se', 'sectionEditor'], ['se2', 'sectionEditor'],
            ...ASSIST.map(([k, r]) => [k, r]), ['le2', 'layoutEditor'], ['mk2', 'marketing'], ['au', 'author'], ['rd', 'reader']];
        const users = keys.map(([k, r]) => ({username: `${t}a${k}`, roles: [r], givenName: k.toUpperCase(), familyName: 'K1'}));
        const r = await app.api.createContext({tag: `${t}a`, context: {name: `U74 K1 ${t}`, acronym: 'K1P', country: 'CA', contactName: 'K1 Contact', contactEmail: `${t}ac@mail.test`}, users, ...ONIXD});
        S.P1 = {path: r.path, id: r.contextId};
        const sub = async (k, title, extra) => {
            const x = await app.api.createSubmission({tag: `${t}${k}`, context: S.P1.path, submitter: `${t}aau`, title: `${title} ${t}`, ...extra});
            return {id: x.submissionId, pub: x.publicationId, formats: x.publicationFormats, title: `${title} ${t}`};
        };
        const part = (list) => list.map(([k, role, extra]) => ({username: `${t}a${k}`, role, ...(extra || {})}));
        S.A = await sub('ba', 'K1 A published', {...BASE, published: true, representatives: REPS, audience: AUD,
            participants: part([['se', 'sectionEditor'], ['le', 'layoutEditor'], ['mk', 'marketing']]),
            publicationFormats: [{name: 'Paperback', salesRights: [RIGHTS], markets: [{date: '20250301', dateFormat: 'YYYYMMDD', price: '25', countriesIncluded: ['Canada (CA)'], agent: 'K1 Agent Ada', supplier: 'K1 Supplier Sam'}]}, {name: 'Ebook'}]});
        S.BP = await sub('bp', 'K1 BP production', {...BASE, publicationFormats: [{name: 'Paperback'}],
            participants: part([['se', 'sectionEditor'], ...ASSIST.map(([k, r]) => [k, r])])});
        S.BS = await sub('bs', 'K1 BS submission', {participants: part([['mk', 'marketing'], ['se', 'sectionEditor'], ['le', 'layoutEditor']])})
            .catch((e) => ({error: String(e.message).slice(0, 400)}));
        if (S.BS.error) S.BSfallback = await sub('bs2', 'K1 BS2 submission', {participants: part([['se', 'sectionEditor']])}).catch((e) => ({error: String(e.message).slice(0, 400)}));
        S.BC = await sub('bc', 'K1 BC copyediting', {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview'],
            participants: part([['le', 'layoutEditor'], ['mk', 'marketing'], ['ce', 'copyeditor']])}).catch((e) => ({error: String(e.message).slice(0, 400)}));
        for (const [k] of [...MANAGERS, ['ad']]) S[`B_${k}`] = await sub(`b${k}`, `K1 audience ${k}`, {...BASE});
        S.B_se0 = await sub('bs0', 'K1 audience se0', {...BASE, participants: part([['se', 'sectionEditor', {canChangeMetadata: false}]])});
        S.B_se1 = await sub('bs1', 'K1 audience se1', {...BASE, participants: part([['se', 'sectionEditor', {canChangeMetadata: true}]])});
        // PN: none of the four ONIX details; PT: no "Publisher Code Type"
        const mk = async (k, extra) => {
            const x = await app.api.createContext({tag: `${t}${k}`, context: {name: `U74 K1 ${k} ${t}`, acronym: 'K1Q', country: 'CA', contactName: 'K1 Contact', contactEmail: `${t}${k}c@mail.test`},
                users: [{username: `${t}${k}mg`, roles: ['manager']}, {username: `${t}${k}au`, roles: ['author']}], ...extra});
            const b = await app.api.createSubmission({tag: `${t}${k}b`, context: x.path, submitter: `${t}${k}au`, title: `K1 ${k} book ${t}`, ...BASE, publicationFormats: [{name: 'Paperback'}]});
            return {path: x.path, id: x.contextId, mg: `${t}${k}mg`, book: b.submissionId, title: `K1 ${k} book ${t}`};
        };
        S.PN = await mk('n', {});
        S.PT = await mk('t', {publisher: 'K1 T Press', location: 'Brno', codeValue: 'K1-T'});
        save();
        note(`ccK1 (${RUN}): P1 ${S.P1.path} (ONIX details; users ${t}a<role>, roles mg ed pe se se2 ce le le2 de ix pr mk mk2 fu au rd); books A ${S.A.id} published, BP ${S.BP.id} Production (se + 7 assistants), BS ${S.BS.id || S.BS.error}, BC ${S.BC.id || S.BC.error}; PN ${S.PN.path} (no details), PT ${S.PT.path} (no code type)`);
        fact('seed', S);
    }
    if (!S.P1) { log('no state; run the seed phase'); await close(); return; }
    const P = S.P1.path;

    // ============================================================ purpose: the Purpose paragraph on screen (fn-a), lines 12–33, 397–421
    if (on('purpose')) {
        const o = await safe('purpose', async () => {
            const o = {};
            await as(U('mg'), P);
            const w = await openWf(edUrl(P, S.A.id));
            const menu = await menuEntries();
            const s0 = await snap('p-01-workflow-menu-A');
            o.menu = {menu, marketing: marketingGroup(menu), snap: s0.file, open: w};
            await loc(page, 'workflow side menu: "Marketing" › "Audience"', wfDialog().getByRole('navigation').getByRole('link', {name: 'Audience', exact: true}));
            const a = await openWf(edUrl(P, S.A.id, 'marketing_audience'), 'audience');
            const s1 = await snap('p-02-audience-A');
            o.audience = {heading: a.heading, state: await audState(), snap: s1.file};
            const rp = await openWf(edUrl(P, S.A.id, 'marketing_representatives'), 'reps');
            const s2 = await snap('p-03-representatives-A');
            o.reps = {heading: rp.heading, grid: await repRows(), snap: s2.file};
            const pd = await openWf(edUrl(P, S.A.id, 'marketing_publicationDates'), 'dates');
            const s2b = await snap('p-03b-publication-dates-A');
            o.dates = {heading: pd.heading, text: pd.primaryText, snap: s2b.file};
            // the format window and its "Metadata" tab
            await openFormats(P, S.A.id, S.A.pub);
            o.formatTabs = await openEdit('Paperback');
            o.metaTab = await metaTab();
            const s3 = await snap('p-04-format-metadata-tab');
            o.metaState = await tabState();
            o.metaSnap = s3.file;
            // sweep: leave the window's tabs with a change unsaved (a box of the Metadata tab typed into)
            const box = metaForm().locator('input[type=text]:visible').first();
            o.leave = {box: await box.getAttribute('name').catch(() => null)};
            await box.fill('K1 unsaved change').catch((e) => { o.leave.fillError = flat(e.message, 120); });
            await box.blur().catch(() => {});
            const tt = Date.now();
            await top().locator('[role=tab]').first().click().catch(() => {});
            await sleep(1200);
            o.leave.tabSwitch = {dialogs: dlgSince(tt), tabs: await top().locator('[role=tab][aria-selected=true]').allInnerTexts().catch(() => [])};
            await top().locator('[role=tab]').filter({hasText: /^\s*Metadata\s*$/}).first().click().catch(() => {});
            await sleep(1000);
            o.leave.backOnMetadata = await metaForm().locator(`[name="${o.leave.box}"]`).inputValue().catch(() => null);
            const tc = Date.now();
            o.leave.close = await closeFormatWindow();
            await sleep(600);
            const s3b = await snap('p-04b-after-close-with-change');
            o.leave.afterClose = {dialogs: dlgSince(tc), windows: await dialogCount(), notices: noticesSince(tc), snap: s3b.file};
            // Tools › Import/Export
            o.tools = await toolsList(P);
            const s4 = await snap('p-05-tools-list');
            o.toolsSnap = s4.file;
            await loc(page, 'Tools › Import/Export: the ONIX tool link', page.locator('.pkp_page_importexport_plugins').getByRole('link', {name: 'ONIX 3.0 Monograph Export Plugin'}));
            // the ONIX export: a published book with validation, an unpublished one without
            o.onixA = await exportTool(P, ONIX, [S.A.title], 'p-06-onix-export-A');
            o.onixBP = await exportTool(P, ONIX, [S.BP.title], 'p-07-onix-export-BP-novalidation', {validation: false});
            // the Native XML export carries the products
            o.nativeA = await exportTool(P, NATIVE, [S.A.title], 'p-08-native-export-A');
            // the press's four ONIX details on the Masthead
            const f = await openMasthead(P);
            o.masthead = await readMasthead(f);
            const s5 = await snap('p-09-masthead');
            o.mastheadSnap = s5.file;
            // the book's own page (signed out, then as a reader): none of the trade data
            await signOut(page).catch(() => {}); who = null;
            for (const [k, u] of [['anon', null], ['reader', U('rd')]]) {
                if (u) await as(u, P);
                const r = await page.goto(cu(P, `/catalog/book/${S.A.id}`)); await idle(page).catch(() => {});
                const s6 = await snap(`p-10-book-page-${k}`);
                const body = await page.locator('body').innerText().catch(() => '');
                o[`bookPage_${k}`] = {status: r ? r.status() : null, snap: s6.file,
                    hits: ['Professional and scholarly', 'Audience', 'K1 Agent Ada', 'K1 Supplier Sam', 'Representative', 'Sales Rights', 'Market', 'Canada', '25', 'Ninth Grade', 'Supplier', 'Agent'].filter((w) => body.includes(w)),
                    text: flat(body, 1500)};
            }
            // the seeded press's Tools list, read as its manager (read-only)
            await as('manager.maya', 'publicknowledge');
            o.pkTools = await toolsList('publicknowledge');
            await snap('p-11-tools-publicknowledge');
            return o;
        });
        fact('purpose', o);
    }

    // ============================================================ lists: the code lists (Fields intro, fn-d), lines 63–66
    if (on('lists')) {
        const o = await safe('lists', async () => {
            const o = {};
            await as(U('mg'), P);
            const readSelects = (root) => root.evaluate((r) => [...r.querySelectorAll('select')].map((s) => {
                const lab = s.id ? document.querySelector(`label[for="${s.id}"]`) : null;
                return {name: s.name, label: lab ? lab.innerText.replace(/\s+/g, ' ').trim() : null, options: [...s.options].map((x) => (x.value === '' ? '<empty>' : x.text.trim()))};
            }));
            await openWf(edUrl(P, S.A.id, 'marketing_audience'), 'audience');
            o.audience = await readSelects(primary());
            await openWf(edUrl(P, S.A.id, 'marketing_representatives'), 'reps');
            await repGrid().locator('.header a').filter({hasText: /^\s*Add Representative\s*$/}).first().click();
            await repForm().locator('input[name="name"]').waitFor({timeout: T});
            await idle(page).catch(() => {});
            o.repWindow = await readSelects(repForm());
            await snap('l-01-rep-window');
            await repForm().locator('a, button').filter({hasText: /^\s*Cancel\s*$/}).first().click();
            await sleep(800);
            await openFormats(P, S.A.id, S.A.pub);
            await openEdit('Paperback');
            await metaTab();
            await openAdd(SR, 'Add Sales Rights', SRFORM);
            o.salesRightsWindow = await readSelects(top().locator(SRFORM));
            await snap('l-02-sales-rights-window');
            await subCancel(SRFORM);
            await openAdd(MK, 'Add Market', MKFORM);
            o.marketWindow = await readSelects(top().locator(MKFORM));
            await snap('l-03-market-window');
            await subCancel(MKFORM);
            await closeFormatWindow();
            // analysis: "Name (code)", "(Discontinued)", alphabetical, discontinued last
            const analyse = (sel) => {
                const opts = sel.options.filter((x) => x !== '<empty>');
                const coded = opts.filter((x) => /\([^()]+\)$/.test(x) && !/\(Discontinued\)$/.test(x));
                const disc = opts.map((x, i) => [x, i]).filter(([x]) => /\(Discontinued\)$/.test(x));
                const plain = opts.filter((x) => !/\([^()]+\)$/.test(x));
                const names = opts.filter((x) => !/\(Discontinued\)$/.test(x));
                const outOfOrder = [];
                for (let i = 1; i < names.length; i++) if (names[i - 1].localeCompare(names[i], 'en', {sensitivity: 'base'}) > 0) outOfOrder.push(`${names[i - 1]} > ${names[i]}`);
                const firstDisc = disc.length ? disc[0][1] : null;
                return {name: sel.name, label: sel.label, count: opts.length, empties: sel.options.length - opts.length, coded: coded.length, discontinued: disc.length, plain: plain.slice(0, 6), plainCount: plain.length,
                    discontinuedLast: disc.length ? disc.every(([, i]) => i >= opts.length - disc.length) : null, firstDiscAt: firstDisc,
                    outOfOrder: outOfOrder.slice(0, 6), outOfOrderCount: outOfOrder.length, first: opts[0], last: opts[opts.length - 1]};
            };
            o.analysis = {};
            for (const k of ['audience', 'repWindow', 'salesRightsWindow', 'marketWindow']) o.analysis[k] = o[k].map(analyse);
            return o;
        });
        fact('lists', {analysis: o.analysis, error: o.error});
        fact('lists.raw', o);
    }

    // ============================================================ roles: who opens "Audience" and "Representatives" (td2), lines 41–55
    const ROLESET = [...MANAGERS.map(([k, , l]) => [k, U(k), l]), ['admin', 'admin', 'Site Administrator'], ['se', U('se'), 'Series editor'],
        ...ASSIST.map(([k, , l]) => [k, U(k), l])];
    async function lookAt(key, user, sid, label) {
        await as(user, P);
        const o = {};
        const w = await openWf(edUrl(P, sid));
        const menu = await menuEntries();
        o.open = {url: w.url, panel: w.panel, errorWindow: w.errorWindow, heading: w.heading, bad: w.bad};
        o.marketing = marketingGroup(menu);
        o.menu = menu;
        const s0 = await snap(`r-${label}-${key}-open`);
        o.openSnap = s0.file;
        if (w.errorWindow || !w.panel) return o;
        const a = await openWf(edUrl(P, sid, 'marketing_audience'), 'audience');
        const s1 = await snap(`r-${label}-${key}-audience`);
        o.audience = {heading: a.heading, errorWindow: a.errorWindow, state: await audState(), bad: a.bad, snap: s1.file};
        const r = await openWf(edUrl(P, sid, 'marketing_representatives'), 'reps');
        const s2 = await snap(`r-${label}-${key}-reps`);
        o.reps = {heading: r.heading, errorWindow: r.errorWindow, grid: await repRows(), bad: r.bad, snap: s2.file};
        return o;
    }
    if (on('roles')) {
        const o = await safe('roles', async () => {
            const o = {};
            // the book in Production, every role
            for (const [k, u] of ROLESET) o[`BP_${k}`] = await safe(`roles-${k}`, () => lookAt(k, u, S.BP.id, 'bp'));
            // the stage axis
            const stageBooks = [['bs', S.BS], ['bc', S.BC], ['a', S.A]];
            for (const [label, b] of stageBooks) {
                if (!b || !b.id) { o[`${label}`] = {skipped: b}; continue; }
                for (const k of ['mg', 'se', 'le', 'mk', 'ce']) o[`${label}_${k}`] = await safe(`roles-${label}-${k}`, () => lookAt(k, U(k), b.id, label));
            }
            // not assigned
            for (const k of ['se2', 'le2', 'mk2']) {
                await as(U(k), P);
                const w = await openWf(edUrl(P, S.BP.id));
                const s = await snap(`r-unassigned-${k}`);
                const w2 = await openWf(edUrl(P, S.BP.id, 'marketing_audience'));
                const s2 = await snap(`r-unassigned-${k}-audience-typed`);
                o[`unassigned_${k}`] = {open: w, snap: s.file, audienceTyped: {url: w2.url, errorWindow: w2.errorWindow, heading: w2.heading, panel: w2.panel, snap: s2.file}};
            }
            // the author's view
            await as(U('au'), P);
            const wa = await openWf(auUrl(P, S.BP.id));
            const ma = await menuEntries();
            const sa = await snap('r-author-view');
            o.author = {open: wa, menu: ma, marketing: marketingGroup(ma), snap: sa.file};
            const wb = await openWf(auUrl(P, S.BP.id, 'marketing_audience'));
            const sb = await snap('r-author-view-audience-key');
            o.authorKey = {url: wb.url, heading: wb.heading, errorWindow: wb.errorWindow, primary: wb.primaryText, snap: sb.file};
            const wc = await openWf(edUrl(P, S.BP.id, 'marketing_audience'));
            const sc = await snap('r-author-editorial-address');
            o.authorEditorial = {url: wc.url, heading: wc.heading, errorWindow: wc.errorWindow, panel: wc.panel, primary: wc.primaryText, snap: sc.file};
            // Settings › Users & Roles › Roles: the permission level of every role
            await as(U('mg'), P);
            await page.goto(cu(P, '/management/settings/access')); await idle(page).catch(() => {});
            await page.locator('#roles-button').first().click();
            await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: T});
            await idle(page).catch(() => {});
            const sr = await snap('r-roles-grid');
            o.rolesGrid = {snap: sr.file, rows: await page.locator('#roleGridContainer').evaluate((g) => [...g.querySelectorAll('tbody tr.gridRow')].filter((e) => e.getClientRects().length).map((tr) => `${(tr.querySelector('[id$="-name"] .label') || {}).innerText?.trim()} | ${(tr.querySelector('[id$="-roleId"] .label') || {}).innerText?.trim()}`)),
                columns: await page.locator('#roleGridContainer thead th').allInnerTexts().then((a) => a.map((x) => flat(x)))};
            return o;
        });
        fact('roles', o);
    }

    // ============================================================ audience: "Save" by role (td3, A2), lines 56, 507–517
    async function saveAs(key, user, sid, label, choice = 'Children (02)') {
        await as(user, P);
        const o = {};
        const a = await openWf(edUrl(P, sid, 'marketing_audience'), 'audience');
        o.open = {heading: a.heading, errorWindow: a.errorWindow, bad: a.bad};
        o.before = await audState();
        o.dbBefore = audDb(sid);
        if (!o.before.selects || !o.before.selects.length) { await snap(`a-${label}-${key}-noform`); return o; }
        await chooseAud('Audience', choice);
        o.save = await pressSave();
        const s1 = await snap(`a-${label}-${key}-saved`);
        o.save.snap = s1.file;
        o.samePage = await audState();
        await page.reload(); await idle(page).catch(() => {});
        await primary().locator('select').first().waitFor({timeout: 15_000}).catch(() => {});
        await sleep(500);
        const s2 = await snap(`a-${label}-${key}-reload`);
        o.afterReload = await audState();
        o.afterReload.snap = s2.file;
        o.db = audDb(sid);
        return o;
    }
    if (on('audience')) {
        const o = await safe('audience', async () => {
            const o = {};
            for (const [k, u] of [['mg', U('mg')], ['ed', U('ed')], ['pe', U('pe')], ['ad', 'admin']]) o[`mgr_${k}`] = await safe(`aud-${k}`, () => saveAs(k, u, S[`B_${k}`].id, 'mgr'));
            o.se_off = await safe('aud-se0', () => saveAs('se0', U('se'), S.B_se0.id, 'se'));
            o.se_on = await safe('aud-se1', () => saveAs('se1', U('se'), S.B_se1.id, 'se'));
            o.se_flags = sql(`select sa.submission_id||':'||sa.can_change_metadata from stage_assignments sa join users u on u.user_id=sa.user_id where u.username='${U('se')}' order by 1`);
            for (const [k] of ASSIST) o[`asst_${k}`] = await safe(`aud-${k}`, () => saveAs(k, U(k), S.BP.id, 'asst'));
            // "Publication Dates" (the same refusal, line 513): the Layout Editor and the Marketing and sales coordinator
            for (const k of ['le', 'mk', 'mg']) {
                o[`dates_${k}`] = await safe(`dates-${k}`, async () => {
                    await as(U(k), P);
                    const r = {};
                    const w = await openWf(edUrl(P, S.BP.id, 'marketing_publicationDates'), 'dates');
                    r.open = {heading: w.heading, errorWindow: w.errorWindow};
                    const radios = () => primary().locator('input[type=radio]').evaluateAll((rs) => rs.map((x) => `${(x.closest('label') || {}).innerText?.trim() || x.value}:${x.checked ? 'x' : 'o'}`));
                    r.before = await radios();
                    const target = primary().locator('input[type=radio]:not(:checked)').last();
                    await target.check();
                    r.chosen = await radios();
                    r.save = await pressSave();
                    const s = await snap(`a-dates-${k}-saved`);
                    r.save.snap = s.file;
                    r.samePage = await radios();
                    await page.reload(); await idle(page).catch(() => {});
                    await primary().locator('input[type=radio]').first().waitFor({timeout: 15_000}).catch(() => {});
                    await sleep(500);
                    r.afterReload = await radios();
                    await snap(`a-dates-${k}-reload`);
                    return r;
                });
            }
            return o;
        });
        fact('audience', o);
    }

    // ============================================================ reps: add, edit, delete by role (td4), line 57
    if (on('reps')) {
        const o = await safe('reps', async () => {
            const o = {};
            for (const [k, u] of [['mk', U('mk')], ['le', U('le')], ['se', U('se')], ['ce', U('ce')], ['de', U('de')], ['ix', U('ix')], ['pr', U('pr')], ['fu', U('fu')],
                ['mg', U('mg')], ['ed', U('ed')], ['pe', U('pe')], ['ad', 'admin']]) {
                o[k] = await safe(`reps-${k}`, async () => {
                    await as(u, P);
                    const w = await openWf(edUrl(P, S.BP.id, 'marketing_representatives'), 'reps');
                    const r = {open: {heading: w.heading, errorWindow: w.errorWindow, bad: w.bad}};
                    r.cycle = await repCycle(S.BP.id, `Trade Books Ltd ${k.toUpperCase()}`, {snapKey: `m-bp-${k}`});
                    return r;
                });
            }
            // the Layout Editor on a book in Copyediting: the add
            if (S.BC && S.BC.id) {
                o.le_bc = await safe('reps-le-bc', async () => {
                    await as(U('le'), P);
                    const w = await openWf(edUrl(P, S.BC.id, 'marketing_representatives'), 'reps');
                    return {open: {heading: w.heading, errorWindow: w.errorWindow, bad: w.bad}, cycle: await repCycle(S.BC.id, 'Trade Books Ltd', {edit: false, del: false, snapKey: 'm-bc-le'})};
                });
            }
            o.dbBP = sql(`select name||':'||is_supplier||':'||role from representatives where submission_id=${S.BP.id} order by representative_id`).split('\n');
            return o;
        });
        fact('reps', o);
    }

    // ============================================================ formats: sales rights and markets by role (td5), line 58
    const fmtRun = async (k, u, b, price) => {
                await as(u, P);
                const r = {};
                r.formatsPage = await openFormats(P, b.id, b.pub);
                const s0 = await snap(`f-${k}-formats-page`);
                r.formatsPageSnap = s0.file;
                r.formatsPageText = flat(await wfTop().locator('[data-cy="workflow-primary-items"]').innerText().catch(() => null), 500);
                if (!(await fmtRow('Paperback').count())) return r;
                r.tabs = await openEdit('Paperback');
                r.metaTab = await metaTab();
                r.tab = await tabState();
                const s1 = await snap(`f-${k}-metadata-tab`);
                r.tabSnap = s1.file;
                const loaded = r.tab.grids && r.tab.grids[SR] && r.tab.grids[SR].loaded && r.tab.grids[MK] && r.tab.grids[MK].loaded;
                if (loaded && price) {
                    r.add = await addBoth(price);
                    await snap(`f-${k}-after-add`);
                }
                r.close = await closeFormatWindow();
                return r;
    };
    if (on('formats')) {
        const o = await safe('formats', async () => {
            const o = {};
            const run = fmtRun;
            o.ed = await safe('fmt-ed', () => run('ed', U('ed'), S.BP, '11'));
            o.pe = await safe('fmt-pe', () => run('pe', U('pe'), S.BP, '12'));
            o.ad = await safe('fmt-ad', () => run('ad', 'admin', S.BP, '13'));
            o.mg_published = await safe('fmt-mg', () => run('mg-published', U('mg'), S.A, '14'));
            const fid = (b) => sql(`select publication_format_id from publication_formats where publication_id=${b.pub} order by 1`).split('\n').filter(Boolean);
            o.db = {
                BP: fid(S.BP).map((f) => ({f, rights: sql(`select type||':'||coalesce(countries_included,'') from sales_rights where publication_format_id=${f}`), markets: sql(`select price||':'||coalesce(currency_code,'') from markets where publication_format_id=${f}`)})),
                A: fid(S.A).map((f) => ({f, rights: sql(`select type||':'||coalesce(countries_included,'') from sales_rights where publication_format_id=${f}`), markets: sql(`select price||':'||coalesce(currency_code,'') from markets where publication_format_id=${f}`)})),
            };
            return o;
        });
        fact('formats', o);
    }

    // ============================================================ fmtlists: the format window as the Series editor and each assistant role (td5)
    if (on('fmtlists')) {
        const o = await safe('fmtlists', async () => {
            const o = {};
            for (const k of ['se', ...ASSIST.map(([x]) => x)]) o[k] = await safe(`fmtl-${k}`, () => fmtRun(k, U(k), S.BP, null));
            o.se_published = await safe('fmtl-se-a', () => fmtRun('se-published', U('se'), S.A, null));
            o.le_published = await safe('fmtl-le-a', () => fmtRun('le-published', U('le'), S.A, null));
            o.mk_published = await safe('fmtl-mk-a', () => fmtRun('mk-published', U('mk'), S.A, null));
            return o;
        });
        fact('fmtlists', o);
    }

    // ============================================================ extra: the assignment's metadata box (line 56); an eighth assistant-level role (lines 45–47)
    if (on('extra')) {
        const o = await safe('extra', async () => {
            const o = {};
            // the Series editor's assignment on B_se0 (seeded canChangeMetadata false), read in the Participants panel's "Edit"
            await as(U('mg'), P);
            await openWf(edUrl(P, S.B_se0.id));
            const col = page.locator('[data-cy="workflow-secondary-items"]');
            await col.locator('h3').filter({hasText: /^\s*Participants\s*$/i}).first().waitFor({timeout: T}).catch(() => {});
            o.participants = flat(await col.innerText().catch(() => null), 600);
            const row = col.locator('li').filter({has: page.locator('button')}).filter({hasText: 'SE K1'}).first();
            await row.locator('button[aria-haspopup="menu"]').click();
            await page.getByRole('menuitem').first().waitFor({timeout: T});
            o.rowMenu = (await page.getByRole('menuitem').allInnerTexts()).map((x) => flat(x));
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            const win = page.getByRole('dialog', {name: 'Edit Assignment', exact: true});
            await win.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: T});
            await idle(page).catch(() => {});
            const sw = await snap('e-01-edit-assignment-se0');
            o.editAssignment = {snap: sw.file, text: flat(await win.locator('form').innerText().catch(() => null), 1200),
                metadataBox: await win.locator('input[name="canChangeMetadata"]').isChecked().catch((e) => `err ${flat(e.message, 80)}`)};
            await win.getByRole('button', {name: 'Cancel', exact: true}).click().catch(async () => { await win.getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => {}); });
            await sleep(900);
            // the role's own option on Settings › Users & Roles › Roles › "Series editor" › "Edit"
            await page.goto(cu(P, '/management/settings/access')); await idle(page).catch(() => {});
            await page.locator('#roles-button').first().click();
            await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: T});
            const rr = page.locator('#roleGridContainer tr.gridRow').filter({hasText: 'Series editor'}).first();
            const rid = await rr.getAttribute('id');
            await rr.locator('a.show_extras').first().click();
            await page.locator(`[id="${rid}-control-row"]`).getByRole('link', {name: 'Edit', exact: true}).first().click();
            await page.locator('input[name="permitMetadataEdit"]').first().waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            const sr = await snap('e-02-role-series-editor-edit');
            o.roleForm = {snap: sr.file, permitMetadataEdit: await page.locator('input[name="permitMetadataEdit"]').first().isChecked().catch(() => null),
                label: await page.locator('input[name="permitMetadataEdit"]').first().evaluate((i) => { const l = i.closest('label') || document.querySelector(`label[for="${i.id}"]`); return l ? l.innerText.replace(/\s+/g, ' ').trim() : null; }).catch(() => null)};
            await top().getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            await sleep(800);
            // an Editorial Board Member (the eighth assistant-level role) assigned to a book
            if (!S.PE) {
                const t = S.t;
                const x = await app.api.createContext({tag: `${t}e`, context: {name: `U74 K1 e ${t}`, acronym: 'K1E', country: 'CA', contactName: 'K1 Contact', contactEmail: `${t}ec@mail.test`},
                    users: [{username: `${t}emg`, roles: ['manager']}, {username: `${t}eeb`, roles: ['editorialBoardMember'], givenName: 'EB', familyName: 'K1'}, {username: `${t}eau`, roles: ['author']}]});
                S.PE = {path: x.path, mg: `${t}emg`, eb: `${t}eeb`};
                try {
                    const b = await app.api.createSubmission({tag: `${t}eb1`, context: x.path, submitter: `${t}eau`, title: `K1 e book ${t}`, ...BASE,
                        participants: [{username: `${t}eeb`, role: 'editorialBoardMember'}]});
                    S.PE.book = b.submissionId;
                } catch (e) { S.PE.seedError = flat(e.message, 400); }
                save();
            }
            o.ebm = {seed: S.PE};
            if (S.PE.book) {
                await as(S.PE.eb, S.PE.path);
                const w = await openWf(edUrl(S.PE.path, S.PE.book));
                const s = await snap('e-03-ebm-open');
                o.ebm.open = {url: w.url, errorWindow: w.errorWindow, heading: w.heading, panel: w.panel, menu: await menuEntries(), snap: s.file, bad: w.bad};
                const w2 = await openWf(edUrl(S.PE.path, S.PE.book, 'marketing_audience'));
                o.ebm.audienceTyped = {url: w2.url, errorWindow: w2.errorWindow, heading: w2.heading};
                await page.goto(cu(S.PE.path, '/dashboard/editorial')); await idle(page).catch(() => {});
                const sd = await snap('e-04-ebm-dashboard');
                o.ebm.dashboard = {url: rel(page.url()), main: flat(sd.text && sd.text.main, 400), snap: sd.file};
            }
            return o;
        });
        fact('extra', o);
    }

    // ============================================================ assign: the roles the Participants "Assign" window offers (lines 45–47)
    if (on('assign')) {
        const o = await safe('assign', async () => {
            const o = {};
            await as(U('mg'), P);
            for (const [label, b] of [['bp', S.BP], ['bs', S.BS]]) {
                await openWf(edUrl(P, b.id));
                const col = page.locator('[data-cy="workflow-secondary-items"]');
                await col.locator('h3').filter({hasText: /^\s*Participants\s*$/i}).first().waitFor({timeout: T});
                await col.locator('button').filter({hasText: /^\s*Assign\s*$/}).first().click();
                const win = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
                await win.locator('select[name="filterUserGroupId"]').waitFor({timeout: T});
                await idle(page).catch(() => {});
                const s = await snap(`g-assign-window-${label}`);
                o[label] = {heading: await heading(), roles: (await win.locator('select[name="filterUserGroupId"] option').allInnerTexts()).map((x) => flat(x)), snap: s.file};
                await win.getByRole('button', {name: 'Cancel', exact: true}).click().catch(async () => { await win.getByRole('link', {name: 'Cancel', exact: true}).click().catch(() => {}); });
                await sleep(900);
            }
            return o;
        });
        fact('assign', o);
    }

    // ============================================================ tools: the ONIX tool's address by role (Actors row 5), line 59
    if (on('tools')) {
        const o = await safe('tools', async () => {
            const o = {};
            for (const [k, u] of [['mg', U('mg')], ['ed', U('ed')], ['pe', U('pe')], ['ad', 'admin'], ['se', U('se')], ['le', U('le')], ['mk', U('mk')], ['au', U('au')], ['rd', U('rd')]]) {
                o[k] = await safe(`tools-${k}`, async () => {
                    await as(u, P);
                    const r = await openOnix(P, `t-onix-typed-${k}`);
                    const t0 = Date.now();
                    const tr = await page.goto(cu(P, '/management/tools')); await idle(page).catch(() => {});
                    const s = await snap(`t-tools-typed-${k}`);
                    return {onix: {status: r.status, url: r.url, h1: r.page.h1, content: flat(r.page.content, 300), tabs: r.page.tabs, lists: r.page.lists, bad: r.bad, snap: r.snap},
                        tools: {status: tr ? tr.status() : null, url: rel(page.url()), content: flat(s.text && s.text.main, 300), bad: since(t0).filter((x) => / [45]\d\d /.test(x)), snap: s.file}};
                });
            }
            return o;
        });
        fact('tools', o);
    }

    // ============================================================ settings: the press's ONIX details (td18), lines 385–393
    if (on('settings')) {
        const o = await safe('settings', async () => {
            const o = {};
            const N = S.PN;
            await as(N.mg, N.path);
            let f = await openMasthead(N.path);
            o.newPress = await readMasthead(f);
            await snap('s-01-masthead-new-press');
            await loc(page, 'Masthead: "Publisher Identity" boxes', page.locator('[name="publisher"], [name="location"], select[name="codeType"], [name="codeValue"]'));
            // Tools › Import/Export › the ONIX tool
            const tl = await toolsList(N.path);
            o.toolsLine = tl.filter((x) => /onix/i.test(x));
            await page.locator('.pkp_page_importexport_plugins').getByRole('link', {name: 'ONIX 3.0 Monograph Export Plugin'}).first().click();
            await page.waitForLoadState('load'); await idle(page).catch(() => {});
            const s1 = await snap('s-02-onix-page-blank');
            o.blankPage = {url: rel(page.url()), page: await pageFacts(), snap: s1.file};
            o.blankPage.rawSentence = await page.locator('.app__contentPanel p').first().evaluate((p) => p.textContent).catch(() => null);
            await page.locator('.app__contentPanel').getByRole('link', {name: 'Press Settings'}).first().click();
            await page.waitForLoadState('load'); await idle(page).catch(() => {}); await sleep(500);
            const s2 = await snap('s-03-press-settings-landing');
            o.pressSettings = {url: rel(page.url()), selectedTabs: await page.locator('[role="tab"][aria-selected="true"]').allInnerTexts().then((a) => a.map((x) => flat(x))).catch(() => []),
                publisherVisible: await page.locator('[name="publisher"]').first().isVisible().catch(() => false), h1: flat(await page.locator('h1').first().innerText().catch(() => null)), snap: s2.file};
            o.nativeBlank = await exportTool(N.path, NATIVE, [N.title], 's-04-native-all-blank');
            // fill the four on the Masthead, save, reopen the tool
            f = await openMasthead(N.path);
            await f.locator('[name="publisher"]').first().fill('K1 Typed Press');
            await f.locator('[name="location"]').first().fill('Prague');
            await f.locator('select[name="codeType"]').first().selectOption('01');
            await f.locator('[name="codeValue"]').first().fill('K1-TYPED');
            o.saveAll = await saveMasthead(f);
            o.saveAllReload = await readMasthead(await openMasthead(N.path));
            o.filledPage = await openOnix(N.path, 's-05-onix-page-filled');
            o.nativeFilled = await exportTool(N.path, NATIVE, [N.title], 's-06-native-filled');
            // each text box emptied alone
            o.blanks = {};
            for (const [field, restore] of [['codeValue', 'K1-TYPED'], ['publisher', 'K1 Typed Press'], ['location', 'Prague']]) {
                f = await openMasthead(N.path);
                await f.locator(`[name="${field}"]`).first().fill('');
                const sv = await saveMasthead(f);
                const reread = await readMasthead(await openMasthead(N.path));
                const pg = await openOnix(N.path, `s-07-onix-page-${field}-blank`);
                const nx = await exportTool(N.path, NATIVE, [N.title], `s-08-native-${field}-blank`);
                o.blanks[field] = {save: sv, reread, tool: {tabs: pg.page.tabs, lists: pg.page.lists, content: flat(pg.page.content, 300), snap: pg.snap}, native: {products: nx.file && nx.file.products, reminder: nx.reminder, results: flat(nx.results, 200)}};
                f = await openMasthead(N.path);
                await f.locator(`[name="${field}"]`).first().fill(restore);
                o.blanks[field].restored = (await saveMasthead(f)).saved;
            }
            // "Publisher Code Type": the list has no empty choice (a press seeded with the other three)
            f = await openMasthead(N.path);
            o.codeTypeOptions = await f.locator('select[name="codeType"] option').evaluateAll((os) => ({count: os.length, empty: os.filter((x) => x.value === '').length}));
            await as(S.PT.mg, S.PT.path);
            o.codeTypeBlank = {masthead: await readMasthead(await openMasthead(S.PT.path))};
            const pt = await openOnix(S.PT.path, 's-09-onix-page-codetype-blank');
            o.codeTypeBlank.tool = {tabs: pt.page.tabs, lists: pt.page.lists, content: flat(pt.page.content, 300)};
            const ptn = await exportTool(S.PT.path, NATIVE, [S.PT.title], 's-10-native-codetype-blank');
            o.codeTypeBlank.native = {products: ptn.file && ptn.file.products, reminder: ptn.reminder, results: flat(ptn.results, 200)};
            o.db = sql(`select setting_name||'='||coalesce(setting_value,'<null>') from press_settings where press_id=${N.id} and setting_name in ('publisher','location','codeType','codeValue') order by 1`).split('\n');
            return o;
        });
        fact('settings', o);
    }

    await close();
});
