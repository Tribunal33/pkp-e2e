// U74 claim check K3 — a format's "Metadata" tab › "Sales Rights" and the sales-rights window {OMP},
// with read-only galley-window controls on OJS and OPS.
// Spec: docs/specs/U74-onix-metadata-export.md — Fields 108–127 (the list, the window); Rules 9–12 (218–239);
// register A7 (560–571), A11 (608–619); footnotes f, g, td14, td15, f-a7, f-a11.
//
// Run: RUN=r1 PROBE_FEATURE=U74 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U74/K3/k3.js
//      RUN=r2 …  (a second, independent run: its own scratch presses, its own facts file k3-<RUN>-facts-<app>.json)
//      PHASES=seed,list,window,row,refuse,delete,perfmt,leave,alltypes,markets,version,blank,bookc,rowmsg,leave2,export,import (OMP) · control (OJS, OPS)
//      Default: all. Later phases read k3-state-<RUN>-<app>.json; FRESH=1 seeds anew. A full OMP run outlasts the
//      Bash cap: launch it detached (nohup … &).
//
// Scratch contexts per run (tag u74k3…), OMP:
//   P1  a press with its four ONIX details (publisher, location, codeType, codeValue) so the Native XML export
//       carries each format's ONIX product. Book A: published, formats "Paperback", "Ebook", "Hardback" (no file).
//       Manager {t}amg drives every screen (the Press manager); author {t}aau submits.
//       Book C: unpublished at Production, formats "Paperback", "Ebook": the export and import book (only entries
//       with a territory, plus the one "Rest of World?" entry), the refusal-message and leave-with-change controls.
//   P2  a press with its four ONIX details, the Native XML import's target (A11). Manager {t}bmg.
// OJS, OPS: a scratch journal / server with one galley "PDF" (the galley windows have no "Metadata" tab, no lists).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'list', 'window', 'row', 'refuse', 'delete', 'perfmt', 'leave', 'alltypes', 'markets', 'version', 'blank', 'bookc', 'rowmsg', 'leave2', 'export', 'import', 'control'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k3]', RUN, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const VIS = '[role="dialog"]:visible';
const SR = 'salesRightsGridContainer';
const MK = 'marketsGridContainer';
const SRFORM = 'form#addSalesRightsForm';
const MKFORM = 'form#marketForm';

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const sf = path.join(outDir(), `k3-state-${RUN}-${app.name}.json`);
    let S = (!process.env.FRESH && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k3-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const sql = (q) => { try { return execFileSync('psql', ['-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `SQL ERROR ${String(e.stderr).trim()}`; } };

    const {page, close} = await launch(app);
    // browser dialogs: `policy` answers confirm(); every one is kept with a time
    let policy = 'dismiss';
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : policy});
        if (d.type() === 'beforeunload' || policy === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const dlgSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
    // page notices as they appear
    const notices = [];
    await page.exposeFunction('__k3Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                seen.add(e);
                window.__k3Notice(t);
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
        if (m !== 'GET') { try { body = (await r.text()).slice(0, 600); } catch { /* ignore */ } }
        posts.push({at: Date.now(), method: m, status: r.status(), url: u.replace(/^.*\/index\.php/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 180), body: flat(body, 300)});
    });
    const since = (t0) => posts.filter((p) => p.at >= t0).map(({at, ...p}) => p);

    const pfx = (n) => `${RUN}-${n}`;
    async function snap(name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(s, extra);
        record(pfx(name), s);
        await shot(page, pfx(name)).catch(() => {});
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
        await signIn(page, u, {contextPath: ctx}); await idle(page); who = `${u}@${ctx}`;
    };

    // ============================================================ OJS / OPS: the read-only control
    if (!isOMP) {
        if (!on('control')) { await close(); return; }
        if (!S.J) {
            const t = tag('u74k3');
            const isOJS = app.name === 'ojs';
            const FILE = isOJS ? 'article.pdf' : 'preprint.pdf';
            const r = await app.api.createContext({tag: `${t}j`, context: {name: `U74 K3 control ${t}`, contactName: 'K3 Contact', contactEmail: `${t}jc@mail.test`},
                users: [{username: `${t}jmg`, roles: ['manager'], givenName: 'Mona', familyName: 'K3j'}, {username: `${t}jau`, roles: ['author'], givenName: 'Abe', familyName: 'K3j'}]});
            const sub = await app.api.createSubmission({tag: `${t}s`, context: r.path, submitter: `${t}jau`, title: `K3 control ${t}`,
                ...(isOJS ? {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']} : {}), galleys: [{label: 'PDF', file: FILE}]});
            S = {t, J: r.path, mg: `${t}jmg`, sub: {id: sub.submissionId, pub: sub.publicationId}};
            save();
        }
        const o = await safe('control', async () => {
            const o = {};
            await as(S.mg, S.J);
            await page.goto(app.url(`/index.php/${S.J}/dashboard/editorial?workflowSubmissionId=${S.sub.id}&workflowMenuKey=publication_${S.sub.pub}_galleys`));
            await idle(page);
            await page.locator('[data-cy="galley-manager"] button[aria-label="More Actions"]').first().waitFor({timeout: T});
            await idle(page);
            const s0 = await snap('c-01-galleys-page');
            o.pageText = flat(s0.text && s0.text.dialog, 800);
            await page.locator('[data-cy="galley-manager"] button[aria-label="More Actions"]').first().click();
            o.rowMenu = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x));
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await waitTop('form', 2);
            await idle(page); await sleep(500);
            const s2 = await snap('c-02-edit-galley-window');
            o.editWindow = {tabs: (await top().locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim()), text: flat(s2.text && s2.text.dialog, 1500)};
            o.anySalesRightsWords = /Sales Rights|Rest of World|Market Territories|Add Market/.test(`${o.editWindow.text} ${o.pageText}`);
            await loc(page, `${app.name} galley window: tabs`, top().locator('[role=tab]'));
            await top().getByRole('button', {name: 'Close', exact: true}).first().click();
            await waitCount(1);
            return o;
        });
        fact('control', o);
        await close();
        return;
    }

    // ============================================================ OMP: seed
    if (on('seed') && !S.P1) {
        const t = tag('u74k3');
        S.t = t;
        const mk = async (k, extra) => {
            const users = [{username: `${t}${k}mg`, roles: ['manager'], givenName: 'Mona', familyName: `K3${k}`},
                {username: `${t}${k}au`, roles: ['author'], givenName: 'Abe', familyName: `K3${k}`}];
            const r = await app.api.createContext({tag: `${t}${k}`, context: {name: `U74 K3 ${k} ${t}`, acronym: 'K3P', country: 'CA', contactName: 'K3 Contact', contactEmail: `${t}${k}c@mail.test`}, users, ...extra});
            return {path: r.path, id: r.contextId, mg: `${t}${k}mg`, au: `${t}${k}au`};
        };
        S.P1 = await mk('a', {publisher: 'K3 Press Ltd', location: 'Vancouver, Canada', codeType: 'Proprietary (01)', codeValue: 'K3-0001'});
        S.P2 = await mk('b', {publisher: 'K3 Import Press', location: 'Toronto, Canada', codeType: 'Proprietary (01)', codeValue: 'K3-0002'});
        S.P2.onix = true;
        const r = await app.api.createSubmission({tag: `${t}x`, context: S.P1.path, submitter: S.P1.au, title: `K3 book ${t}`,
            files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction'], published: true,
            publicationFormats: [{name: 'Paperback'}, {name: 'Ebook'}, {name: 'Hardback'}]});
        S.A = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats};
        save();
        log('[seed]', JSON.stringify(S));
        note(`ccK3 (${RUN}): scratch presses P1 ${S.P1.path} (ONIX details filled), P2 ${S.P2.path} (import target); book A ${S.A.id}/${S.A.pub} published, formats Paperback, Ebook, Hardback (no file); managers <path>mg`);
    }
    if (!S.P1) { log('no state; run the seed phase'); await close(); return; }
    if (!S.C && (on('seed') || on('bookc'))) {
        const r = await app.api.createSubmission({tag: `${S.t}c`, context: S.P1.path, submitter: S.P1.au, title: `K3 C-book ${S.t}`,
            files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction'],
            publicationFormats: [{name: 'Paperback'}, {name: 'Ebook'}]});
        S.C = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats};
        save();
        note(`ccK3 (${RUN}): book C ${S.C.id}/${S.C.pub} on ${S.P1.path}, unpublished at Production, formats Paperback, Ebook`);
    }

    // ------------------------------------------------------------ helpers: the Publication Formats page and the tab
    const fmtUrl = (P, id, pub) => app.url(`/index.php/${P.path}/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=publication_${pub}_publicationFormats`);
    const wf = () => page.locator(VIS).first();
    async function openFormats(P, id, pub) {
        await page.goto(fmtUrl(P, id, pub)); await idle(page);
        await wf().locator('a').filter({hasText: 'Add publication format'}).first().waitFor({timeout: T});
        await wf().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    }
    const fmtRow = (n) => wf().locator('tr.gridRow').filter({has: page.locator('span.label', {has: page.locator('.onix_code'), hasText: new RegExp(`^\\s*${n}`)})}).first();
    async function openEdit(n) {
        const r = fmtRow(n);
        await r.waitFor({timeout: T});
        const id = await r.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const edit = ctl.getByRole('link', {name: 'Edit', exact: true}).first();
        if (!(await edit.isVisible().catch(() => false))) { await r.locator('a.show_extras').first().click(); await edit.waitFor({state: 'visible', timeout: 10_000}); }
        const n0 = await dialogCount();
        await edit.click();
        await waitTop('[role=tab]', n0 + 1);
        await waitTop('form', n0 + 1);
        await idle(page); await sleep(300);
        return (await top().locator('[role=tab]').allInnerTexts()).map((x) => x.trim());
    }
    const metaForm = () => top().locator('form[id^="publicationMetadataEntryForm-"]');
    async function metaTab() {
        await top().locator('[role=tab]').filter({hasText: /^\s*Metadata\s*$/}).first().click();
        const f = metaForm();
        await f.waitFor({state: 'visible', timeout: T});
        for (const g of ['identificationCodeGridContainer', SR, MK, 'publicationDateGridContainer']) {
            await f.locator(`[id^="${g}"] table`).first().waitFor({timeout: T}).catch(() => {});
        }
        await idle(page); await sleep(300);
        return f;
    }
    /** Open the format's window on its Metadata tab (from the page), returns the tab form. */
    async function openMeta(P, id, pub, fmt) {
        await openFormats(P, id, pub);
        await openEdit(fmt);
        return metaTab();
    }
    const grid = (g) => metaForm().locator(`div[id^="${g}"]`).first();
    /** A list as data: heading, header links with their place, columns, rows (cells text + the ROW cell's markup), the empty line. */
    const readGrid = (g) => grid(g).evaluate((el) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.getClientRects().length);
        const box = (e) => { const r = e.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; };
        const header = el.querySelector('.header');
        const table = el.querySelector('table');
        const rows = [...el.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => ({
            id: tr.id,
            cells: [...tr.querySelectorAll(':scope > td')].map((td) => { const c = td.cloneNode(true); c.querySelectorAll('script').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
            cellHtml: [...tr.querySelectorAll(':scope > td')].map((td) => td.innerHTML.replace(/\s+/g, ' ').trim().slice(0, 300)),
            arrowFirst: !!tr.querySelector('td:first-child a.show_extras'),
        }));
        return {
            heading: t(el.querySelector('.header h4')),
            headerLinks: header ? [...header.querySelectorAll('a')].filter(vis).map((a) => ({text: t(a), box: box(a)})) : [],
            headerBox: header ? box(header) : null,
            headingBox: el.querySelector('.header h4') ? box(el.querySelector('.header h4')) : null,
            tableBox: table ? box(table) : null,
            columns: [...el.querySelectorAll('thead th')].map(t),
            rows,
            empty: [...el.querySelectorAll('tbody.empty')].filter(vis).map(t),
        };
    });
    const readWindow = (formSel) => top().evaluate((d, formSel) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.getClientRects().length);
        const form = d.querySelector(formSel);
        const fields = [...form.querySelectorAll('select, input:not([type=hidden]), textarea')].map((e) => {
            const lab = e.id ? d.querySelector(`label[for="${e.id}"]`) : null;
            const sec = e.closest('.section, fieldset');
            const o = {name: e.name, type: e.type, visible: vis(e), label: t(lab), sectionLabel: sec ? t(sec.querySelector('legend, label')) : null,
                required: e.required || e.classList.contains('required') || e.getAttribute('aria-required') === 'true', multiple: !!e.multiple};
            if (e.tagName === 'SELECT') {
                const opts = [...e.options];
                o.count = opts.length; o.hasEmpty = opts.some((x) => x.value === '');
                o.selected = [...e.selectedOptions].map((x) => `${x.value}|${x.text.trim()}`);
                o.first = opts.slice(0, 3).map((x) => `${x.value}|${x.text.trim()}`);
                o.last = opts.slice(-3).map((x) => `${x.value}|${x.text.trim()}`);
                if (opts.length <= 20) o.options = opts.map((x) => `${x.value}|${x.text.trim()}`);
                o.hasWorld = opts.some((x) => x.value === 'WORLD'); o.worldLabel = (opts.find((x) => x.value === 'WORLD') || {}).text || null;
            } else if (e.type === 'checkbox') o.checked = e.checked; else o.value = e.value;
            return o;
        });
        const clone = form.cloneNode(true);
        clone.querySelectorAll('option, script').forEach((e) => e.remove());
        return {title: t(d.querySelector('h1, h2')), words: clone.textContent.replace(/\s+/g, ' ').trim().slice(0, 2500), fields,
            buttons: [...d.querySelectorAll('button, a')].filter(vis).map(t).filter(Boolean),
            errors: [...d.querySelectorAll('label.error, .pkp_form_error, .pkp_form_error_list, .error')].filter(vis).map(t).filter(Boolean)};
    }, formSel);
    async function openAdd(g, linkName, formSel) {
        const n0 = await dialogCount();
        await grid(g).locator('.header a').filter({hasText: new RegExp(`^\\s*${linkName}\\s*$`)}).first().click();
        await waitTop(formSel, n0 + 1);
        await idle(page); await sleep(400);
        return readWindow(formSel);
    }
    /** Press the nested window's "OK": the answer, whether it closed, notices and errors. */
    async function subOK(formSel, opRe) {
        const t0 = Date.now();
        const n0 = await dialogCount();
        const resp = page.waitForResponse((r) => opRe.test(r.url()) && r.request().method() === 'POST', {timeout: 15_000}).catch(() => null);
        await top().locator(formSel).getByRole('button', {name: 'OK', exact: true}).first().click();
        const r = await resp;
        await idle(page); await sleep(900);
        const closed = await waitCount(n0 - 1);
        const o = {answer: r ? r.status() : 'no request', closed, notices: noticesSince(t0), dialogs: dlgSince(t0), posts: since(t0).filter((p) => p.method !== 'GET')};
        if (!closed) { o.window = await readWindow(formSel).catch(() => null); }
        return o;
    }
    async function subCancel(formSel) {
        const t0 = Date.now();
        const n0 = await dialogCount();
        await top().locator(formSel).getByRole('link', {name: 'Cancel', exact: true}).first().click();
        const closed = await waitCount(n0 - 1);
        await sleep(700);
        return {closed, dialogs: dlgSince(t0)};
    }
    async function rowAction(g, rowText, action) {
        const row = grid(g).locator('tr.gridRow').filter({hasText: rowText}).first();
        const id = await row.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const a = ctl.getByRole('link', {name: action, exact: true}).first();
        if (!(await a.isVisible().catch(() => false))) { await row.locator('a.show_extras').first().click(); await a.waitFor({state: 'visible', timeout: 10_000}); }
        const links = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim()).filter(Boolean));
        await a.click();
        return links;
    }
    async function answerDelete(answer) {
        const t0 = Date.now();
        const q = page.locator('[role=dialog]:visible, [role=alertdialog]:visible').filter({hasText: /Are you sure|delete/i}).last();
        await q.waitFor({timeout: 15_000});
        await sleep(300);
        const text = flat(await q.innerText().catch(() => null), 400);
        const buttons = (await q.locator('button').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
        await snap(`delete-question-${answer}`);
        await q.getByRole('button', {name: answer, exact: true}).first().click();
        await idle(page); await sleep(1200);
        return {text, buttons, notices: noticesSince(t0), posts: since(t0).filter((p) => p.method !== 'GET')};
    }
    async function closeFormatWindow() {
        const n0 = await dialogCount();
        const t0 = Date.now();
        await top().getByRole('button', {name: 'Close', exact: true}).first().click();
        const closed = await waitCount(n0 - 1);
        await sleep(700);
        return {closed, dialogs: dlgSince(t0)};
    }
    const typeLabel = (code) => top().locator(`${SRFORM} select[name="type"] option[value="${code}"]`).first().innerText().catch(() => null);
    async function addRights(spec) {
        const w = await openAdd(SR, 'Add Sales Rights', SRFORM);
        const f = top().locator(SRFORM);
        if (spec.type) await f.locator('select[name="type"]').selectOption(spec.type);
        if (spec.row) await f.locator('input[name="ROWSetting"]').check();
        if (spec.ci) await f.locator('select[name="countriesIncluded[]"]').selectOption(spec.ci);
        if (spec.ce) await f.locator('select[name="countriesExcluded[]"]').selectOption(spec.ce);
        if (spec.ri) await f.locator('select[name="regionsIncluded[]"]').selectOption(spec.ri);
        if (spec.re) await f.locator('select[name="regionsExcluded[]"]').selectOption(spec.re);
        const chosen = await f.locator('select[name="type"]').evaluate((s) => `${s.value}|${s.selectedOptions[0] ? s.selectedOptions[0].text.trim() : ''}`);
        if (spec.shotBefore) await snap(spec.shotBefore);
        const ok = await subOK(SRFORM, /sales-rights-grid\/update-rights|updateRights/);
        return {window: {typeOptions: (w.fields.find((x) => x.name === 'type') || {}).options, typeSelected: (w.fields.find((x) => x.name === 'type') || {}).selected}, chosen, ok};
    }
    const B = () => S.A;

    // ============================================================ list: the tab on arrival, the list empty
    if (on('list')) {
        const o = await safe('list', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openFormats(S.P1, B().id, B().pub);
            o.tabs = await openEdit('Paperback');
            await metaTab();
            await snap('l-01-metadata-tab-paperback');
            o.salesRights = await readGrid(SR);
            o.markets = await readGrid(MK);
            o.tabOrder = await metaForm().evaluate((f) => [...f.querySelectorAll('div[id*="GridContainer"] .header h4')].map((h) => h.innerText.trim()));
            await loc(page, 'Metadata tab: the "Sales Rights" list', grid(SR));
            await loc(page, 'Sales Rights: "Add Sales Rights" (header link)', grid(SR).locator('.header a').filter({hasText: /^\s*Add Sales Rights\s*$/}));
            await loc(page, 'Sales Rights: "No Items"', grid(SR).locator('tbody.empty:visible'));
            await closeFormatWindow();
            return o;
        });
        fact('list', o);
    }

    // ============================================================ window: "Add Sales Rights" as it arrives; Cancel with a change
    if (on('window')) {
        const o = await safe('window', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, B().id, B().pub, 'Paperback');
            o.arrival = await openAdd(SR, 'Add Sales Rights', SRFORM);
            await snap('w-01-add-sales-rights-window');
            o.rowTip = await top().locator(SRFORM).evaluate((f) => {
                const cb = f.querySelector('input[name="ROWSetting"]');
                const sec = cb && cb.closest('.section');
                return sec ? sec.innerText.replace(/[ \t]+/g, ' ').trim() : null;
            });
            o.rowTipRaw = await top().locator(SRFORM).evaluate((f) => { const cb = f.querySelector('input[name="ROWSetting"]'); const sec = cb && cb.closest('.section'); return sec ? sec.textContent : null; });
            o.requiredNote = await top().locator(SRFORM).getByText(/Required fields are marked/).allInnerTexts().catch(() => []);
            await loc(page, 'Sales-rights window: the form', top().locator(SRFORM));
            await loc(page, 'Sales-rights window: "Sales Rights Type" list', top().locator(SRFORM).locator('select[name="type"]'));
            await loc(page, 'Sales-rights window: "Rest of World?" box', top().locator(SRFORM).locator('input[name="ROWSetting"]'));
            await loc(page, 'Sales-rights window: Countries "Included"', top().locator(SRFORM).locator('select[name="countriesIncluded[]"]'));
            await loc(page, 'Sales-rights window: Regions "Excluded"', top().locator(SRFORM).locator('select[name="regionsExcluded[]"]'));
            await loc(page, 'Sales-rights window: "OK"', top().locator(SRFORM).getByRole('button', {name: 'OK', exact: true}));
            await loc(page, 'Sales-rights window: "Cancel" (a link)', top().locator(SRFORM).getByRole('link', {name: 'Cancel', exact: true}));
            // several countries chosen at once (the "several can be chosen" claim), then leave with the change unsaved
            await top().locator(SRFORM).locator('select[name="countriesIncluded[]"]').selectOption(['CA', 'US', 'MX']);
            await top().locator(SRFORM).locator('select[name="regionsIncluded[]"]').selectOption(['WORLD']);
            o.multiChosen = await top().locator(SRFORM).locator('select[name="countriesIncluded[]"]').evaluate((s) => [...s.selectedOptions].map((x) => x.text.trim()));
            await top().locator(SRFORM).locator('select[name="countriesIncluded[]"]').blur();
            policy = 'dismiss';
            o.cancelWithChangeDismiss = await subCancel(SRFORM);
            o.afterDismissStillOpen = await top().locator(SRFORM).count();
            if (o.afterDismissStillOpen) {
                await snap('w-02-cancel-dismissed');
                policy = 'accept';
                o.cancelWithChangeAccept = await subCancel(SRFORM);
                policy = 'dismiss';
            }
            o.listAfterCancel = await readGrid(SR);
            // the window's own close arrow
            await openAdd(SR, 'Add Sales Rights', SRFORM);
            await top().locator(SRFORM).locator('select[name="countriesIncluded[]"]').selectOption(['CA']);
            await top().locator(SRFORM).locator('select[name="countriesIncluded[]"]').blur();
            const t0 = Date.now(); const n0 = await dialogCount();
            await top().getByRole('button', {name: 'Close', exact: true}).first().click();
            o.closeArrow = {closed: await waitCount(n0 - 1), dialogs: dlgSince(t0)};
            await sleep(700);
            if (!o.closeArrow.closed) { policy = 'accept'; await top().getByRole('button', {name: 'Close', exact: true}).first().click(); await waitCount(n0 - 1); policy = 'dismiss'; }
            o.listAfterClose = await readGrid(SR);
            await closeFormatWindow();
            return o;
        });
        fact('window', o);
    }

    // ============================================================ row: add the ROW entry with Canada (td14, td15), its row, its Edit
    if (on('row')) {
        const o = await safe('row', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, B().id, B().pub, 'Paperback');
            o.add1 = await addRights({row: true, ci: ['CA'], shotBefore: 'r-01-first-entry-row-canada-filled'});
            await snap('r-02-list-after-first-add');
            o.list1 = await readGrid(SR);
            // the row's arrow and Edit
            const rowText = o.add1.chosen.split('|')[1];
            S.E1 = rowText; save();
            o.arrowEntries = await rowAction(SR, rowText, 'Edit');
            await waitTop(SRFORM, 3);
            await idle(page); await sleep(400);
            o.edit = await readWindow(SRFORM);
            await snap('r-03-edit-window-first-entry');
            await loc(page, 'Sales Rights: a row\'s arrow', grid(SR).locator('tr.gridRow a.show_extras').first());
            o.editOK = await subOK(SRFORM, /sales-rights-grid\/update-rights|updateRights/);
            o.list1b = await readGrid(SR);
            // reload and read again
            await closeFormatWindow();
            await page.reload(); await idle(page);
            await wf().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await openEdit('Paperback'); await metaTab();
            await snap('r-04-after-reload');
            o.listReload = await readGrid(SR);
            await rowAction(SR, rowText, 'Edit');
            await waitTop(SRFORM, 3); await idle(page); await sleep(400);
            o.editAfterReload = await readWindow(SRFORM);
            await subCancel(SRFORM);
            // a second "Add Sales Rights": is the used type offered, which is preselected
            o.secondAdd = await openAdd(SR, 'Add Sales Rights', SRFORM);
            await snap('r-05-second-add-window');
            await subCancel(SRFORM);
            await closeFormatWindow();
            return o;
        });
        fact('row', o);
    }

    // ============================================================ refuse: a second ROW entry (Rule 11), then an entry with no territory (Rule 12)
    if (on('refuse')) {
        const o = await safe('refuse', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, B().id, B().pub, 'Paperback');
            o.before = await readGrid(SR);
            // second ROW, with nothing else
            const w = await openAdd(SR, 'Add Sales Rights', SRFORM);
            o.offered = (w.fields.find((x) => x.name === 'type') || {}).options;
            await top().locator(SRFORM).locator('input[name="ROWSetting"]').check();
            o.secondRow = await subOK(SRFORM, /sales-rights-grid\/update-rights|updateRights/);
            await snap('f-01-second-row-refused');
            o.secondRowErrorPlace = await top().locator(SRFORM).evaluate((f) => [...f.querySelectorAll('.pkp_form_error, .pkp_form_error_list, label.error, .error')].filter((e) => e.getClientRects().length).map((e) => ({tag: e.tagName, cls: e.className, text: e.innerText.replace(/\s+/g, ' ').trim(), top: Math.round(e.getBoundingClientRect().y - f.getBoundingClientRect().y)}))).catch(() => null);
            o.secondRowStillTicked = await top().locator(SRFORM).locator('input[name="ROWSetting"]').isChecked().catch(() => null);
            if (!o.secondRow.closed) await subCancel(SRFORM);
            o.afterRefusal = await readGrid(SR);
            // second ROW with a country chosen (the other end of the territory axis): refused alike?
            await openAdd(SR, 'Add Sales Rights', SRFORM);
            await top().locator(SRFORM).locator('input[name="ROWSetting"]').check();
            await top().locator(SRFORM).locator('select[name="countriesIncluded[]"]').selectOption(['US']);
            o.secondRowWithCountry = await subOK(SRFORM, /sales-rights-grid\/update-rights|updateRights/);
            if (!o.secondRowWithCountry.closed) await subCancel(SRFORM);
            // Rule 12: no ROW, no country, no region
            o.noTerritory = await addRights({shotBefore: 'f-02-no-territory-filled'});
            S.E2 = o.noTerritory.chosen.split('|')[1]; save();
            await snap('f-03-after-no-territory');
            o.afterNoTerritory = await readGrid(SR);
            await closeFormatWindow();
            await page.reload(); await idle(page);
            await wf().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await openEdit('Paperback'); await metaTab();
            o.afterReload = await readGrid(SR);
            await closeFormatWindow();
            return o;
        });
        fact('refuse', o);
    }

    // ============================================================ delete: add a third entry (US), delete it; and Cancel on the question
    if (on('delete')) {
        const o = await safe('delete', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, B().id, B().pub, 'Paperback');
            o.add3 = await addRights({ci: ['US']});
            const txt = o.add3.chosen.split('|')[1];
            o.withThird = await readGrid(SR);
            await rowAction(SR, txt, 'Delete');
            o.cancelQ = await answerDelete('Cancel');
            o.afterCancel = await readGrid(SR);
            await rowAction(SR, txt, 'Delete');
            o.okQ = await answerDelete('OK');
            await snap('d-01-after-delete');
            o.afterDelete = await readGrid(SR);
            // after the delete, is the freed type offered again
            const w = await openAdd(SR, 'Add Sales Rights', SRFORM);
            o.offeredAfterDelete = (w.fields.find((x) => x.name === 'type') || {}).options;
            await subCancel(SRFORM);
            await closeFormatWindow();
            return o;
        });
        fact('delete', o);
    }

    // ============================================================ perfmt: the other formats' lists stay empty; tab's Cancel right after an add
    if (on('perfmt')) {
        const o = await safe('perfmt', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, B().id, B().pub, 'Ebook');
            await snap('p-01-ebook-metadata');
            o.ebook = {salesRights: await readGrid(SR), markets: await readGrid(MK)};
            const w = await openAdd(SR, 'Add Sales Rights', SRFORM);
            o.ebookOffered = (w.fields.find((x) => x.name === 'type') || {}).options;
            await subCancel(SRFORM);
            // add on Ebook, then the tab's own "Cancel" at once
            o.ebookAdd = await addRights({ci: ['FR']});
            const t0 = Date.now(); const n0 = await dialogCount();
            await metaForm().getByRole('link', {name: 'Cancel', exact: true}).first().click();
            o.tabCancel = {closed: await waitCount(n0 - 1), dialogs: dlgSince(t0)};
            await sleep(700);
            if (!o.tabCancel.closed) await closeFormatWindow();
            await openEdit('Ebook'); await metaTab();
            await snap('p-02-ebook-reopened-after-tab-cancel');
            o.ebookReopened = await readGrid(SR);
            await closeFormatWindow();
            await openEdit('Paperback'); await metaTab();
            o.paperback = await readGrid(SR);
            await closeFormatWindow();
            return o;
        });
        fact('perfmt', o);
    }

    // ============================================================ leave: the tab left once with an unsaved change
    if (on('leave')) {
        const o = await safe('leave', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, B().id, B().pub, 'Hardback');
            const f = metaForm();
            o.imprintBefore = await f.locator('input[name="imprint"]').inputValue().catch(() => null);
            await f.locator('input[name="imprint"]').fill('K3 unsaved imprint');
            await f.locator('input[name="imprint"]').blur();
            // switch to the "Edit" tab
            policy = 'dismiss';
            let t0 = Date.now();
            await top().locator('[role=tab]').filter({hasText: /^\s*Edit\s*$/}).first().click();
            await idle(page); await sleep(800);
            o.toEditTab = {dialogs: dlgSince(t0), selected: flat(await top().locator('[role=tab][aria-selected="true"]').first().innerText().catch(() => null), 40)};
            await snap('v-01-after-edit-tab-with-change');
            // back to Metadata: is the typed imprint still there
            await metaTab();
            o.imprintBack = await metaForm().locator('input[name="imprint"]').inputValue().catch(() => null);
            await metaForm().locator('input[name="imprint"]').fill('K3 unsaved imprint');
            await metaForm().locator('input[name="imprint"]').blur();
            // add a sales-rights row while the change is unsaved
            o.addWhileDirty = await addRights({ci: ['DE']});
            o.imprintAfterAdd = await metaForm().locator('input[name="imprint"]').inputValue().catch(() => null);
            // now the close arrow, dismissing first, then accepting
            policy = 'dismiss';
            t0 = Date.now(); const n0 = await dialogCount();
            await top().getByRole('button', {name: 'Close', exact: true}).first().click();
            await sleep(900);
            o.closeDismiss = {closed: await waitCount(n0 - 1), dialogs: dlgSince(t0)};
            if (!o.closeDismiss.closed) {
                await snap('v-02-close-dismissed');
                policy = 'accept'; t0 = Date.now();
                await top().getByRole('button', {name: 'Close', exact: true}).first().click();
                o.closeAccept = {closed: await waitCount(n0 - 1), dialogs: dlgSince(t0)};
                policy = 'dismiss';
                await sleep(700);
            }
            await openEdit('Hardback'); await metaTab();
            o.reopened = {imprint: await metaForm().locator('input[name="imprint"]').inputValue().catch(() => null), salesRights: await readGrid(SR)};
            await snap('v-03-hardback-reopened');
            await closeFormatWindow();
            return o;
        });
        fact('leave', o);
    }

    // ============================================================ alltypes: use every type on Hardback, then "Add Sales Rights" once more
    if (on('alltypes')) {
        const o = await safe('alltypes', async () => {
            const o = {adds: []};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, B().id, B().pub, 'Hardback');
            for (let i = 0; i < 12; i++) {
                const w = await openAdd(SR, 'Add Sales Rights', SRFORM);
                const tf = w.fields.find((x) => x.name === 'type') || {};
                if (!tf.count) {
                    o.emptyWindow = w;
                    await snap('a-01-add-with-no-type-left');
                    o.okWithNoType = await subOK(SRFORM, /sales-rights-grid\/update-rights|updateRights/);
                    await snap('a-02-ok-with-no-type-left');
                    if (!o.okWithNoType.closed) await subCancel(SRFORM);
                    break;
                }
                o.adds.push({offered: tf.count, selected: tf.selected});
                const r = await subOK(SRFORM, /sales-rights-grid\/update-rights|updateRights/);
                o.adds[o.adds.length - 1].ok = {answer: r.answer, closed: r.closed, notices: r.notices};
                if (!r.closed) { await subCancel(SRFORM); break; }
            }
            o.final = await readGrid(SR);
            await closeFormatWindow();
            return o;
        });
        fact('alltypes', o);
    }

    // ============================================================ markets: the notices of add, edit, delete (Rule 9's market half)
    if (on('markets')) {
        const o = await safe('markets', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, B().id, B().pub, 'Ebook');
            o.window = await openAdd(MK, 'Add Market', MKFORM);
            const f = top().locator(MKFORM);
            await f.locator('input[name="date"]').fill('20240305');
            await f.locator('input[name="price"]').fill('19');
            await f.locator('select[name="countriesIncluded[]"]').selectOption(['CA']);
            o.add = await subOK(MKFORM, /markets-grid\/update-market|updateMarket/);
            o.list = await readGrid(MK);
            const rowText = 'Included: CA';
            await rowAction(MK, rowText, 'Edit');
            await waitTop(MKFORM, 3); await idle(page); await sleep(400);
            o.edit = await subOK(MKFORM, /markets-grid\/update-market|updateMarket/);
            await rowAction(MK, rowText, 'Delete');
            o.del = await answerDelete('OK');
            o.after = await readGrid(MK);
            await snap('m-01-after-market-delete');
            await closeFormatWindow();
            return o;
        });
        fact('markets', o);
    }

    // ============================================================ version: a new version's formats have their own lists
    if (on('version')) {
        const o = await safe('version', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            if (!S.pub2) {
                await openFormats(S.P1, B().id, B().pub);
                const {WorkflowPage} = require(path.resolve(__dirname, '../../../pages/WorkflowPage.js'));
                const w = new WorkflowPage(page, null);
                const item = await w.revealPublicationEntry('Create New Version');
                await w.expectVersionLoaded();
                await item.click();
                const dlg = page.getByRole('dialog', {name: 'Create New Version'});
                await dlg.getByLabel('Publication Stage').waitFor({timeout: T});
                const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
                const resp = await created;
                o.created = resp.status();
                S.pub2 = (await resp.json().catch(() => ({}))).id; save();
                await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
                await idle(page);
            }
            o.pub2 = S.pub2;
            await openMeta(S.P1, B().id, S.pub2, 'Paperback');
            await snap('n-01-new-version-paperback');
            o.v2Before = await readGrid(SR);
            o.v2Markets = await readGrid(MK);
            o.v2Add = await addRights({ci: ['JP']});
            o.v2After = await readGrid(SR);
            await closeFormatWindow();
            await openMeta(S.P1, B().id, B().pub, 'Paperback');
            await snap('n-02-first-version-paperback');
            o.v1 = await readGrid(SR);
            await closeFormatWindow();
            return o;
        });
        fact('version', o);
    }

    // ============================================================ blank: the country and region lists' empty first line, chosen alone
    if (on('blank')) {
        const o = await safe('blank', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, B().id, B().pub, 'Ebook');
            o.add = await addRights({ci: [''], ri: [''], shotBefore: 'b-01-blank-lines-chosen'});
            o.list = await readGrid(SR);
            const txt = o.add.chosen.split('|')[1];
            await rowAction(SR, txt, 'Edit');
            await waitTop(SRFORM, 3); await idle(page); await sleep(400);
            const w = await readWindow(SRFORM);
            o.edit = w.fields.filter((x) => x.multiple).map((x) => ({name: x.name, selected: x.selected}));
            await snap('b-02-blank-entry-edit');
            await subCancel(SRFORM);
            await closeFormatWindow();
            return o;
        });
        fact('blank', o);
    }

    // ------------------------------------------------------------ Native XML export on screen (Tools › Native XML Plugin › Export)
    const readXml = (xml) => {
        const products = [...xml.matchAll(/<(?:onix:)?Product[\s>][\s\S]*?<\/(?:onix:)?Product>/g)].map((m) => m[0]);
        return products.map((p) => ({
            productId: flat((p.match(/<(?:onix:)?RecordReference>([\s\S]*?)<\//) || [])[1], 120),
            form: flat((p.match(/<(?:onix:)?ProductForm>([\s\S]*?)<\//) || [])[1], 20),
            salesRights: [...p.matchAll(/<(?:onix:)?SalesRights>[\s\S]*?<\/(?:onix:)?SalesRights>/g)].map((m) => flat(m[0], 600)),
            rowType: [...p.matchAll(/<(?:onix:)?ROWSalesRightsType>[\s\S]*?<\/(?:onix:)?ROWSalesRightsType>/g)].map((m) => flat(m[0], 200)),
            rowTypeParent: (() => { const i = p.search(/<(?:onix:)?ROWSalesRightsType>/); if (i < 0) return null; const before = p.slice(0, i); const opens = [...before.matchAll(/<((?:onix:)?[A-Za-z]+)[ >]/g)].map((m) => m[1]); const closes = [...before.matchAll(/<\/((?:onix:)?[A-Za-z]+)>/g)].map((m) => m[1]); const stack = []; let ci = 0; const all = [...before.matchAll(/<(\/?)((?:onix:)?[A-Za-z]+)[^>]*?(\/?)>/g)]; for (const m of all) { if (m[1]) stack.pop(); else if (!m[3]) stack.push(m[2]); } return stack.slice(-2).join(' > '); })(),
        }));
    };
    async function nativeExport(P, words, name) {
        const r = {};
        await page.goto(app.url(`/index.php/${P.path}/management/importexport/plugin/NativeImportExportPlugin`)); await idle(page);
        await page.getByRole('tab', {name: 'Export', exact: true}).first().click();
        const et = page.locator('#exportSubmissions-tab');
        await et.locator('.listPanel__item').first().waitFor({timeout: T});
        await idle(page); await sleep(500);
        const items = et.locator('.listPanel__item');
        r.items = [];
        for (let i = 0; i < await items.count(); i++) {
            const it = items.nth(i);
            const txt = flat(await it.innerText(), 200);
            r.items.push(txt);
            if (words.some((w) => txt.includes(w))) await it.locator('input[type=checkbox]').check();
        }
        const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
        const t0 = Date.now();
        await et.getByRole('button', {name: 'Export Submissions', exact: true}).click();
        for (let i = 0; i < 60; i++) { await sleep(500); if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) break; }
        await idle(page); await sleep(1000);
        const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
        await panel.getByText(/Download Exported File|failed|error/i).first().waitFor({timeout: 60_000}).catch(() => {});
        await snap(name);
        r.results = flat(await panel.innerText().catch(() => null), 1500);
        r.posts = since(t0).filter((p) => p.status >= 400).slice(0, 5);
        const b = panel.getByRole('button', {name: 'Download Exported File'});
        if (await b.count()) {
            const dl = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
            await b.first().click();
            const d = await dl;
            if (d) {
                const xml = fs.readFileSync(await d.path(), 'utf8');
                const file = path.join(outDir(), `${RUN}-${name}-${app.name}.xml`);
                fs.writeFileSync(file, xml);
                r.file = file; r.products = readXml(xml);
            } else r.download = 'none';
        }
        return r;
    }

    // ============================================================ bookc: C's Paperback gets the ROW entry with Canada and an entry with the US
    if (on('bookc') && S.C && !S.C.rows) {
        const o = await safe('bookc', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, S.C.id, S.C.pub, 'Paperback');
            o.e1 = await addRights({type: '01', row: true, ci: ['CA']});
            o.e2 = await addRights({type: '02', ci: ['US'], re: ['WORLD']});
            o.list = await readGrid(SR);
            await snap('c-01-book-c-paperback');
            await closeFormatWindow();
            S.C.rows = true; save();
            return o;
        });
        fact('bookc', o);
    }

    // ============================================================ rowmsg: when and where the second-ROW refusal shows (Rule 11)
    if (on('rowmsg') && S.C) {
        const o = await safe('rowmsg', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, S.C.id, S.C.pub, 'Paperback');
            const n0 = notices.length;
            await openAdd(SR, 'Add Sales Rights', SRFORM);
            await top().locator(SRFORM).locator('input[name="ROWSetting"]').check();
            o.refused = await subOK(SRFORM, /sales-rights-grid\/update-rights|updateRights/);
            await sleep(4000);
            o.windowAfter4s = await readWindow(SRFORM).catch(() => null);
            o.notesInWindow = await top().locator(SRFORM).getByText(/Required fields are marked/).count().catch(() => null);
            o.noticesAfter4s = notices.slice(n0).map((n) => n.text);
            o.toastsOnScreen = (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((x) => flat(x));
            await snap('g-01-refused-after-4s');
            o.cancel = await subCancel(SRFORM);
            await sleep(3000);
            o.noticesAfterCancel = notices.slice(n0).map((n) => n.text);
            o.list = await readGrid(SR);
            await snap('g-02-after-cancel');
            await closeFormatWindow();
            await sleep(2000);
            o.noticesAfterClose = notices.slice(n0).map((n) => n.text);
            await page.reload(); await idle(page); await sleep(3000);
            o.noticesAfterReload = notices.slice(n0).map((n) => n.text);
            await snap('g-03-after-reload');
            // the next successful save on any list
            await openEdit('Ebook'); await metaTab();
            const k = notices.length;
            o.nextAdd = await addRights({ci: ['GB']});
            o.noticesWithNextAdd = notices.slice(k).map((n) => n.text);
            await snap('g-04-next-add');
            await rowAction(SR, o.nextAdd.chosen.split('|')[1], 'Delete');
            await answerDelete('OK');
            await closeFormatWindow();
            return o;
        });
        fact('rowmsg', o);
    }

    // ============================================================ leave2: a change on the tab, the close arrow before and after a list save
    if (on('leave2') && S.C) {
        const o = await safe('leave2', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openMeta(S.P1, S.C.id, S.C.pub, 'Ebook');
            await metaForm().locator('input[name="imprint"]').fill('K3 unsaved imprint 2');
            await metaForm().locator('input[name="imprint"]').blur();
            policy = 'dismiss';
            let t0 = Date.now(); const n0 = await dialogCount();
            await top().getByRole('button', {name: 'Close', exact: true}).first().click();
            await sleep(900);
            o.closeBeforeAdd = {closed: await waitCount(n0 - 1), dialogs: dlgSince(t0)};
            if (o.closeBeforeAdd.closed) { await openEdit('Ebook'); await metaTab(); await metaForm().locator('input[name="imprint"]').fill('K3 unsaved imprint 2'); await metaForm().locator('input[name="imprint"]').blur(); }
            o.add = await addRights({ci: ['IE']});
            o.imprintAfterAdd = await metaForm().locator('input[name="imprint"]').inputValue().catch(() => null);
            t0 = Date.now();
            await top().getByRole('button', {name: 'Close', exact: true}).first().click();
            await sleep(900);
            o.closeAfterAdd = {closed: await waitCount(n0 - 1), dialogs: dlgSince(t0)};
            await snap('h-01-after-close-after-add');
            if (!o.closeAfterAdd.closed) { policy = 'accept'; await top().getByRole('button', {name: 'Close', exact: true}).first().click(); await waitCount(n0 - 1); policy = 'dismiss'; await sleep(700); }
            await openEdit('Ebook'); await metaTab();
            o.reopenedImprint = await metaForm().locator('input[name="imprint"]').inputValue().catch(() => null);
            await rowAction(SR, o.add.chosen.split('|')[1], 'Delete');
            await answerDelete('OK');
            await closeFormatWindow();
            return o;
        });
        fact('leave2', o);
    }

    // ============================================================ export: book C (Rule 11's "left out"), C with a no-territory entry and book A (A7)
    if (on('export')) {
        const o = await safe('export', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            if (S.C) {
                o.c = await nativeExport(S.P1, ['K3 C-book'], 'x-01-native-export-book-c');
                if (o.c.file) { S.exportFile = o.c.file; save(); }
                await openMeta(S.P1, S.C.id, S.C.pub, 'Paperback');
                o.cEmpty = await addRights({type: '06'});
                await closeFormatWindow();
                o.cWithEmpty = await nativeExport(S.P1, ['K3 C-book'], 'x-02-native-export-book-c-with-empty-entry');
                await openMeta(S.P1, S.C.id, S.C.pub, 'Paperback');
                await rowAction(SR, o.cEmpty.chosen.split('|')[1], 'Delete');
                o.cEmptyDeleted = await answerDelete('OK');
                await closeFormatWindow();
            }
            o.a = await nativeExport(S.P1, ['K3 book '], 'x-03-native-export-book-a');
            return o;
        });
        fact('export', o);
    }

    // ============================================================ import: the file into P2, the imported format's sales rights (A11)
    if (on('import') && S.exportFile) {
        const o = await safe('import', async () => {
            const o = {};
            await as(S.P2.mg, S.P2.path);
            if (!S.imported) {
            await page.goto(app.url(`/index.php/${S.P2.path}/management/importexport/plugin/NativeImportExportPlugin`)); await idle(page);
            await page.getByRole('tab', {name: 'Import', exact: true}).first().click(); await sleep(400);
            const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: 30_000}).catch(() => null);
            await page.locator('#importXmlForm input[type=file]').first().setInputFiles(S.exportFile);
            const ur = await up;
            o.upload = ur ? ur.status() : 'no request';
            await page.waitForFunction(() => (document.querySelector('#importXmlForm input[name=temporaryFileId]') || {}).value, null, {timeout: 20_000}).catch(() => {});
            await idle(page);
            const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
            const t0 = Date.now();
            await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
            for (let i = 0; i < 90; i++) {
                await sleep(500);
                if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) {
                    const txt = await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => '');
                    if (/completed|failed|error|warning|imported/i.test(txt)) break;
                }
            }
            await idle(page); await sleep(800);
            await snap('i-01-import-result');
            o.result = flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 1500);
            o.importErrors = since(t0).filter((p) => p.status >= 400);
            S.imported = true; save();
            }
            // the imported book: ids read from the rows (locating it only)
            const ids = sql(`select s.submission_id||'|'||s.current_publication_id from submissions s where s.context_id=${S.P2.id} order by s.submission_id desc limit 1`);
            o.ids = ids;
            const [sid, cur] = ids.split('|').map(Number);
            const pubs = sql(`select publication_id||'|'||status from publications where submission_id=${sid} order by publication_id`).split('\n');
            o.pubs = pubs;
            if (!sid) return o;
            const firstPub = Number(pubs[0].split('|')[0]);
            S.imp = {id: sid, cur, first: firstPub}; save();
            if (!S.impRead) {
            await openMeta(S.P2, sid, firstPub, 'Paperback');
            await snap('i-02-imported-paperback-first-version');
            o.list = await readGrid(SR);
            o.edits = [];
            for (const row of o.list.rows) {
                const txt = row.cells[0].replace(/^Settings\s*/, '');
                await rowAction(SR, txt, 'Edit');
                await waitTop(SRFORM, 3); await idle(page); await sleep(400);
                const w = await readWindow(SRFORM);
                o.edits.push({row: txt, fields: w.fields.map((x) => ({name: x.name, checked: x.checked, selected: x.selected}))});
                await subCancel(SRFORM);
            }
            await snap('i-03-imported-edit-read');
            await closeFormatWindow();
            // the imported book's export as imported: does the product name a rest-of-world type
            if (S.P2.onix) o.reexport = await nativeExport(S.P2, ['K3 C-book'], 'i-04-native-export-imported');
            // a second "Rest of World?" entry on the imported format
            await openMeta(S.P2, sid, firstPub, 'Paperback');
            o.secondRow = await addRights({row: true});
            o.after = await readGrid(SR);
            await closeFormatWindow();
            S.impRead = true; save();
            }
            // the press's four ONIX details, typed on Settings › Press › "Masthead" when the seed left them out
            if (!S.P2.onix) {
                await page.goto(app.url(`/index.php/${S.P2.path}/management/settings/context`)); await idle(page);
                await page.getByRole('tab', {name: 'Masthead'}).click();
                const form = page.locator('form').filter({has: page.locator('input[name="publisher"]')});
                await form.locator('input[name="publisher"]').waitFor({timeout: T});
                await form.locator('input[name="publisher"]').fill('K3 Import Press');
                await form.locator('input[name="location"]').fill('Toronto, Canada');
                await form.locator('select[name="codeType"]').selectOption({label: 'Proprietary (01)'});
                await form.locator('input[name="codeValue"]').fill('K3-0002');
                const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                o.p2onixSave = (await saved).status();
                await idle(page);
                S.P2.onix = true; save();
            }
            // the export after the second "Rest of World?" entry
            o.reexport2 = await nativeExport(S.P2, ['K3 C-book'], 'i-05-native-export-imported-after-second-row');
            return o;
        });
        fact('import', o);
    }

    await close();
});
