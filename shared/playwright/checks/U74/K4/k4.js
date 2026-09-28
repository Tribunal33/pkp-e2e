// U74 claim check K4 — a format's "Metadata" tab › "Market Territories" and the market window {OMP}, new versions,
// with read-only galley-window controls on OJS and OPS.
// Spec: docs/specs/U74-onix-metadata-export.md — Fields 128–155 (the list, the window); Rules 13–15 (240–258);
// register A4–A6 (531–557), A8 (572–581); footnotes g, h, td8, td9, td10, td16, td17, f-a4, f-a5, f-a6, f-a8.
//
// Run: RUN=r1 PROBE_FEATURE=U74 PROBE_AGENT=ccK4 node bin/probe.js all shared/playwright/checks/U74/K4/k4.js
//      RUN=r2 …  (a second, independent run: its own scratch presses, its own facts file k4-<RUN>-facts-<app>.json)
//      PHASES=seed,list,window,leave,territory,refuse,tax,delete,reps,currency,version,export,taxexp (OMP) · control (OJS, OPS)
//      Default: all. Later phases read k4-state-<RUN>-<app>.json; FRESH=1 seeds anew. A full OMP run outlasts the
//      Bash cap: launch it detached (nohup … &).
//
// Scratch contexts per run (tag u74k4…), OMP:
//   P1  a press with its four ONIX details (so the Native XML export carries ONIX products), no payment settings.
//       Book A: at Production, formats "Paperback", "Ebook"; representatives agents "Agent Ada" (05), "Agent Abe" (08),
//       supplier "Supplier Sam" (12). The list, the window, the territory cells, the refusals, the tax round trip.
//       Book N: at Production, format "Paperback", no representatives (Rule 14; agents and suppliers added on screen).
//       Book V: published, formats "Paperback" and "Ebook", each with a sales-rights entry and a market naming
//       "Agent Ada" and "Supplier Sam" (seeded givens): "Create New Version" (Rule 15).
//       Book X: at Production, format "Paperback" with one market (seeded): the Native XML exports (A5, A6, A8).
//   P2  a press that takes payments in US dollars (payments seeded); Book Q: at Production, format "Paperback" (td9).
//   Manager <press>mg drives every screen (the Press manager); author <press>au submits.
// OJS, OPS: a scratch journal / server with one galley "PDF" (the galley windows have no "Metadata" tab, no lists).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'list', 'window', 'leave', 'territory', 'refuse', 'tax', 'delete', 'reps', 'currency', 'version', 'export', 'taxexp', 'control'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k4]', RUN, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const VIS = '[role="dialog"]:visible';
const SR = 'salesRightsGridContainer';
const MK = 'marketsGridContainer';
const MKFORM = 'form#marketForm';
const PDFORM = 'form#addPubDateForm';
const MKOP = /markets-grid\/update-market|updateMarket/;

const REPS = [
    {type: 'agent', role: 'Exclusive sales agent (05)', name: 'Agent Ada'},
    {type: 'agent', role: 'Sales agent (08)', name: 'Agent Abe'},
    {type: 'supplier', role: 'Distributor to end-customers (12)', name: 'Supplier Sam'},
];

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const sf = path.join(outDir(), `k4-state-${RUN}-${app.name}.json`);
    let S = (!process.env.FRESH && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`k4-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
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
    await page.exposeFunction('__k4Notice', (text) => notices.push({at: Date.now(), text}));
    await page.addInitScript(() => {
        const seen = new WeakSet();
        new MutationObserver(() => {
            document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification').forEach((e) => {
                if (seen.has(e)) return;
                const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                seen.add(e);
                window.__k4Notice(t);
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
            const t = tag('u74k4');
            const isOJS = app.name === 'ojs';
            const FILE = isOJS ? 'article.pdf' : 'preprint.pdf';
            const r = await app.api.createContext({tag: `${t}j`, context: {name: `U74 K4 control ${t}`, contactName: 'K4 Contact', contactEmail: `${t}jc@mail.test`},
                users: [{username: `${t}jmg`, roles: ['manager'], givenName: 'Mona', familyName: 'K4j'}, {username: `${t}jau`, roles: ['author'], givenName: 'Abe', familyName: 'K4j'}]});
            const sub = await app.api.createSubmission({tag: `${t}s`, context: r.path, submitter: `${t}jau`, title: `K4 control ${t}`,
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
            o.sideMenu = (await page.locator(VIS).first().locator('nav a, nav button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean);
            await page.locator('[data-cy="galley-manager"] button[aria-label="More Actions"]').first().click();
            o.rowMenu = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x));
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await waitTop('form', 2);
            await idle(page); await sleep(500);
            const s2 = await snap('c-02-edit-galley-window');
            o.editWindow = {tabs: (await top().locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim()), text: flat(s2.text && s2.text.dialog, 1500)};
            o.anyMarketWords = /Market Territories|Add Market|Market|Price|Currency|Taxation|Sales Rights/.test(`${o.editWindow.text} ${o.pageText}`);
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
        const t = tag('u74k4');
        S.t = t;
        const mk = async (k, extra) => {
            const users = [{username: `${t}${k}mg`, roles: ['manager'], givenName: 'Mona', familyName: `K4${k}`},
                {username: `${t}${k}au`, roles: ['author'], givenName: 'Abe', familyName: `K4${k}`}];
            const r = await app.api.createContext({tag: `${t}${k}`, context: {name: `U74 K4 ${k} ${t}`, acronym: 'K4P', country: 'CA', contactName: 'K4 Contact', contactEmail: `${t}${k}c@mail.test`}, users, ...extra});
            return {path: r.path, id: r.contextId, mg: `${t}${k}mg`, au: `${t}${k}au`};
        };
        S.P1 = await mk('a', {publisher: 'K4 Press Ltd', location: 'Vancouver, Canada', codeType: 'Proprietary (01)', codeValue: 'K4-0001'});
        S.P2 = await mk('b', {payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by cheque.'}});
        const base = {files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction']};
        const sub = async (P, k, title, extra) => {
            const r = await app.api.createSubmission({tag: `${t}${k}`, context: P.path, submitter: P.au, title, ...base, ...extra});
            return {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats, reps: r.representatives};
        };
        S.A = await sub(S.P1, 'x', `K4 A-book ${t}`, {publicationFormats: [{name: 'Paperback'}, {name: 'Ebook'}], representatives: REPS});
        S.N = await sub(S.P1, 'n', `K4 N-book ${t}`, {publicationFormats: [{name: 'Paperback'}]});
        const vMarket = (price) => ({date: '20240305', dateFormat: 'YYYYMMDD', price, agent: 'Agent Ada', supplier: 'Supplier Sam', countriesIncluded: ['Canada (CA)']});
        const vRights = {type: 'For sale with exclusive rights in the specified countries or territories (01)', countriesIncluded: ['Canada (CA)']};
        S.V = await sub(S.P1, 'v', `K4 V-book ${t}`, {published: true, representatives: REPS,
            publicationFormats: [{name: 'Paperback', salesRights: [vRights], markets: [vMarket('25')]}, {name: 'Ebook', salesRights: [vRights], markets: [vMarket('15')]}]});
        S.X = await sub(S.P1, 'e', `K4 X-book ${t}`, {representatives: REPS,
            publicationFormats: [{name: 'Paperback', markets: [{date: '20240305', dateFormat: 'YYYYMMDD', price: '25', countriesIncluded: ['Canada (CA)'], agent: 'Agent Ada', supplier: 'Supplier Sam'}]}]});
        S.Q = await sub(S.P2, 'q', `K4 Q-book ${t}`, {publicationFormats: [{name: 'Paperback'}]});
        save();
        log('[seed]', JSON.stringify(S));
        note(`ccK4 (${RUN}): scratch presses P1 ${S.P1.path} (ONIX details, no payments), P2 ${S.P2.path} (payments USD); books on P1: A ${S.A.id} (reps Ada, Abe, Sam), N ${S.N.id} (no reps), V ${S.V.id} published (markets seeded), X ${S.X.id} (export); Q ${S.Q.id} on P2; managers <path>mg`);
    }
    if (!S.P1) { log('no state; run the seed phase'); await close(); return; }

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
    async function fmtRowAction(n, action) {
        const r = fmtRow(n);
        await r.waitFor({timeout: T});
        const id = await r.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const a = ctl.getByRole('link', {name: action, exact: true}).first();
        if (!(await a.isVisible().catch(() => false))) { await r.locator('a.show_extras').first().click(); await a.waitFor({state: 'visible', timeout: 10_000}); }
        const n0 = await dialogCount();
        await a.click();
        return n0;
    }
    async function openEdit(n) {
        const n0 = await fmtRowAction(n, 'Edit');
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
    async function openMeta(P, id, pub, fmt) {
        await openFormats(P, id, pub);
        await openEdit(fmt);
        return metaTab();
    }
    const grid = (g) => metaForm().locator(`div[id^="${g}"]`).first();
    const readGrid = (g) => grid(g).evaluate((el) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.getClientRects().length);
        const box = (e) => { const r = e.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; };
        const header = el.querySelector('.header');
        const table = el.querySelector('table');
        const rows = [...el.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => ({
            id: tr.id,
            cells: [...tr.querySelectorAll(':scope > td')].map((td) => { const c = td.cloneNode(true); c.querySelectorAll('script, .pkp_screen_reader, .row_controls, a.show_extras').forEach((n) => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); }),
            rawCells: [...tr.querySelectorAll(':scope > td')].map((td) => td.textContent),
            arrowFirst: !!tr.querySelector('td:first-child a.show_extras'),
        }));
        return {
            heading: t(el.querySelector('.header h4')),
            headerLinks: header ? [...header.querySelectorAll('a')].filter(vis).map((a) => ({text: t(a), box: box(a)})) : [],
            headerBox: header ? box(header) : null,
            tableBox: table ? box(table) : null,
            columns: [...el.querySelectorAll('thead th')].map(t),
            rows,
            empty: [...el.querySelectorAll('tbody.empty')].filter(vis).map(t),
        };
    });
    const brief = (g) => (g && g.rows ? g.rows.map((r) => r.cells) : g);
    const readWindow = (formSel) => top().evaluate((d, formSel) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.getClientRects().length);
        const box = (e) => { const r = e.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width)}; };
        const form = d.querySelector(formSel);
        const fields = [...form.querySelectorAll('select, input:not([type=hidden]), textarea')].map((e) => {
            const lab = e.id ? d.querySelector(`label[for="${e.id}"]`) : null;
            const sec = e.closest('.section, fieldset');
            const secLab = sec ? sec.querySelector(':scope > label, :scope > legend, :scope > .label') : null;
            const o = {name: e.name, type: e.type, visible: vis(e), box: box(e), label: t(lab), sectionLabel: t(secLab),
                required: e.required || e.classList.contains('required') || e.getAttribute('aria-required') === 'true', multiple: !!e.multiple, maxlength: e.getAttribute('maxlength')};
            if (e.tagName === 'SELECT') {
                const opts = [...e.options];
                o.count = opts.length; o.hasEmpty = opts.some((x) => x.value === ''); o.emptyFirst = opts.length > 0 && opts[0].value === '';
                o.selected = [...e.selectedOptions].map((x) => `${x.value}|${x.text.trim()}`);
                o.first = opts.slice(0, 3).map((x) => `${x.value}|${x.text.trim()}`);
                o.last = opts.slice(-3).map((x) => `${x.value}|${x.text.trim()}`);
                if (opts.length <= 40) o.options = opts.map((x) => `${x.value}|${x.text.trim()}`);
                const texts = opts.filter((x) => x.value !== '').map((x) => x.text.trim());
                const live = texts.filter((x) => !/\(Discontinued\)$/.test(x));
                o.aToZ = live.every((x, i) => i === 0 || live[i - 1].localeCompare(x) <= 0);
                o.discontinued = texts.filter((x) => /\(Discontinued\)$/.test(x)).length;
                o.discontinuedLast = texts.length > 0 && texts.findIndex((x) => /\(Discontinued\)$/.test(x)) >= texts.length - o.discontinued;
            } else if (e.type === 'checkbox') o.checked = e.checked; else o.value = e.value;
            return o;
        });
        const clone = form.cloneNode(true);
        clone.querySelectorAll('option, script').forEach((e) => e.remove());
        const tips = [...form.querySelectorAll('.description, label.description, .pkp_helpers_description, p')].filter(vis).map(t).filter(Boolean);
        return {title: t(d.querySelector('h1, h2')), words: clone.textContent.replace(/\s+/g, ' ').trim().slice(0, 2500), fields, tips,
            buttons: [...d.querySelectorAll('button, a')].filter(vis).map((b) => ({text: t(b), box: box(b)})).filter((b) => b.text),
            requiredNote: [...d.querySelectorAll('.formRequired')].filter(vis).map((e) => ({text: t(e), box: box(e)})),
            errors: [...d.querySelectorAll('label.error, .pkp_form_error, .pkp_form_error_list, .error')].filter(vis).map((e) => ({text: t(e), box: box(e), for: e.getAttribute('for')})).filter((e) => e.text)};
    }, formSel);
    /** The window's values in short: each field's chosen option(s) or value. */
    const values = (w) => Object.fromEntries(w.fields.map((f) => [f.name, f.selected ? (f.multiple ? f.selected.map((x) => x.split('|')[1]) : (f.selected[0] || '')) : (f.checked ?? f.value)]));
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
        if (!closed) {
            o.window = await readWindow(formSel).catch(() => null);
            o.validation = await top().locator(formSel).evaluate((f) => [...f.querySelectorAll('input, select')].filter((e) => e.validationMessage).map((e) => ({name: e.name, message: e.validationMessage}))).catch(() => null);
        }
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
        await row.waitFor({timeout: 10_000});
        const id = await row.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const a = ctl.getByRole('link', {name: action, exact: true}).first();
        if (!(await a.isVisible().catch(() => false))) { await row.locator('a.show_extras').first().click(); await a.waitFor({state: 'visible', timeout: 10_000}); }
        const links = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim()).filter(Boolean));
        await a.click();
        return links;
    }
    async function openRowEdit(g, rowText, formSel) {
        const n0 = await dialogCount();
        const links = await rowAction(g, rowText, 'Edit');
        await waitTop(formSel, n0 + 1); await idle(page); await sleep(500);
        const w = await readWindow(formSel);
        return {links, w};
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
        await idle(page); await sleep(1500);
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
    /** Fill the market window (already open) from a spec; lists by value code or {label}. */
    async function fillMarket(spec) {
        const f = top().locator(MKFORM);
        if (spec.date !== undefined) await f.locator('input[name="date"]').fill(spec.date);
        if (spec.dateFormat !== undefined) await f.locator('select[name="dateFormat"]').selectOption(spec.dateFormat);
        if (spec.dateRole !== undefined) await f.locator('select[name="dateRole"]').selectOption(spec.dateRole);
        if (spec.agent !== undefined) await f.locator('select[name="agentId"]').selectOption(spec.agent === '' ? '' : {label: spec.agent});
        if (spec.supplier !== undefined) await f.locator('select[name="supplierId"]').selectOption(spec.supplier === '' ? '' : {label: spec.supplier});
        for (const k of ['countriesIncluded', 'countriesExcluded', 'regionsIncluded', 'regionsExcluded']) {
            if (spec[k]) await f.locator(`select[name="${k}[]"]`).selectOption(spec[k]);
        }
        if (spec.price !== undefined) await f.locator('input[name="price"]').fill(spec.price);
        if (spec.currency !== undefined) await f.locator('select[name="currencyCode"]').selectOption(spec.currency);
        if (spec.priceType !== undefined) await f.locator('select[name="priceTypeCode"]').selectOption(spec.priceType);
        if (spec.taxRate !== undefined) await f.locator('select[name="taxRateCode"]').selectOption(spec.taxRate);
        if (spec.taxType !== undefined) await f.locator('select[name="taxTypeCode"]').selectOption(spec.taxType);
        if (spec.discount !== undefined) await f.locator('input[name="discount"]').fill(spec.discount);
    }
    async function addMarket(spec, shotBefore) {
        const w = await openAdd(MK, 'Add Market', MKFORM);
        await fillMarket(spec);
        const before = values(await readWindow(MKFORM));
        if (shotBefore) await snap(shotBefore);
        const ok = await subOK(MKFORM, MKOP);
        return {arrival: values(w), before, ok};
    }
    const mkDb = (fmtId) => sql(`select market_id, market_date, market_date_format, market_date_role, price, currency_code, coalesce(price_type_code,''), coalesce(tax_rate_code,''), coalesce(tax_type_code,''), coalesce(discount,''), agent_id, supplier_id, countries_included, countries_excluded, regions_included, regions_excluded from markets where publication_format_id=${fmtId} order by market_id`);
    const fmtIds = (pub) => sql(`select publication_format_id||':'||coalesce((select setting_value from publication_format_settings s where s.publication_format_id=f.publication_format_id and setting_name='name' and locale='en' limit 1),'') from publication_formats f where publication_id=${pub} order by publication_format_id`).split('\n');
    const fmtIdOf = (pub, name) => Number((fmtIds(pub).find((x) => x.endsWith(`:${name}`)) || '').split(':')[0]);
    const P1 = S.P1;
    const A = S.A;

    // ============================================================ list: the tab on arrival, the markets list empty
    if (on('list')) {
        const o = await safe('list', async () => {
            const o = {};
            await as(P1.mg, P1.path);
            await openFormats(P1, A.id, A.pub);
            o.tabs = await openEdit('Paperback');
            await metaTab();
            await snap('l-01-metadata-tab-paperback');
            o.markets = await readGrid(MK);
            o.salesRightsBox = (await readGrid(SR)).tableBox;
            o.tabOrder = await metaForm().evaluate((f) => [...f.querySelectorAll('div[id*="GridContainer"] .header h4')].map((h) => h.innerText.trim()));
            await loc(page, 'Metadata tab: the "Market Territories" list', grid(MK));
            await loc(page, 'Market Territories: "Add Market" (header link)', grid(MK).locator('.header a').filter({hasText: /^\s*Add Market\s*$/}));
            await loc(page, 'Market Territories: "No Items"', grid(MK).locator('tbody.empty:visible'));
            await closeFormatWindow();
            return o;
        });
        fact('list', o);
    }

    // ============================================================ window: "Add Market" as it arrives (A5, td9 on P1), "Add publication date"'s preselection
    if (on('window')) {
        const o = await safe('window', async () => {
            const o = {};
            await as(P1.mg, P1.path);
            await openMeta(P1, A.id, A.pub, 'Paperback');
            o.arrival = await openAdd(MK, 'Add Market', MKFORM);
            await snap('w-01-add-market-window');
            await top().locator(MKFORM).evaluate((f) => { f.closest('[role=dialog]').querySelectorAll('*').forEach((e) => { if (e.scrollHeight > e.clientHeight + 5) e.scrollTop = e.scrollHeight; }); });
            await sleep(300);
            await snap('w-02-add-market-window-bottom');
            o.agentTip = await top().locator(MKFORM).getByText(/You may assign an agent/).allInnerTexts().catch(() => []);
            o.sectionTitles = await top().locator(MKFORM).evaluate((f) => [...f.querySelectorAll('.section > label, .section > span.label, legend, .pkp_form_section_title, h3')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
            await loc(page, 'Market window: the form', top().locator(MKFORM));
            await loc(page, 'Market window: "Date"', top().locator(MKFORM).locator('input[name="date"]'));
            await loc(page, 'Market window: "Date Format"', top().locator(MKFORM).locator('select[name="dateFormat"]'));
            await loc(page, 'Market window: "Role" (date role)', top().locator(MKFORM).locator('select[name="dateRole"]'));
            await loc(page, 'Market window: "Agent"', top().locator(MKFORM).locator('select[name="agentId"]'));
            await loc(page, 'Market window: "Supplier"', top().locator(MKFORM).locator('select[name="supplierId"]'));
            await loc(page, 'Market window: "Price"', top().locator(MKFORM).locator('input[name="price"]'));
            await loc(page, 'Market window: currency list', top().locator(MKFORM).locator('select[name="currencyCode"]'));
            await loc(page, 'Market window: "Taxation Type"', top().locator(MKFORM).locator('select[name="taxTypeCode"]'));
            await loc(page, 'Market window: "OK"', top().locator(MKFORM).getByRole('button', {name: 'OK', exact: true}));
            await loc(page, 'Market window: "Cancel" (a link)', top().locator(MKFORM).getByRole('link', {name: 'Cancel', exact: true}));
            await subCancel(MKFORM);
            // the format window's "Publication Dates" › "Add publication date": its preselected date format (A5's last sentence)
            const n0 = await dialogCount();
            await metaForm().locator('div[id^="publicationDateGridContainer"] .header a').first().click();
            await waitTop(PDFORM, n0 + 1); await idle(page); await sleep(400);
            const pd = await readWindow(PDFORM);
            o.pubDateWindow = {title: pd.title, dateFormat: (pd.fields.find((x) => x.name === 'dateFormat') || {}).selected};
            await snap('w-03-add-publication-date-window');
            await subCancel(PDFORM);
            await closeFormatWindow();
            return o;
        });
        fact('window', o);
    }

    // ============================================================ leave: the market window left with a change unsaved (Cancel, the close arrow)
    if (on('leave')) {
        const o = await safe('leave', async () => {
            const o = {};
            await as(P1.mg, P1.path);
            await openMeta(P1, A.id, A.pub, 'Ebook');
            await openAdd(MK, 'Add Market', MKFORM);
            await fillMarket({date: '20240101', price: '99', countriesIncluded: ['FR']});
            await top().locator(MKFORM).locator('input[name="price"]').blur();
            policy = 'dismiss';
            o.cancelWithChange = await subCancel(MKFORM);
            o.stillOpenAfterCancel = await top().locator(MKFORM).count();
            if (o.stillOpenAfterCancel) { policy = 'accept'; o.cancelAccept = await subCancel(MKFORM); policy = 'dismiss'; }
            o.listAfterCancel = brief(await readGrid(MK));
            await openAdd(MK, 'Add Market', MKFORM);
            await fillMarket({date: '20240101', price: '98'});
            await top().locator(MKFORM).locator('input[name="price"]').blur();
            let t0 = Date.now(); const n0 = await dialogCount();
            await top().getByRole('button', {name: 'Close', exact: true}).first().click();
            await sleep(900);
            o.closeArrowDismiss = {closed: await waitCount(n0 - 1), dialogs: dlgSince(t0)};
            if (!o.closeArrowDismiss.closed) {
                await snap('v-01-close-arrow-dismissed');
                policy = 'accept'; t0 = Date.now();
                await top().getByRole('button', {name: 'Close', exact: true}).first().click();
                o.closeArrowAccept = {closed: await waitCount(n0 - 1), dialogs: dlgSince(t0)};
                policy = 'dismiss'; await sleep(700);
            }
            o.listAfterClose = brief(await readGrid(MK));
            await closeFormatWindow();
            return o;
        });
        fact('leave', o);
    }

    // ============================================================ territory: td8's market, the empty one, regions, one representative (A4, Rule 13b)
    if (on('territory')) {
        const o = await safe('territory', async () => {
            const o = {};
            await as(P1.mg, P1.path);
            await openMeta(P1, A.id, A.pub, 'Paperback');
            o.m1 = await addMarket({date: '20240305', dateFormat: '00', countriesIncluded: ['CA', 'US'], countriesExcluded: ['GB'], price: '25', agent: 'Agent Ada', supplier: 'Supplier Sam'}, 't-01-td8-market-filled');
            await snap('t-02-list-after-td8-market');
            o.list1 = await readGrid(MK);
            o.m2 = await addMarket({date: '20240305', dateFormat: '00', price: '11'}, 't-03-empty-market-filled');
            o.m3 = await addMarket({date: '20240305', dateFormat: '00', countriesIncluded: ['DE'], regionsIncluded: ['WORLD'], regionsExcluded: ['IT-AG'], price: '12.50', currency: 'USD', agent: 'Agent Abe'});
            o.m4 = await addMarket({date: '20240305', dateFormat: '00', countriesExcluded: ['FR'], price: '13', supplier: 'Supplier Sam'});
            await snap('t-04-list-four-markets');
            o.listSamePage = await readGrid(MK);
            // the td8 market's Edit: the window names what the row shows as codes (A4)
            const e1 = await openRowEdit(MK, '25CAD', MKFORM);
            o.arrowEntries = e1.links;
            o.edit1 = {title: e1.w.title, values: values(e1.w)};
            await snap('t-05-td8-market-edit');
            await subCancel(MKFORM);
            await closeFormatWindow();
            await page.reload(); await idle(page);
            await wf().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await openEdit('Paperback'); await metaTab();
            await snap('t-06-after-reload');
            o.listReload = await readGrid(MK);
            await closeFormatWindow();
            o.db = mkDb(fmtIdOf(A.pub, 'Paperback'));
            return o;
        });
        fact('territory', o);
    }

    // ============================================================ refuse: td16's refusals and the forms nothing checks (Rule 13a, A8)
    if (on('refuse')) {
        const o = await safe('refuse', async () => {
            const o = {};
            await as(P1.mg, P1.path);
            await openMeta(P1, A.id, A.pub, 'Ebook');
            // Date empty
            await openAdd(MK, 'Add Market', MKFORM);
            await fillMarket({date: '', price: '10'});
            o.noDate = await subOK(MKFORM, MKOP);
            await snap('f-01-date-empty-ok');
            if (!o.noDate.closed) await subCancel(MKFORM);
            // Price empty
            await openAdd(MK, 'Add Market', MKFORM);
            await fillMarket({date: '20240305', price: ''});
            o.noPrice = await subOK(MKFORM, MKOP);
            await snap('f-02-price-empty-ok');
            if (!o.noPrice.closed) await subCancel(MKFORM);
            // both empty
            await openAdd(MK, 'Add Market', MKFORM);
            o.noBoth = await subOK(MKFORM, MKOP);
            await snap('f-03-both-empty-ok');
            if (!o.noBoth.closed) await subCancel(MKFORM);
            // spaces only in "Date", then in "Price" (the browser's check passes; the server's decides)
            await openAdd(MK, 'Add Market', MKFORM);
            await fillMarket({date: '   ', price: '10'});
            o.spaceDate = await subOK(MKFORM, MKOP);
            await snap('f-04-date-spaces-ok');
            if (!o.spaceDate.closed) await subCancel(MKFORM);
            await openAdd(MK, 'Add Market', MKFORM);
            await fillMarket({date: '20240305', price: '   '});
            o.spacePrice = await subOK(MKFORM, MKOP);
            await snap('f-05-price-spaces-ok');
            if (!o.spacePrice.closed) await subCancel(MKFORM);
            o.listAfterRefusals = brief(await readGrid(MK));
            // "abc" as a YYYYMMDD date, "ten" as the price
            o.abcTen = await addMarket({date: 'abc', dateFormat: '00', price: 'ten', countriesIncluded: ['CA']}, 'f-06-abc-ten-filled');
            await snap('f-07-after-abc-ten');
            o.listAfterAbc = await readGrid(MK);
            // the other end of the date axis: a date too long for its format, a Hijri-format date typed as a Gregorian one
            o.longDate = await addMarket({date: '2024-03-05 and more', dateFormat: '05', price: '-3', countriesIncluded: ['US']});
            o.listAfterLong = brief(await readGrid(MK));
            await closeFormatWindow();
            await page.reload(); await idle(page);
            await wf().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await openEdit('Ebook'); await metaTab();
            o.listReload = brief(await readGrid(MK));
            const e = await openRowEdit(MK, 'tenCAD', MKFORM);
            o.abcEdit = values(e.w);
            await snap('f-08-abc-ten-edit');
            await subCancel(MKFORM);
            await closeFormatWindow();
            o.db = mkDb(fmtIdOf(A.pub, 'Ebook'));
            return o;
        });
        fact('refuse', o);
    }

    // ============================================================ tax: td10 (A6) and every list's round trip through "Edit"
    if (on('tax')) {
        const o = await safe('tax', async () => {
            const o = {};
            await as(P1.mg, P1.path);
            await openMeta(P1, A.id, A.pub, 'Paperback');
            const fid = fmtIdOf(A.pub, 'Paperback');
            o.m5 = await addMarket({date: '20240401', dateFormat: '00', price: '41', countriesIncluded: ['NZ']});
            o.db0 = mkDb(fid).split('\n').filter((l) => l.includes('|41|'));
            let e = await openRowEdit(MK, '41CAD', MKFORM);
            o.edit1 = values(e.w);
            await snap('x-01-empty-tax-type-first-edit');
            o.ok1 = await subOK(MKFORM, MKOP);
            o.db1 = mkDb(fid).split('\n').filter((l) => l.includes('|41|'));
            e = await openRowEdit(MK, '41CAD', MKFORM);
            o.edit2 = values(e.w);
            await snap('x-02-empty-tax-type-second-edit');
            await subCancel(MKFORM);
            // control: VAT chosen, and every other list set away from where it arrives
            o.m6 = await addMarket({date: '20240402', dateFormat: '05', dateRole: '02', price: '42', currency: 'EUR', priceType: '01', taxRate: 'Z', taxType: '01', discount: '5', countriesIncluded: ['AU'], agent: 'Agent Abe', supplier: 'Supplier Sam'});
            e = await openRowEdit(MK, '42EUR', MKFORM);
            o.edit6 = values(e.w);
            await snap('x-03-vat-market-edit');
            await subCancel(MKFORM);
            // a market left on every arrival choice: its Edit
            o.m7 = await addMarket({date: '20240403', price: '43'});
            e = await openRowEdit(MK, '43CAD', MKFORM);
            o.edit7 = values(e.w);
            await subCancel(MKFORM);
            await closeFormatWindow();
            o.db = mkDb(fid).split('\n').filter((l) => /\|4[1-3]\|/.test(l));
            return o;
        });
        fact('tax', o);
    }

    // ============================================================ delete: a market's "Delete", Cancel then OK
    if (on('delete')) {
        const o = await safe('delete', async () => {
            const o = {};
            await as(P1.mg, P1.path);
            await openMeta(P1, A.id, A.pub, 'Paperback');
            o.before = brief(await readGrid(MK));
            await rowAction(MK, '43CAD', 'Delete');
            o.cancelQ = await answerDelete('Cancel');
            o.afterCancel = brief(await readGrid(MK));
            await rowAction(MK, '43CAD', 'Delete');
            o.okQ = await answerDelete('OK');
            await snap('d-01-after-market-delete');
            o.afterDelete = brief(await readGrid(MK));
            await closeFormatWindow();
            return o;
        });
        fact('delete', o);
    }

    // ------------------------------------------------------------ the Representatives page (book N), K2's window helpers
    const repForm = () => page.locator('form#representativeForm:visible');
    async function addRepOnScreen(N, {type, role, name}) {
        await page.goto(app.url(`/index.php/${P1.path}/dashboard/editorial?workflowSubmissionId=${N.id}&workflowMenuKey=marketing_representatives`));
        await idle(page);
        await page.locator('a').filter({hasText: /^\s*Add Representative\s*$/}).first().click();
        await repForm().waitFor({timeout: T}); await idle(page);
        await repForm().locator('input[name="name"]').waitFor({timeout: T});
        const pick = async (v) => { await repForm().locator(`input[name="isSupplier"][value="${v}"]`).check(); await sleep(200); };
        if (type === 'supplier') { await pick(0); await pick(1); } else await pick(0);
        await repForm().locator(`select[name="${type}Role"]`).selectOption({label: role});
        await repForm().locator('input[name="name"]').fill(name);
        const t0 = Date.now();
        await repForm().getByRole('button', {name: 'OK', exact: true}).click();
        const closed = await page.locator('form#representativeForm').waitFor({state: 'hidden', timeout: 8000}).then(() => true).catch(() => false);
        await idle(page); await sleep(700);
        return {closed, notices: noticesSince(t0)};
    }
    const repLists = (w) => ({agent: (w.fields.find((x) => x.name === 'agentId') || {}).options, supplier: (w.fields.find((x) => x.name === 'supplierId') || {}).options});

    // ============================================================ reps: Rule 14 on a book with no representatives, then an agent, then a supplier
    if (on('reps')) {
        const o = await safe('reps', async () => {
            const o = {};
            await as(P1.mg, P1.path);
            const N = S.N;
            await openMeta(P1, N.id, N.pub, 'Paperback');
            o.none = repLists(await openAdd(MK, 'Add Market', MKFORM));
            await snap('r-01-no-representatives-add-market');
            // Rule 13b's other end: a market with nothing but date and price on a book with no representatives
            await fillMarket({date: '20240501', price: '51'});
            o.bareOK = await subOK(MKFORM, MKOP);
            o.bareList = brief(await readGrid(MK));
            await closeFormatWindow();
            o.addAgent = await addRepOnScreen(N, {type: 'agent', role: 'Local publisher (07)', name: 'Agent Olga'});
            await openMeta(P1, N.id, N.pub, 'Paperback');
            o.agentOnly = repLists(await openAdd(MK, 'Add Market', MKFORM));
            await snap('r-02-agent-only-add-market');
            await subCancel(MKFORM);
            await closeFormatWindow();
            o.addSupplier = await addRepOnScreen(N, {type: 'supplier', role: 'Distributor to end-customers (12)', name: 'Supplier Sid'});
            o.addAgent2 = await addRepOnScreen(N, {type: 'agent', role: 'Exclusive sales agent (05)', name: 'Agent Bert'});
            await openMeta(P1, N.id, N.pub, 'Paperback');
            o.both = repLists(await openAdd(MK, 'Add Market', MKFORM));
            await snap('r-03-both-add-market');
            await subCancel(MKFORM);
            // book A (seeded Ada, Abe, Sam): the lists' order
            await closeFormatWindow();
            await openMeta(P1, A.id, A.pub, 'Ebook');
            o.bookA = repLists(await openAdd(MK, 'Add Market', MKFORM));
            await subCancel(MKFORM);
            await closeFormatWindow();
            return o;
        });
        fact('reps', o);
    }

    // ============================================================ currency: td9 on P1 (no payments) and P2 (payments in USD)
    if (on('currency')) {
        const o = await safe('currency', async () => {
            const o = {};
            const cur = (w) => { const f = w.fields.find((x) => x.name === 'currencyCode') || {}; return {selected: f.selected, count: f.count, hasEmpty: f.hasEmpty, first: f.first, last: f.last, discontinued: f.discontinued, discontinuedLast: f.discontinuedLast, aToZ: f.aToZ}; };
            await as(P1.mg, P1.path);
            await openMeta(P1, S.N.id, S.N.pub, 'Paperback');
            o.p1 = cur(await openAdd(MK, 'Add Market', MKFORM));
            await subCancel(MKFORM); await closeFormatWindow();
            o.p1Settings = sql(`select setting_name||'='||coalesce(setting_value,'') from press_settings where press_id=${P1.id} and setting_name in ('currency','paymentsEnabled','paymentPluginName') order by 1`);
            await as(S.P2.mg, S.P2.path);
            await page.goto(app.url(`/index.php/${S.P2.path}/management/settings/distribution#payments`)); await idle(page); await sleep(800);
            await snap('y-01-p2-payments-tab');
            o.p2PaymentsTab = flat(await page.locator('main').innerText().catch(() => null), 800);
            await openMeta(S.P2, S.Q.id, S.Q.pub, 'Paperback');
            o.p2 = cur(await openAdd(MK, 'Add Market', MKFORM));
            await snap('y-02-p2-add-market');
            await subCancel(MKFORM); await closeFormatWindow();
            o.p2Settings = sql(`select setting_name||'='||coalesce(setting_value,'') from press_settings where press_id=${S.P2.id} and setting_name in ('currency','paymentsEnabled','paymentPluginName') order by 1`);
            return o;
        });
        fact('currency', o);
    }

    // ============================================================ version: td17 (Rule 15)
    if (on('version')) {
        const o = await safe('version', async () => {
            const o = {};
            const V = S.V;
            await as(P1.mg, P1.path);
            o.v1Before = {};
            await openMeta(P1, V.id, V.pub, 'Paperback');
            o.v1Before.paperback = {sr: brief(await readGrid(SR)), mk: brief(await readGrid(MK))};
            await closeFormatWindow();
            if (!S.pub2) {
                await openFormats(P1, V.id, V.pub);
                const {WorkflowPage} = require(path.resolve(__dirname, '../../../pages/WorkflowPage.js'));
                const w = new WorkflowPage(page, null);
                const item = await w.revealPublicationEntry('Create New Version');
                await w.expectVersionLoaded();
                await item.click();
                const dlg = page.getByRole('dialog', {name: 'Create New Version'});
                await dlg.getByLabel('Publication Stage').waitFor({timeout: T});
                await snap('n-00-create-new-version-dialog');
                const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
                const resp = await created;
                o.created = resp.status();
                S.pub2 = (await resp.json().catch(() => ({}))).id; save();
                await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
                await idle(page);
            }
            o.pub2 = S.pub2;
            o.fmts = {v1: fmtIds(V.pub), v2: fmtIds(S.pub2)};
            // the new version's Paperback: both lists, the market's Representatives cell
            await openMeta(P1, V.id, S.pub2, 'Paperback');
            await snap('n-01-new-version-paperback');
            o.v2 = {sr: await readGrid(SR), mk: await readGrid(MK)};
            const e = await openRowEdit(MK, '25', MKFORM);
            o.v2MarketEdit = values(e.w);
            await subCancel(MKFORM);
            // change on v2: delete its sales-rights entry, market price to 30
            await rowAction(SR, 'For sale with exclusive rights', 'Delete');
            o.v2SrDelete = await answerDelete('OK');
            await openRowEdit(MK, '25', MKFORM);
            await top().locator(MKFORM).locator('input[name="price"]').fill('30');
            o.v2PriceEdit = await subOK(MKFORM, MKOP);
            o.v2After = {sr: brief(await readGrid(SR)), mk: brief(await readGrid(MK))};
            await closeFormatWindow();
            // version 1's Paperback
            await openMeta(P1, V.id, V.pub, 'Paperback');
            await snap('n-02-first-version-paperback-after-v2-change');
            o.v1AfterV2Change = {sr: brief(await readGrid(SR)), mk: brief(await readGrid(MK))};
            // the other end: change on version 1 (published), read version 2
            await openRowEdit(MK, '25CAD', MKFORM);
            await top().locator(MKFORM).locator('input[name="price"]').fill('40');
            o.v1PriceEdit = await subOK(MKFORM, MKOP);
            o.v1After = {sr: brief(await readGrid(SR)), mk: brief(await readGrid(MK))};
            await closeFormatWindow();
            await openMeta(P1, V.id, S.pub2, 'Paperback');
            await snap('n-03-new-version-paperback-after-v1-change');
            o.v2AfterV1Change = {sr: brief(await readGrid(SR)), mk: brief(await readGrid(MK))};
            await closeFormatWindow();
            // delete the new version's Ebook: its two lists go with it; version 1's Ebook keeps its own
            const eb2 = fmtIdOf(S.pub2, 'Ebook');
            const eb1 = fmtIdOf(V.pub, 'Ebook');
            o.ebookRowsBefore = {v2: {mk: sql(`select count(*) from markets where publication_format_id=${eb2}`), sr: sql(`select count(*) from sales_rights where publication_format_id=${eb2}`)}, v1: {mk: sql(`select count(*) from markets where publication_format_id=${eb1}`), sr: sql(`select count(*) from sales_rights where publication_format_id=${eb1}`)}};
            await openFormats(P1, V.id, S.pub2);
            await fmtRowAction('Ebook', 'Delete');
            o.ebookDelete = await answerDelete('OK');
            await snap('n-04-new-version-after-ebook-delete');
            o.v2FormatsAfter = (await wf().locator('tr.gridRow').allInnerTexts().catch(() => [])).map((x) => flat(x, 120));
            o.ebookRowsAfter = {v2: {fmt: sql(`select count(*) from publication_formats where publication_format_id=${eb2}`), mk: sql(`select count(*) from markets where publication_format_id=${eb2}`), sr: sql(`select count(*) from sales_rights where publication_format_id=${eb2}`)}, v1: {mk: sql(`select count(*) from markets where publication_format_id=${eb1}`), sr: sql(`select count(*) from sales_rights where publication_format_id=${eb1}`)}};
            await openMeta(P1, V.id, V.pub, 'Ebook');
            await snap('n-05-first-version-ebook-after-v2-delete');
            o.v1Ebook = {sr: brief(await readGrid(SR)), mk: brief(await readGrid(MK))};
            await closeFormatWindow();
            o.v1Db = mkDb(fmtIdOf(V.pub, 'Paperback'));
            o.v2Db = mkDb(fmtIdOf(S.pub2, 'Paperback'));
            o.reps = sql(`select representative_id||'|'||name||'|'||is_supplier from representatives where submission_id=${V.id} order by 1`);
            return o;
        });
        fact('version', o);
    }

    // ------------------------------------------------------------ Native XML export on screen (Tools › Native XML Plugin › Export)
    const pick = (p, tagName) => [...p.matchAll(new RegExp(`<(?:onix:)?${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:onix:)?${tagName}>`, 'g'))].map((m) => flat(m[1], 300));
    const readXml = (xml) => {
        const products = [...xml.matchAll(/<(?:onix:)?Product[\s>][\s\S]*?<\/(?:onix:)?Product>/g)].map((m) => m[0]);
        return products.map((p) => ({
            form: pick(p, 'ProductForm')[0],
            productSupply: [...p.matchAll(/<(?:onix:)?ProductSupply[\s>][\s\S]*?<\/(?:onix:)?ProductSupply>/g)].map((m) => flat(m[0].replace(/<\/?onix:/g, (x) => x.replace('onix:', '')), 1500)),
            marketDate: [...p.matchAll(/<(?:onix:)?MarketDate[\s>][\s\S]*?<\/(?:onix:)?MarketDate>/g)].map((m) => flat(m[0].replace(/onix:/g, ''), 300)),
            price: [...p.matchAll(/<(?:onix:)?Price[\s>][\s\S]*?<\/(?:onix:)?Price>/g)].map((m) => flat(m[0].replace(/onix:/g, ''), 500)),
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
        r.picked = [];
        for (let i = 0; i < await items.count(); i++) {
            const it = items.nth(i);
            const txt = flat(await it.innerText(), 200);
            if (words.some((w) => txt.includes(w))) { await it.locator('input[type=checkbox]').check(); r.picked.push(txt); }
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
        r.errorAnswers = since(t0).filter((p) => p.status >= 400).slice(0, 5);
        const b = panel.getByRole('button', {name: 'Download Exported File'});
        if (await b.count()) {
            const dl = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
            await b.first().click();
            const d = await dl;
            if (d) {
                const xml = fs.readFileSync(await d.path(), 'utf8');
                const file = path.join(outDir(), `${RUN}-${name}-${app.name}.xml`);
                fs.writeFileSync(file, xml);
                r.file = path.basename(file); r.products = readXml(xml);
            } else r.download = 'none';
        }
        return r;
    }

    // ============================================================ export: book X's market through the Native XML export (A5, A6, A8, a market with no territory)
    if (on('export')) {
        const o = await safe('export', async () => {
            const o = {};
            const X = S.X;
            const W = ['K4 X-book'];
            await as(P1.mg, P1.path);
            const editX = async (spec) => {
                await openMeta(P1, X.id, X.pub, 'Paperback');
                const e = await openRowEdit(MK, 'Included', MKFORM);
                const before = values(e.w);
                await fillMarket(spec);
                const ok = await subOK(MKFORM, MKOP);
                const list = brief(await readGrid(MK));
                await closeFormatWindow();
                return {before, ok: {closed: ok.closed, notices: ok.notices, answer: ok.answer}, list};
            };
            // every edit below sets "Taxation Type" back to its empty choice, except the plain "Edit" › "OK" (A6)
            o.base = await nativeExport(P1, W, 'e-01-export-base');
            o.edTen = await editX({price: 'ten', taxType: ''});
            o.ten = await nativeExport(P1, W, 'e-02-export-price-ten');
            o.edAbc = await editX({price: '25', date: 'abc', taxType: ''});
            o.abc = await nativeExport(P1, W, 'e-03-export-date-abc');
            o.edHijri = await editX({date: '20240305', dateFormat: '20', taxType: ''});
            o.hijri = await nativeExport(P1, W, 'e-04-export-hijri-default');
            o.edGreg = await editX({dateFormat: '00', taxType: ''});
            o.dbBeforePlain = mkDb(fmtIdOf(X.pub, 'Paperback'));
            o.greg = await nativeExport(P1, W, 'e-05-export-tax-type-empty');
            o.edPlain = await editX({});
            o.dbAfterPlain = mkDb(fmtIdOf(X.pub, 'Paperback'));
            o.plain = await nativeExport(P1, W, 'e-06-export-after-plain-edit-ok');
            o.edNoTerr = await editX({countriesIncluded: [], taxType: ''});
            o.noTerr = await nativeExport(P1, W, 'e-07-export-market-without-territory');
            o.edBack = await editX({countriesIncluded: ['CA'], taxType: ''});
            o.finalDb = mkDb(fmtIdOf(X.pub, 'Paperback'));
            return o;
        });
        fact('export', o);
    }

    // ============================================================ taxexp: A6's other end — which tax choices the Native XML export takes
    if (on('taxexp')) {
        const o = await safe('taxexp', async () => {
            const o = {};
            const X = S.X;
            const W = ['K4 X-book'];
            await as(P1.mg, P1.path);
            const editX = async (spec) => {
                await openMeta(P1, X.id, X.pub, 'Paperback');
                const e = await openRowEdit(MK, 'Included', MKFORM);
                const before = values(e.w);
                await fillMarket(spec);
                const ok = await subOK(MKFORM, MKOP);
                await closeFormatWindow();
                return {before: {taxType: before.taxTypeCode, taxRate: before.taxRateCode, priceType: before.priceTypeCode}, ok: {closed: ok.closed, notices: ok.notices}, db: mkDb(fmtIdOf(X.pub, 'Paperback'))};
            };
            o.edVatZ = await editX({taxType: '01', taxRate: 'Z', priceType: ''});
            o.vatZ = await nativeExport(P1, W, 't-01-export-vat-zero-rated');
            o.edRateS = await editX({taxType: '', taxRate: 'S', priceType: ''});
            o.rateS = await nativeExport(P1, W, 't-02-export-standard-rate-only');
            o.edIncl = await editX({taxType: '02', taxRate: '', priceType: '02'});
            o.incl = await nativeExport(P1, W, 't-03-export-gst-with-price-including-tax');
            o.edClear = await editX({taxType: '', taxRate: '', priceType: ''});
            o.clear = await nativeExport(P1, W, 't-04-export-all-tax-lists-empty');
            return o;
        });
        fact('taxexp', o);
    }

    await close();
});
