// U73 claim check K5 — the format window's "Metadata" tab and the code and date windows
// (docs/specs/U73-publication-formats-proof-terms.md, chunk K5): Fields "The Metadata tab" 110–128, "The code window
// and the date window" 130–139; Rules 17–19 310–344; register A6, A7 602–622.
//
// Run: RUN=r1 PROBE_FEATURE=U73 PROBE_AGENT=ccK5 node bin/probe.js all shared/playwright/checks/U73/K5/k5.js
//      RUN=r2 … (a second, independent run: its own scratch presses and its own facts file, facts-<run>-<app>.json)
//      PHASES=seed,add,...  (default all; later phases read k5-state-<app>-<run>.json; FRESH=1 seeds anew)
//
// Scratch contexts per run (tag u73k5…), OMP:
//   P1  a new press as created (DOIs on, the first "Items with DOIs" kind only). Book A at Production, seeded with the
//       format "PDF" (file, Open Access, approved, available; "Physical format" unticked). On screen: formats "Print"
//       ("Physical format" ticked) and "Remote" (remote box ticked, an address).
//   P2  DOIs off (enableDois false). Book B, format "PDF" (no file).
//   P3  DOIs on with "Publication Formats" among "Items with DOIs". Book C, format "PDF" (no file).
//   Each press: a manager {t}{k}mg (the Press manager of every drive) and an author {t}{k}au (the submitter).
// OJS, OPS: a scratch journal / server with one production submission and one galley "PDF" (read-only control:
// the galley windows have no "Metadata" tab, no code or date lists).
//
// Phases (OMP): seed, add (Rule 17's new-format window; Print and Remote created), groups (A6 / Rule 17b on the three
// formats), meta (Fields and Rule 17a on Print and PDF: defaults, refusal, leaving with a change, save, reload,
// Product Availability vs the "Availability" column, Imprint's length), codes (Rule 18 on Print), dates (Rule 19 on
// Print; A7 on PDF), doi (Rule 18's DOI sentence on P2 and P3; P1 in codes), onix (A7: the ONIX 3.0 export of book A).
// Phase control on OJS and OPS.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || 'r1';
const ALL = ['seed', 'add', 'groups', 'meta', 'codes', 'dates', 'doi', 'onix', 'control'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k5]', RUN, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const VIS = '[role="dialog"]:visible';

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const sf = path.join(outDir(), `k5-state-${app.name}-${RUN}.json`);
    let S = (!process.env.FRESH && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`facts-${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };

    const {page, close} = await launch(app);
    // browser dialogs: the policy decides confirm(); every one is kept
    let policy = 'dismiss';
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : policy});
        if (d.type() === 'beforeunload' || policy === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const dlgSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);
    const posts = [];
    page.on('response', async (r) => {
        const m = r.request().method();
        if (m === 'GET' && r.status() < 400) return;
        const u = r.url();
        if (/\.(js|css|png|svg|woff2?)(\?|$)/.test(u)) return;
        let body = '';
        if (m !== 'GET') { try { body = (await r.text()).slice(0, 400); } catch { /* ignore */ } }
        posts.push({at: Date.now(), method: m, status: r.status(), url: u.replace(/^.*\/index\.php/, '').replace(/csrfToken=[^&]+/, 'csrf').slice(0, 180), body: flat(body, 240)});
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
    let who = null;
    const as = async (u, ctx) => {
        if (who === `${u}@${ctx}`) return;
        await signIn(page, u, {contextPath: ctx}); await idle(page); who = `${u}@${ctx}`;
    };
    /** Wait until the top visible dialog holds `sel` and the dialog count is at least n. */
    const waitTop = (sel, n) => page.waitForFunction(({sel, n}) => {
        const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length);
        return d.length >= n && d[d.length - 1].querySelector(sel);
    }, {sel, n}, {timeout: T});
    const waitCount = (n) => page.waitForFunction((n) => [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length <= n, n, {timeout: 12_000}).then(() => true).catch(() => false);

    // ============================================================ OJS / OPS: the read-only control
    if (!isOMP) {
        if (!on('control')) { await close(); return; }
        if (!S.J) {
            const t = tag('u73k5');
            const isOJS = app.name === 'ojs';
            const FILE = isOJS ? 'article.pdf' : 'preprint.pdf';
            const r = await app.api.createContext({tag: `${t}j`, context: {name: `U73 K5 control ${t}`, contactName: 'K5 Contact', contactEmail: `${t}jc@mail.test`},
                users: [{username: `${t}jmg`, roles: ['manager'], givenName: 'Mona', familyName: 'K5j'}, {username: `${t}jau`, roles: ['author'], givenName: 'Abe', familyName: 'K5j'}]});
            const sub = await app.api.createSubmission({tag: `${t}s`, context: r.path, submitter: `${t}jau`, title: `K5 control ${t}`,
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
            o.menu = await page.locator(VIS).first().evaluate((d) => [...d.querySelectorAll('nav a, nav button')].filter((e) => e.getClientRects().length).map((e) => e.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean)).catch(() => []);
            // "Add galley"
            await page.locator('[data-cy="galley-manager"] button').filter({hasText: /^\s*Add galley\s*$/}).first().click();
            await waitTop('form', 2);
            await idle(page); await sleep(500);
            const s1 = await snap('c-02-add-galley-window');
            o.addWindow = {tabs: (await top().locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim()), text: flat(s1.text && s1.text.dialog, 1500)};
            await top().getByRole('button', {name: 'Close', exact: true}).first().click();
            await waitCount(1); await sleep(700);
            // a galley's "Edit"
            await page.locator('[data-cy="galley-manager"] button[aria-label="More Actions"]').first().click();
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await waitTop('form', 2);
            await idle(page); await sleep(500);
            const s2 = await snap('c-03-edit-galley-window');
            o.editWindow = {tabs: (await top().locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim()), text: flat(s2.text && s2.text.dialog, 1500)};
            o.anyMetadataWords = /Product Identification|Publication Dates|Add Code|Add publication date|Product Composition/.test(`${o.addWindow.text} ${o.editWindow.text} ${o.pageText}`);
            await top().getByRole('button', {name: 'Close', exact: true}).first().click();
            await waitCount(1);
            return o;
        });
        fact('control', o);
        await close();
        return;
    }

    // ============================================================ OMP
    if (on('seed') && !S.P1) {
        const t = tag('u73k5');
        S.t = t;
        const mk = async (k, extra) => {
            const users = [{username: `${t}${k}mg`, roles: ['manager'], givenName: 'Mona', familyName: `K5${k}`},
                {username: `${t}${k}au`, roles: ['author'], givenName: 'Abe', familyName: `K5${k}`}];
            const r = await app.api.createContext({tag: `${t}${k}`, context: {name: `U73 K5 ${k} ${t}`, acronym: 'K5P', country: 'CA', contactName: 'K5 Contact', contactEmail: `${t}${k}c@mail.test`}, users, ...extra});
            return {path: r.path, mg: `${t}${k}mg`, au: `${t}${k}au`};
        };
        S.P1 = await mk('a', {});
        S.P2 = await mk('b', {enableDois: false});
        S.P3 = await mk('c', {enableDois: true, doiPrefix: '10.9999', enabledDoiTypes: ['publication', 'representation']});
        const book = async (P, k, fmts) => {
            const r = await app.api.createSubmission({tag: `${t}${k}`, context: P.path, submitter: P.au, title: `K5 ${k} book ${t}`,
                files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction'], publicationFormats: fmts});
            return {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats};
        };
        S.A = await book(S.P1, 'x', [{name: 'PDF', file: 'article.pdf'}]);
        S.B = await book(S.P2, 'y', [{name: 'PDF'}]);
        S.C = await book(S.P3, 'z', [{name: 'PDF'}]);
        save();
        log('[seed]', JSON.stringify(S));
        note(`ccK5 (${RUN}): scratch presses P1 ${S.P1.path} (default DOIs), P2 ${S.P2.path} (DOIs off), P3 ${S.P3.path} (DOIs on, formats ticked); books A ${S.A.id}/${S.A.pub}, B ${S.B.id}, C ${S.C.id}; managers <path>mg`);
    }
    if (!S.P1) { log('no state; run the seed phase'); await close(); return; }

    // ------------------------------------------------------------ helpers: the Publication Formats page
    const fmtUrl = (P, sub) => app.url(`/index.php/${P.path}/dashboard/editorial?workflowSubmissionId=${sub.id}&workflowMenuKey=publication_${sub.pub}_publicationFormats`);
    const wf = () => page.locator(VIS).first();
    async function openFormats(P, sub, name) {
        await page.goto(fmtUrl(P, sub)); await idle(page);
        await wf().locator('a').filter({hasText: 'Add publication format'}).first().waitFor({timeout: T});
        await wf().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        return name ? snap(name) : null;
    }
    // a format row: its span.label reads "<name><kind>" with no space between (the kind is span.onix_code)
    const fmtRow = (n) => wf().locator('tr.gridRow').filter({has: page.locator('span.label', {has: page.locator('.onix_code'), hasText: new RegExp(`^\\s*${n}`)})}).first();
    const rowCells = (n) => fmtRow(n).locator('td').evaluateAll((tds) => tds.map((td) => td.innerText.replace(/\s+/g, ' ').trim())).catch(() => null);
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
        for (const g of ['identificationCodeGridContainer', 'salesRightsGridContainer', 'marketsGridContainer', 'publicationDateGridContainer']) {
            await f.locator(`[id^="${g}"] table`).first().waitFor({timeout: T}).catch(() => {});
        }
        await idle(page); await sleep(300);
        return f;
    }
    const readMeta = (f) => f.evaluate((form) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.getClientRects().length);
        const grids = [...form.querySelectorAll('div[id*="GridContainer"]')].map((g) => ({
            id: g.id.replace(/\d+$/, ''),
            title: t(g.querySelector('.header h4, .header .pkp_helpers_align_left, .header')),
            links: [...g.querySelectorAll('a')].filter(vis).map(t).filter(Boolean),
            cols: [...g.querySelectorAll('th')].map(t),
            rows: [...g.querySelectorAll('tr.gridRow')].filter(vis).map(t),
            empty: [...g.querySelectorAll('tr.empty, tbody.empty tr')].filter(vis).map(t),
        }));
        const fields = [...form.querySelectorAll('select, input:not([type=hidden]), textarea')].filter((e) => !e.closest('div[id*="GridContainer"]')).map((e) => {
            const lab = e.id ? form.querySelector(`label[for="${e.id}"]`) : null;
            const area = e.closest('fieldset');
            const o = {name: e.name, type: e.type || e.tagName.toLowerCase(), visible: vis(e), label: t(lab), area: area ? t(area.querySelector('legend')) : null,
                required: e.required || e.getAttribute('aria-required') === 'true' || e.classList.contains('required'), maxlength: e.getAttribute('maxlength')};
            if (e.tagName === 'SELECT') {
                const opts = [...e.options];
                o.selected = e.selectedIndex >= 0 ? opts[e.selectedIndex].text.trim() : null; o.value = e.value; o.count = opts.length;
                o.first = opts.slice(0, 8).map((x) => x.text.trim()); o.hasEmpty = opts.some((x) => x.value === '');
            } else if (e.type === 'checkbox') o.checked = e.checked; else o.value = e.value;
            return o;
        });
        const legends = [...form.querySelectorAll('legend, label.sub_label, span.formRequired')].filter(vis).map(t).filter(Boolean);
        const buttons = [...form.querySelectorAll('button, a')].filter(vis).filter((e) => !e.closest('div[id*="GridContainer"]')).map(t).filter(Boolean);
        // the form's words in order, without the lists' options and scripts (innerText carries every option)
        const clone = form.cloneNode(true);
        clone.querySelectorAll('option, script, input[type=hidden]').forEach((e) => e.remove());
        const words = clone.textContent.replace(/\s+/g, ' ').trim();
        return {text: words.slice(0, 5000), fullLength: words.length, grids, fields, legends, buttons};
    });
    const groups = (text) => Object.fromEntries(['Page Counts', 'Returnable Indicator', 'Physical Dimensions', 'Digital Information', 'File Size', 'Digital Technical Protection', 'Enter your own file size value']
        .map((w) => [w, (text || '').includes(w)]));
    async function closeWindow(label) {
        const n0 = await dialogCount();
        const b = top().getByRole('button', {name: 'Close', exact: true}).first();
        await b.click();
        const closed = await waitCount(n0 - 1);
        await sleep(600);
        return {closed, via: label || 'Close'};
    }
    async function cancelLink(scope) {
        const n0 = await dialogCount();
        await (scope || top()).getByRole('link', {name: 'Cancel', exact: true}).first().click();
        const closed = await waitCount(n0 - 1);
        await sleep(600);
        return closed;
    }
    async function saveMeta(f) {
        const t0 = Date.now();
        const n0 = await dialogCount();
        const resp = page.waitForResponse((r) => /updateFormatMetadata/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).first().click();
        const r = await resp;
        await idle(page); await sleep(900);
        const closed = await waitCount(n0 - 1);
        return {status: r ? r.status() : null, windowClosed: closed, dialogsBefore: n0, dialogsAfter: await dialogCount(), posts: since(t0).filter((p) => p.method !== 'GET'), dialogs: dlgSince(t0)};
    }
    const errorsIn = (scope) => scope.evaluate((d) => {
        const t = (e) => e.innerText.replace(/\s+/g, ' ').trim();
        return [...d.querySelectorAll('.pkp_form_error, .pkp_form_error_list, label.error, .error, [id$="-notification"]')].filter((e) => e.getClientRects().length).map((e) => ({cls: e.className.slice(0, 60), text: t(e).slice(0, 300)})).filter((x) => x.text);
    }).catch(() => []);
    const gridRows = (f, g) => f.locator(`div[id^="${g}"] tr.gridRow`).evaluateAll((trs) => trs.filter((e) => e.getClientRects().length).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()))).catch(() => []);
    /** A nested window opened by a link inside the Metadata form; returns its read. */
    async function openSub(f, linkName, formSel) {
        const n0 = await dialogCount();
        await f.getByRole('link', {name: linkName, exact: true}).first().click();
        await waitTop(formSel, n0 + 1);
        await idle(page); await sleep(400);
        return readSub(formSel);
    }
    const readSub = (formSel) => top().evaluate((d, formSel) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.getClientRects().length);
        const form = d.querySelector(formSel);
        const fields = [...form.querySelectorAll('select, input:not([type=hidden]), textarea')].map((e) => {
            const lab = e.id ? d.querySelector(`label[for="${e.id}"]`) : null;
            const sec = e.closest('.section');
            const o = {name: e.name, visible: vis(e), label: t(lab), sectionLabel: sec ? t(sec.querySelector('label')) : null, required: e.required || e.classList.contains('required')};
            if (e.tagName === 'SELECT') { const opts = [...e.options]; o.selected = e.selectedIndex >= 0 ? opts[e.selectedIndex].text.trim() : null; o.options = opts.map((x) => `${x.value}|${x.text.trim()}`); } else o.value = e.value;
            return o;
        });
        return {title: t(d.querySelector('h1, h2')), text: d.innerText.replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n').slice(0, 2500), fields,
            buttons: [...d.querySelectorAll('button, a')].filter(vis).map(t).filter(Boolean)};
    }, formSel);
    /** Press the nested window's "OK"; returns the post, whether it closed, and its errors if not. */
    async function subOK(formSel, opUrl) {
        const t0 = Date.now();
        const n0 = await dialogCount();
        const resp = page.waitForResponse((r) => opUrl.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await top().locator(formSel).getByRole('button', {name: 'OK', exact: true}).first().click();
        const r = await resp;
        await idle(page); await sleep(900);
        const closed = await waitCount(n0 - 1);
        const o = {status: r ? r.status() : null, closed, posts: since(t0).filter((p) => p.method !== 'GET')};
        if (!closed) o.errors = await errorsIn(top());
        return o;
    }
    const optionLabel = (formSel, name, re) => top().locator(`${formSel} select[name="${name}"] option`).evaluateAll((os, src) => {
        const r = new RegExp(src); const m = os.find((o) => r.test(o.text.trim())); return m ? m.value : null;
    }, re.source);
    async function rowAction(f, g, rowText, action) {
        const row = f.locator(`div[id^="${g}"] tr.gridRow`).filter({hasText: rowText}).first();
        const id = await row.getAttribute('id');
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const a = ctl.getByRole('link', {name: action, exact: true}).first();
        if (!(await a.isVisible().catch(() => false))) { await row.locator('a.show_extras').first().click(); await a.waitFor({state: 'visible', timeout: 10_000}); }
        const links = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim()).filter(Boolean));
        await a.click();
        return links;
    }
    /** The delete question after a row's "Delete": its text and buttons; then press `answer`. */
    async function answerDelete(answer) {
        const q = page.locator('[role=dialog]:visible, [role=alertdialog]:visible').filter({hasText: /Are you sure|delete/i}).last();
        await q.waitFor({timeout: 15_000});
        await sleep(300);
        const text = flat(await q.innerText().catch(() => null), 400);
        const buttons = (await q.locator('button').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
        const name = await q.getAttribute('aria-label').catch(() => null);
        await snap(`delete-question-${answer}-${++delN}`);
        const t0 = Date.now();
        await q.getByRole('button', {name: answer, exact: true}).first().click();
        await idle(page); await sleep(1200);
        return {text, buttons, name, answered: answer, posts: since(t0).filter((p) => p.method !== 'GET')};
    }

    let delN = 0;
    // ============================================================ add: Rule 17's new-format window; Print and Remote
    if (on('add') && !S.added) {
        const o = await safe('add', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            const s0 = await openFormats(S.P1, S.A, 'a-01-formats-page');
            o.page = flat(s0.text && s0.text.dialog, 1200);
            o.pdfRow = await rowCells('PDF');
            const addLink = wf().locator('a').filter({hasText: 'Add publication format'}).first();
            await loc(page, 'Publication Formats: "Add publication format"', addLink);
            const create = async (name, fill) => {
                const n0 = await dialogCount();
                await addLink.click();
                await waitTop('form#addPublicationFormatForm', n0 + 1);
                await idle(page); await sleep(400);
                const tabs = (await top().locator('[role=tab]').allInnerTexts()).map((x) => x.trim());
                const s = await snap(`a-02-add-window-${name}`);
                await top().locator('input[name^="name"]').first().fill(name);
                await fill();
                const t0 = Date.now();
                const r = page.waitForResponse((x) => /updateFormat/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
                await top().getByRole('button', {name: 'OK', exact: true}).first().click();
                const resp = await r;
                await idle(page);
                const closed = await waitCount(n0);
                await sleep(800);
                await wf().locator('tr.gridRow').filter({hasText: name}).first().waitFor({timeout: T}).catch(() => {});
                return {tabs, title: flat(s.text && s.text.dialog, 200), status: resp ? resp.status() : null, closed, posts: since(t0).filter((p) => p.method !== 'GET')};
            };
            o.print = await create('Print', async () => { await top().locator('input[name="isPhysicalFormat"]').check(); });
            o.remote = await create('Remote', async () => {
                await top().locator('input[name="remotelyHostedContent"]').check();
                await top().locator('input[name="remoteURL"]').fill('https://example.org/k5-remote');
            });
            await openFormats(S.P1, S.A);
            o.rows = {PDF: await rowCells('PDF'), Print: await rowCells('Print'), Remote: await rowCells('Remote')};
            await snap('a-03-formats-after-adds', {facts: o.rows});
            return o;
        });
        fact('add', o);
        if (!o.error) { S.added = true; save(); }
    }

    // ============================================================ groups: A6 / Rule 17b — which groups each format's tab shows
    if (on('groups')) {
        const res = {};
        await as(S.P1.mg, S.P1.path);
        for (const n of ['PDF', 'Print', 'Remote']) {
            res[n] = await safe(`groups-${n}`, async () => {
                await openFormats(S.P1, S.A);
                const tabs = await openEdit(n);
                const edit = await top().evaluate((d) => {
                    const q = (s) => d.querySelector(s);
                    return {physical: q('input[name="isPhysicalFormat"]') ? q('input[name="isPhysicalFormat"]').checked : null,
                        remote: q('input[name="remotelyHostedContent"]') ? q('input[name="remotelyHostedContent"]').checked : null,
                        remoteURL: q('input[name="remoteURL"]') ? q('input[name="remoteURL"]').value : null,
                        kind: q('select[name="entryKey"]') ? q('select[name="entryKey"]').selectedOptions[0].text : null};
                });
                await snap(`g-01-edit-tab-${n}`, {facts: {tabs, edit}});
                const f = await metaTab();
                const m = await readMeta(f);
                await snap(`g-02-metadata-tab-${n}`, {facts: {groups: groups(m.text)}});
                await closeWindow();
                return {tabs, edit, groups: groups(m.text), visibleFieldNames: m.fields.filter((x) => x.visible).map((x) => x.name)};
            });
        }
        fact('groups', res);
    }

    // ============================================================ meta: Fields (the Metadata tab) and Rule 17 / 17a
    if (on('meta')) {
        const o = {};
        await as(S.P1.mg, S.P1.path);
        // defaults on the new format "Print" (created on screen, never saved on this tab)
        o.defaults = await safe('meta-defaults', async () => {
            await openFormats(S.P1, S.A);
            const tabs = await openEdit('Print');
            const f = await metaTab();
            const m = await readMeta(f);
            await snap('m-01-print-metadata-defaults', {facts: {tabs}});
            await loc(page, 'Format window: tab "Metadata"', top().locator('[role=tab]').filter({hasText: /^\s*Metadata\s*$/}));
            await loc(page, 'Metadata tab: the form', metaForm());
            await loc(page, 'Metadata tab: "Product Composition" list', metaForm().locator('select[name="productCompositionCode"]'));
            await loc(page, 'Metadata tab: "Product Availability" list', metaForm().locator('select[name="productAvailabilityCode"]'));
            await loc(page, 'Metadata tab: "Imprint (Brand Name)" box', metaForm().locator('input[name="imprint"]'));
            await loc(page, 'Metadata tab: "Save"', metaForm().getByRole('button', {name: 'Save', exact: true}));
            await loc(page, 'Metadata tab: "Cancel" (a link)', metaForm().getByRole('link', {name: 'Cancel', exact: true}));
            const full = await metaForm().evaluate((form) => Object.fromEntries(['productCompositionCode', 'productFormDetailCode', 'productAvailabilityCode', 'returnableIndicatorCode', 'heightUnitCode', 'weightUnitCode', 'countryManufactureCode']
                .map((n) => { const s = form.querySelector(`select[name="${n}"]`); return [n, s ? [...s.options].map((x) => `${x.value}|${x.text.trim()}`) : null]; })));
            return {tabs, meta: m, options: {composition: full.productCompositionCode, availability: full.productAvailabilityCode, returnable: full.returnableIndicatorCode, heightUnits: full.heightUnitCode, weightUnits: full.weightUnitCode,
                detailCount: full.productFormDetailCode && full.productFormDetailCode.length, detailFirst: full.productFormDetailCode && full.productFormDetailCode.slice(0, 5), countryFirst: full.countryManufactureCode && full.countryManufactureCode.slice(0, 3), countryCount: full.countryManufactureCode && full.countryManufactureCode.length}};
        });
        // leaving the tab with a changed field: to the "Edit" tab (dismiss, then accept), the close arrow, "Cancel"
        o.leave = await safe('meta-leave', async () => {
            const r = {};
            const f = metaForm();
            await f.locator('input[name="imprint"]').fill('K5 unsaved imprint');
            await f.locator('input[name="imprint"]').press('Tab');
            policy = 'dismiss';
            let t0 = Date.now();
            await top().locator('[role=tab]').filter({hasText: /^\s*Edit\s*$/}).first().click();
            await sleep(1200);
            r.toEditDismiss = {dialogs: dlgSince(t0), selected: await top().locator('[role=tab][aria-selected="true"]').allInnerTexts().catch(() => []), imprint: await metaForm().locator('input[name="imprint"]').inputValue().catch(() => null)};
            await snap('m-02-leave-to-edit-dismissed', {facts: r.toEditDismiss});
            policy = 'accept';
            t0 = Date.now();
            await top().locator('[role=tab]').filter({hasText: /^\s*Edit\s*$/}).first().click();
            await sleep(1500); await idle(page);
            r.toEditAccept = {dialogs: dlgSince(t0), selected: await top().locator('[role=tab][aria-selected="true"]').allInnerTexts().catch(() => [])};
            await snap('m-03-leave-to-edit-accepted', {facts: r.toEditAccept});
            policy = 'dismiss';
            const f2 = await metaTab();
            r.backOnMetadata = {imprint: await f2.locator('input[name="imprint"]').inputValue().catch(() => null)};
            await snap('m-04-back-on-metadata', {facts: r.backOnMetadata});
            // the window's close arrow (its header "Close") with a change; a confirm would be dismissed (the window stays)
            await f2.locator('input[name="imprint"]').fill('K5 unsaved imprint 2');
            await f2.locator('input[name="imprint"]').press('Tab');
            await sleep(300);
            t0 = Date.now();
            const n0 = await dialogCount();
            const closeBtn = top().getByRole('button', {name: 'Close', exact: true}).last();
            await loc(page, 'Format window: header "Close" (the close arrow)', closeBtn);
            await closeBtn.click();
            await sleep(1500);
            r.closeDismiss = {dialogs: dlgSince(t0), stillOpen: (await dialogCount()) === n0, dialogsBefore: n0, dialogsAfter: await dialogCount()};
            await snap('m-05-close-arrow-with-change', {facts: r.closeDismiss});
            if (r.closeDismiss.stillOpen) await cancelLink(metaForm());
            // what the page kept after the close arrow: reopen on the same page
            await openEdit('Print');
            let f3 = await metaTab();
            r.afterCloseImprint = await f3.locator('input[name="imprint"]').inputValue();
            await snap('m-06-reopened-after-close-arrow', {facts: {imprint: r.afterCloseImprint}});
            // the tab's "Cancel" with a change
            await f3.locator('input[name="imprint"]').fill('K5 unsaved imprint 3');
            await f3.locator('input[name="imprint"]').press('Tab');
            await sleep(300);
            t0 = Date.now();
            r.cancelClosed = await cancelLink(metaForm());
            r.cancelDialogs = dlgSince(t0);
            await snap('m-07-after-cancel-link-with-change', {facts: {cancelClosed: r.cancelClosed, dialogs: r.cancelDialogs}});
            if (!r.cancelClosed) await closeBtn.click().catch(() => {});
            await openEdit('Print');
            f3 = await metaTab();
            r.reopenedImprint = await f3.locator('input[name="imprint"]').inputValue();
            await snap('m-07b-reopened-after-cancel', {facts: {imprint: r.reopenedImprint}});
            // control for the close arrow: the same window's "Edit" tab with a changed "Name" (Rule 4a's case)
            await top().locator('[role=tab]').filter({hasText: /^\s*Edit\s*$/}).first().click();
            await top().locator('form#addPublicationFormatForm input[name^="name"]').first().waitFor({state: 'visible', timeout: T});
            await idle(page);
            await top().locator('form#addPublicationFormatForm input[name^="name"]').first().fill('Print changed');
            await top().locator('form#addPublicationFormatForm input[name^="name"]').first().press('Tab');
            await sleep(300);
            t0 = Date.now();
            const n1 = await dialogCount();
            await top().getByRole('button', {name: 'Close', exact: true}).last().click();
            await sleep(1500);
            r.editTabClose = {dialogs: dlgSince(t0), stillOpen: (await dialogCount()) === n1};
            await snap('m-07c-edit-tab-close-arrow-with-change', {facts: r.editTabClose});
            if (r.editTabClose.stillOpen) await cancelLink(top().locator('form#addPublicationFormatForm'));
            await openEdit('Print');
            await metaTab();
            return r;
        });
        // "Save" with "Product Composition" empty (Imprint typed): the refusal, then nothing kept
        o.refusal = await safe('meta-refusal', async () => {
            const r = {};
            const f = metaForm();
            await f.locator('input[name="imprint"]').fill('K5 refused imprint');
            r.save = await saveMeta(f);
            r.errors = await errorsIn(top());
            r.formText = flat(await metaForm().innerText().catch(() => null), 3000);
            r.composition = await metaForm().locator('select[name="productCompositionCode"]').evaluate((s) => s.selectedOptions[0] ? s.selectedOptions[0].text : null).catch(() => null);
            const s = await snap('m-08-refusal-composition-empty', {facts: {save: r.save, errors: r.errors}});
            r.notices = s.notices;
            // the refusal's place: top of the form, beside the field?
            r.errorPlaces = await metaForm().evaluate((form) => [...form.querySelectorAll('.pkp_form_error, label.error, .error')].filter((e) => e.getClientRects().length)
                .map((e) => ({tag: e.tagName, cls: e.className, text: e.innerText.replace(/\s+/g, ' ').trim().slice(0, 200), y: Math.round(e.getBoundingClientRect().top)}))).catch(() => []);
            r.compositionY = await metaForm().locator('select[name="productCompositionCode"]').evaluate((e) => Math.round(e.getBoundingClientRect().top)).catch(() => null);
            await cancelLink(metaForm());
            await openEdit('Print');
            const f2 = await metaTab();
            r.afterReopen = {imprint: await f2.locator('input[name="imprint"]').inputValue(), composition: await f2.locator('select[name="productCompositionCode"]').evaluate((s) => s.value)};
            await snap('m-09-reopened-after-refusal', {facts: r.afterReopen});
            return r;
        });
        // "Product Availability": can it be emptied at all?
        o.availabilityEmpty = await safe('meta-avail-empty', async () => metaForm().locator('select[name="productAvailabilityCode"] option').evaluateAll((os) => ({hasEmpty: os.some((x) => x.value === ''), first: os.slice(0, 3).map((x) => `${x.value}|${x.text.trim()}`)})));
        // a valid "Save" on Print: composition 00, the other fields typed, availability left on its default
        o.save = await safe('meta-save', async () => {
            const r = {};
            const f = metaForm();
            await f.locator('select[name="productCompositionCode"]').selectOption('00');
            await f.locator('input[name="imprint"]').fill('K5 Imprint');
            await f.locator('input[name="frontMatter"]').fill('xii');
            await f.locator('input[name="backMatter"]').fill('abc');
            await f.locator('input[name="height"]').fill('tall');
            await f.locator('input[name="weight"]').fill('heavy');
            r.availabilityChosen = await f.locator('select[name="productAvailabilityCode"]').evaluate((s) => s.selectedOptions[0].text);
            r.save = await saveMeta(f);
            const s = await snap('m-10-print-saved', {facts: r.save});
            r.notices = s.notices;
            r.row = await rowCells('Print');
            // same page: reopen
            await openEdit('Print');
            const f2 = await metaTab();
            const readBack = async (ff) => ff.evaluate((form) => {
                const v = (n) => { const e = form.querySelector(`[name="${n}"]`); return e ? (e.tagName === 'SELECT' ? (e.selectedOptions[0] ? e.selectedOptions[0].text.trim() : null) : e.value) : null; };
                return {composition: v('productCompositionCode'), availability: v('productAvailabilityCode'), imprint: v('imprint'), frontMatter: v('frontMatter'), backMatter: v('backMatter'), height: v('height'), weight: v('weight'), returnable: v('returnableIndicatorCode'), country: v('countryManufactureCode')};
            });
            r.samePage = await readBack(f2);
            await snap('m-11-print-reopened-same-page', {facts: r.samePage});
            await cancelLink(metaForm());
            // after a reload
            await openFormats(S.P1, S.A);
            r.rowAfterReload = await rowCells('Print');
            await openEdit('Print');
            const f3 = await metaTab();
            r.afterReload = await readBack(f3);
            await snap('m-12-print-reopened-after-reload', {facts: {row: r.rowAfterReload, read: r.afterReload}});
            await cancelLink(metaForm());
            return r;
        });
        // PDF (seeded "Available"): Product Availability "Not yet available (10)", Imprint typed to 300 characters
        o.pdf = await safe('meta-pdf', async () => {
            const r = {};
            await openFormats(S.P1, S.A);
            r.rowBefore = await rowCells('PDF');
            await openEdit('PDF');
            const f = await metaTab();
            await f.locator('select[name="productCompositionCode"]').selectOption('00');
            await f.locator('select[name="productAvailabilityCode"]').selectOption('10');
            r.availabilityChosen = await f.locator('select[name="productAvailabilityCode"]').evaluate((s) => s.selectedOptions[0].text);
            const box = f.locator('input[name="imprint"]');
            r.imprintMaxlength = await box.getAttribute('maxlength');
            await box.click();
            await box.pressSequentially('y'.repeat(300), {delay: 0});
            r.imprintTypedLength = (await box.inputValue()).length;
            r.save = await saveMeta(f);
            const s = await snap('m-13-pdf-saved', {facts: r});
            r.notices = s.notices;
            r.rowSamePage = await rowCells('PDF');
            await openFormats(S.P1, S.A);
            r.rowAfterReload = await rowCells('PDF');
            await openEdit('PDF');
            const f2 = await metaTab();
            r.afterReload = {availability: await f2.locator('select[name="productAvailabilityCode"]').evaluate((s) => s.selectedOptions[0].text), imprintLength: (await f2.locator('input[name="imprint"]').inputValue()).length};
            await snap('m-14-pdf-after-reload', {facts: {row: r.rowAfterReload, read: r.afterReload}});
            await cancelLink(metaForm());
            return r;
        });
        fact('meta', o);
    }

    // ============================================================ codes: Rule 18 on Print (P1, DOIs on by default)
    const CF = 'form#addIdentificationCodeForm';
    const G_CODE = 'identificationCodeGridContainer';
    if (on('codes')) {
        const o = await safe('codes', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openFormats(S.P1, S.A);
            await openEdit('Print');
            let f = await metaTab();
            o.gridBefore = (await readMeta(f)).grids.find((g) => g.id.startsWith(G_CODE));
            await loc(page, 'Metadata tab: "Add Code"', f.getByRole('link', {name: 'Add Code', exact: true}));
            o.window = await openSub(f, 'Add Code', CF);
            await snap('k-01-add-code-window', {facts: {options: o.window.fields.find((x) => x.name === 'code')}});
            await loc(page, 'Code window: "Code Value" box', top().locator(`${CF} input[name="value"]`));
            await loc(page, 'Code window: "ONIX Code Type" list', top().locator(`${CF} select[name="code"]`));
            await loc(page, 'Code window: "OK"', top().locator(CF).getByRole('button', {name: 'OK', exact: true}));
            const codeOpts = o.window.fields.find((x) => x.name === 'code').options;
            o.doiOffered = codeOpts.some((x) => /^06\|/.test(x));
            o.isbn10 = codeOpts.find((x) => /^02\|/.test(x)) || null;
            o.isbn13 = codeOpts.find((x) => /^15\|/.test(x)) || null;
            o.codeCount = codeOpts.length;
            // empty value
            o.empty = await subOK(CF, /updateCode/);
            await snap('k-02-code-empty-refused', {facts: o.empty});
            // ISBN-13 9780000000002
            await top().locator(`${CF} select[name="code"]`).selectOption('15');
            await top().locator(`${CF} input[name="value"]`).fill('9780000000002');
            o.add13 = await subOK(CF, /updateCode/);
            let s = await snap('k-03-code-isbn13-added', {facts: o.add13});
            o.add13.notices = s.notices;
            f = metaForm();
            o.rowsAfter13 = await gridRows(f, G_CODE);
            // again: is ISBN-13 still offered? then ISBN-10 with a value that is no ISBN
            o.window2 = await openSub(f, 'Add Code', CF);
            o.isbn13OfferedAgain = o.window2.fields.find((x) => x.name === 'code').options.some((x) => /^15\|/.test(x));
            await snap('k-04-add-code-again', {facts: {isbn13OfferedAgain: o.isbn13OfferedAgain}});
            await top().locator(`${CF} select[name="code"]`).selectOption('02');
            await top().locator(`${CF} input[name="value"]`).fill('not-an-isbn');
            o.add10 = await subOK(CF, /updateCode/);
            s = await snap('k-05-code-isbn10-not-an-isbn', {facts: o.add10});
            o.add10.notices = s.notices;
            o.rowsAfter10 = await gridRows(metaForm(), G_CODE);
            // a row's Edit: its own type offered and chosen
            o.editLinks = await rowAction(metaForm(), G_CODE, '9780000000002', 'Edit');
            await waitTop(CF, 3);
            await idle(page); await sleep(400);
            o.editWindow = await readSub(CF);
            const eo = o.editWindow.fields.find((x) => x.name === 'code');
            o.editOwnTypeOffered = eo.options.some((x) => /^15\|/.test(x));
            o.editSelected = eo.selected;
            o.editIsbn10Offered = eo.options.some((x) => /^02\|/.test(x));
            await snap('k-06-code-edit-window', {facts: {selected: eo.selected, own: o.editOwnTypeOffered, isbn10: o.editIsbn10Offered}});
            await top().locator(`${CF} input[name="value"]`).fill('9780000000019');
            o.edit = await subOK(CF, /updateCode/);
            s = await snap('k-07-code-edited', {facts: o.edit});
            o.edit.notices = s.notices;
            o.rowsAfterEdit = await gridRows(metaForm(), G_CODE);
            // Delete: Cancel first, then OK
            o.deleteLinks = await rowAction(metaForm(), G_CODE, 'not-an-isbn', 'Delete');
            o.deleteCancel = await answerDelete('Cancel');
            o.rowsAfterCancel = await gridRows(metaForm(), G_CODE);
            await rowAction(metaForm(), G_CODE, 'not-an-isbn', 'Delete');
            o.deleteOK = await answerDelete('OK');
            s = await snap('k-08-code-deleted', {facts: o.deleteOK});
            o.deleteOK.notices = s.notices;
            o.rowsAfterDelete = await gridRows(metaForm(), G_CODE);
            // the lists save on their own: leave with the tab's "Cancel", reopen (same page), then after a reload
            o.cancelClosed = await cancelLink(metaForm());
            await openEdit('Print');
            o.editTabIsbn = await top().evaluate((d) => ({isbn13: d.querySelector('input[name="isbn13"]') ? d.querySelector('input[name="isbn13"]').value : null, isbn10: d.querySelector('input[name="isbn10"]') ? d.querySelector('input[name="isbn10"]').value : null}));
            f = await metaTab();
            o.rowsReopened = await gridRows(f, G_CODE);
            await snap('k-09-codes-reopened-same-page', {facts: {rows: o.rowsReopened, editTabIsbn: o.editTabIsbn}});
            await cancelLink(metaForm());
            await openFormats(S.P1, S.A);
            await openEdit('Print');
            f = await metaTab();
            o.rowsAfterReload = await gridRows(f, G_CODE);
            await snap('k-10-codes-after-reload', {facts: {rows: o.rowsAfterReload}});
            // sweep: the other two lists' add windows (ONIX's), opened and left
            for (const [link, sel, key] of [['Add Sales Rights', 'form', 'salesRights'], ['Add Market', 'form', 'market']]) {
                const has = await f.getByRole('link', {name: link, exact: true}).count();
                if (!has) { o[`${key}Link`] = 'absent'; continue; }
                const n0 = await dialogCount();
                await f.getByRole('link', {name: link, exact: true}).first().click();
                await waitTop('form', n0 + 1).catch(() => {});
                await idle(page); await sleep(500);
                const ss = await snap(`k-11-sweep-${key}-window`);
                o[`${key}Window`] = flat(ss.text && ss.text.dialog, 1200);
                await cancelLink();
            }
            await cancelLink(metaForm());
            return o;
        });
        fact('codes', o);
    }

    // ============================================================ dates: Rule 19 on Print; A7 on PDF
    const DF = 'form#addPubDateForm';
    const G_DATE = 'publicationDateGridContainer';
    if (on('dates')) {
        const o = await safe('dates', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            await openFormats(S.P1, S.A);
            await openEdit('Print');
            let f = await metaTab();
            await loc(page, 'Metadata tab: "Add publication date"', f.getByRole('link', {name: 'Add publication date', exact: true}));
            o.window = await openSub(f, 'Add publication date', DF);
            const fmt = o.window.fields.find((x) => x.name === 'dateFormat');
            const role = o.window.fields.find((x) => x.name === 'role');
            o.defaults = {dateFormat: fmt.selected, role: role.selected, formatOptions: fmt.options, roleFirst: role.options.slice(0, 5), roleCount: role.options.length};
            await snap('d-01-add-date-window', {facts: o.defaults});
            await loc(page, 'Date window: "Date" box', top().locator(`${DF} input[name="date"]`));
            await loc(page, 'Date window: "Date Format" list', top().locator(`${DF} select[name="dateFormat"]`));
            await loc(page, 'Date window: "Role" list', top().locator(`${DF} select[name="role"]`));
            const plain = fmt.options.find((x) => /\|YYYYMMDD$/.test(x)).split('|')[0];
            const yyyy = fmt.options.find((x) => /\|YYYY$/.test(x)).split('|')[0];
            const str = (fmt.options.find((x) => /string/i.test(x)) || '').split('|')[0] || null;
            o.codes = {plain, yyyy, str};
            const tryDate = async (label, format, value, roleCode) => {
                if (format) await top().locator(`${DF} select[name="dateFormat"]`).selectOption(format);
                if (roleCode) await top().locator(`${DF} select[name="role"]`).selectOption(roleCode);
                await top().locator(`${DF} input[name="date"]`).fill(value);
                const t0 = Date.now();
                const r = await subOK(DF, /updateDate/);
                if (!r.closed) {
                    // a refusal: what the window shows, and every page notice for 6 s more
                    await sleep(6000);
                    r.requiredLines = ((await top().innerText().catch(() => '')) || '').split('Required fields are marked with an asterisk').length - 1;
                    r.windowErrors = await errorsIn(top());
                }
                const s = await snap(`d-${label}`, {facts: r});
                r.notices = s.notices;
                r.noticesWhileOpen = s.notices;
                r.value = value; r.format = format; r.role = roleCode || null; r.ms = Date.now() - t0;
                return r;
            };
            // an empty "Date"
            o.empty = await tryDate('01b-empty', plain, '');
            o.seven = await tryDate('02-yyyymmdd-7', plain, '2026091');
            o.eight = await tryDate('03-yyyymmdd-8', plain, '20260915', '01');
            o.rows1 = await gridRows(metaForm(), G_DATE);
            // again: is "Publication date (01)" still offered?
            o.window2 = await openSub(metaForm(), 'Add publication date', DF);
            const role2 = o.window2.fields.find((x) => x.name === 'role');
            o.pubDate01Again = role2.options.some((x) => /^01\|/.test(x));
            o.window2Defaults = {dateFormat: o.window2.fields.find((x) => x.name === 'dateFormat').selected, role: role2.selected};
            await snap('d-04-add-date-again', {facts: {pubDate01Again: o.pubDate01Again, defaults: o.window2Defaults}});
            o.yyyy5 = await tryDate('05-yyyy-5', yyyy, '20261');
            o.yyyy4 = await tryDate('06-yyyy-4', yyyy, '2026');
            o.window3 = await openSub(metaForm(), 'Add publication date', DF);
            o.notADate = await tryDate('07-yyyymmdd-letters', plain, 'abcdefgh');
            o.window4 = await openSub(metaForm(), 'Add publication date', DF);
            o.multibyte8 = await tryDate('08-yyyymmdd-8chars-9bytes', plain, '2026091é');
            if (!o.multibyte8.closed) o.multibyte7 = await tryDate('09-yyyymmdd-7chars-8bytes', plain, '202609é');
            if (str) {
                o.window5 = await openSub(metaForm(), 'Add publication date', DF);
                o.text = await tryDate('10-text-string', str, 'hello');
            }
            o.rows2 = await gridRows(metaForm(), G_DATE);
            await snap('d-11-dates-list', {facts: {rows: o.rows2}});
            // a row's Edit: its own role offered and chosen
            o.editLinks = await rowAction(metaForm(), G_DATE, '20260915', 'Edit');
            await waitTop(DF, 3);
            await idle(page); await sleep(400);
            o.editWindow = await readSub(DF);
            const er = o.editWindow.fields.find((x) => x.name === 'role');
            o.editRole = {selected: er.selected, own01Offered: er.options.some((x) => /^01\|/.test(x)), format: o.editWindow.fields.find((x) => x.name === 'dateFormat').selected};
            await snap('d-12-date-edit-window', {facts: o.editRole});
            o.edit = await tryDate('13-date-edited', null, '20260916');
            // Delete
            o.deleteLinks = await rowAction(metaForm(), G_DATE, 'abcdefgh', 'Delete');
            o.deleteOK = await answerDelete('OK');
            const s = await snap('d-14-date-deleted', {facts: o.deleteOK});
            o.deleteOK.notices = s.notices;
            o.rows3 = await gridRows(metaForm(), G_DATE);
            await cancelLink(metaForm());
            // after a reload
            await openFormats(S.P1, S.A);
            await openEdit('Print');
            f = await metaTab();
            o.rowsAfterReload = await gridRows(f, G_DATE);
            await snap('d-15-dates-after-reload', {facts: {rows: o.rowsAfterReload}});
            await cancelLink(metaForm());
            // A7: on PDF, a date typed without touching "Date Format"
            await openEdit('PDF');
            f = await metaTab();
            o.hijriWindow = await openSub(f, 'Add publication date', DF);
            await top().locator(`${DF} input[name="date"]`).fill('20261001');
            o.hijri = await subOK(DF, /updateDate/);
            o.hijriRows = await gridRows(metaForm(), G_DATE);
            await snap('d-16-pdf-date-default-format', {facts: {save: o.hijri, rows: o.hijriRows}});
            // what the row's Edit reads back as its format
            await rowAction(metaForm(), G_DATE, '20261001', 'Edit');
            await waitTop(DF, 3);
            await idle(page); await sleep(400);
            o.hijriEdit = (await readSub(DF)).fields.find((x) => x.name === 'dateFormat').selected;
            await snap('d-17-pdf-date-edit-format', {facts: {format: o.hijriEdit}});
            await cancelLink();
            await cancelLink(metaForm());
            return o;
        });
        fact('dates', o);
    }

    // ============================================================ doi: Rule 18's DOI sentence at both ends (P2 off, P3 on with formats)
    if (on('doi')) {
        const res = {};
        for (const [k, P, sub] of [['P1', S.P1, S.A], ['P2', S.P2, S.B], ['P3', S.P3, S.C]]) {
            res[k] = await safe(`doi-${k}`, async () => {
                const r = {};
                await as(P.mg, P.path);
                // the press's DOIs tab, read only
                await page.goto(app.url(`/index.php/${P.path}/management/settings/distribution#dois`)); await idle(page);
                await page.locator('input[name="enableDois"]').first().waitFor({timeout: T}).catch(() => {});
                await idle(page); await sleep(500);
                r.dois = await page.evaluate(() => ({enable: [...document.querySelectorAll('input[name="enableDois"]')].map((e) => e.checked),
                    types: [...document.querySelectorAll('input[name="enabledDoiTypes"]')].filter((e) => e.getClientRects().length).map((e) => `${e.value}:${e.checked}`)}));
                await snap(`i-01-${k}-dois-tab`, {facts: r.dois});
                if (k === 'P1') return r;
                await openFormats(P, sub);
                await openEdit('PDF');
                const f = await metaTab();
                const w = await openSub(f, 'Add Code', CF);
                const opts = w.fields.find((x) => x.name === 'code').options;
                r.doiOffered = opts.some((x) => /^06\|/.test(x));
                r.doiOption = opts.find((x) => /^06\|/.test(x)) || null;
                r.count = opts.length;
                await snap(`i-02-${k}-add-code-window`, {facts: {doiOffered: r.doiOffered}});
                await cancelLink();
                await cancelLink(metaForm());
                return r;
            });
        }
        fact('doi', res);
    }

    // ============================================================ onix: A7's feed (the ONIX 3.0 export of book A)
    if (on('onix')) {
        const o = await safe('onix', async () => {
            const o = {};
            await as(S.P1.mg, S.P1.path);
            const onixUrl = app.url(`/index.php/${S.P1.path}/management/importexport/plugin/Onix30ExportPlugin`);
            await page.goto(onixUrl); await idle(page);
            let s = await snap('o-01-onix-page');
            o.reminder = /missing some required information/i.test((s.text && s.text.main) || '');
            if (o.reminder) {
                await page.goto(app.url(`/index.php/${S.P1.path}/management/settings/context`)); await idle(page);
                await page.getByRole('tab', {name: 'Masthead'}).first().click().catch(() => {});
                await page.locator('[name="publisher"]').first().waitFor({timeout: T});
                await idle(page);
                await page.locator('[name="publisher"]').first().fill('K5 Publisher');
                await page.locator('[name="location"]').first().fill('Vancouver');
                const ct = page.locator('[name="codeType"]').first();
                const v = await ct.locator('option').evaluateAll((os) => os.map((x) => x.value).filter(Boolean));
                await ct.selectOption(v[0]);
                await page.locator('[name="codeValue"]').first().fill('K5CODE');
                // a scratch press has no country unless seeded with one; the Masthead refuses to save without it
                const country = page.locator('select[name="country"]').first();
                if (await country.count() && !(await country.inputValue())) await country.selectOption('CA');
                await page.locator('form').filter({has: page.locator('[name=publisher]')}).getByRole('button', {name: 'Save'}).first().click();
                await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 15_000}).catch(() => { o.mastheadSaved = 'not seen'; });
                await snap('o-02-masthead-saved');
                await page.goto(onixUrl); await idle(page);
                s = await snap('o-03-onix-page-filled');
            }
            const tab = page.locator('#export-tab');
            const exportOnce = async (validation, name) => {
                await page.goto(onixUrl); await idle(page);
                await tab.locator('.listPanel__item').first().waitFor({timeout: T});
                await idle(page); await sleep(500);
                const items = tab.locator('.listPanel__item');
                const n = await items.count();
                const ticked = [];
                for (let i = 0; i < n; i++) {
                    const it = items.nth(i);
                    const txt = await it.innerText();
                    if (txt.includes('K5 x book')) { await it.locator('input[type=checkbox]').check(); ticked.push(flat(txt, 120)); }
                }
                const vbox = tab.locator('input[name="validation"]').first();
                const vBefore = await vbox.isChecked().catch(() => null);
                if (await vbox.count()) await vbox.setChecked(validation);
                const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
                const t0 = Date.now();
                await tab.getByRole('button', {name: 'Export Submissions', exact: true}).click();
                for (let i = 0; i < 60; i++) { await sleep(500); if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) break; }
                await idle(page); await sleep(1000);
                const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
                await panel.getByText(/Download Exported File|failed|error/i).first().waitFor({timeout: 60_000}).catch(() => {});
                await snap(name);
                return {listCount: n, ticked, validationBoxBefore: vBefore, validation, results: flat(await panel.innerText().catch(() => null), 1200), posts: since(t0).filter((p) => p.method !== 'GET')};
            };
            let panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
            const readXml = (xml, key) => {
                fs.writeFileSync(path.join(outDir(), `${RUN}-${key}-${app.name}.xml`), xml);
                return {publishingDates: [...xml.matchAll(/<(?:onix:)?PublishingDate>[\s\S]*?<\/(?:onix:)?PublishingDate>/g)].map((m) => flat(m[0], 300)),
                    dateTags: [...xml.matchAll(/<(?:onix:)?Date [^>]*>[^<]*<\/(?:onix:)?Date>/g)].map((m) => m[0]).slice(0, 20),
                    productIds: [...xml.matchAll(/<(?:onix:)?ProductIdentifier>[\s\S]*?<\/(?:onix:)?ProductIdentifier>/g)].map((m) => flat(m[0], 300)),
                    products: (xml.match(/<(?:onix:)?Product>/g) || []).length, bytes: xml.length};
            };
            // the Native XML export carries each format's ONIX product (the format's catalog data)
            const nativeOnce = async (validation, name) => {
                const r = {validation};
                await page.goto(app.url(`/index.php/${S.P1.path}/management/importexport/plugin/NativeImportExportPlugin`)); await idle(page);
                await page.getByRole('tab', {name: 'Export', exact: true}).first().click();
                const et = page.locator('#exportSubmissions-tab');
                await et.locator('.listPanel__item').first().waitFor({timeout: T});
                await idle(page); await sleep(500);
                const items = et.locator('.listPanel__item');
                for (let i = 0; i < await items.count(); i++) {
                    const it = items.nth(i);
                    if ((await it.innerText()).includes('K5 x book')) await it.locator('input[type=checkbox]').check();
                }
                const vbox = et.locator('input[name="validation"]').first();
                r.validationBoxBefore = await vbox.isChecked().catch(() => null);
                if (await vbox.count()) await vbox.setChecked(validation);
                const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
                await et.getByRole('button', {name: 'Export Submissions', exact: true}).click();
                for (let i = 0; i < 60; i++) { await sleep(500); if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) break; }
                await idle(page); await sleep(1000);
                panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
                await panel.getByText(/Download Exported File|failed|error/i).first().waitFor({timeout: 60_000}).catch(() => {});
                await snap(name);
                r.results = flat(await panel.innerText().catch(() => null), 2000);
                const b = panel.getByRole('button', {name: 'Download Exported File'});
                if (await b.count()) {
                    const dl = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
                    await b.first().click();
                    const d = await dl;
                    if (d) { r.file = d.suggestedFilename(); Object.assign(r, readXml(fs.readFileSync(await d.path(), 'utf8'), `native-export-${validation ? 'v' : 'nov'}`)); } else r.download = 'none';
                }
                return r;
            };
            // with Print's free-text page counts and dimensions (the meta phase typed "xii", "abc", "tall", "heavy")
            o.native = await nativeOnce(true, 'o-06-native-export-free-text');
            // the same four typed as numbers on the Metadata tab, then the export again
            o.fix = await (async () => {
                await as(S.P1.mg, S.P1.path);
                await openFormats(S.P1, S.A);
                await openEdit('Print');
                const f = await metaTab();
                const before = {frontMatter: await f.locator('input[name="frontMatter"]').inputValue(), backMatter: await f.locator('input[name="backMatter"]').inputValue(), height: await f.locator('input[name="height"]').inputValue(), weight: await f.locator('input[name="weight"]').inputValue()};
                await f.locator('input[name="frontMatter"]').fill('12');
                await f.locator('input[name="backMatter"]').fill('3');
                await f.locator('input[name="height"]').fill('240');
                await f.locator('input[name="weight"]').fill('500');
                if (!(await f.locator('select[name="productCompositionCode"]').inputValue())) await f.locator('select[name="productCompositionCode"]').selectOption('00');
                const sv = await saveMeta(f);
                await snap('o-07-print-numbers-saved', {facts: sv});
                return {before, save: {closed: sv.windowClosed, posts: sv.posts.map((p) => `${p.method} ${p.status} ${p.url.slice(-40)}`)}};
            })();
            o.nativeNumbers = await nativeOnce(true, 'o-08-native-export-numbers');
            o.withValidation = await exportOnce(true, 'o-09-onix-export-validation-on');
            o.withoutValidation = await exportOnce(false, 'o-10-onix-export-validation-off');
            await page.goto(onixUrl); await idle(page);
            panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
            const btn = panel.getByRole('button', {name: 'Download Exported File'});
            if (await btn.count()) {
                const dl = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
                await btn.first().click();
                const d = await dl;
                if (d) {
                    const p = await d.path();
                    const xml = fs.readFileSync(p, 'utf8');
                    fs.writeFileSync(path.join(outDir(), `${RUN}-onix-export-${app.name}.xml`), xml);
                    o.file = d.suggestedFilename();
                    o.publishingDates = [...xml.matchAll(/<PublishingDate>[\s\S]*?<\/PublishingDate>/g)].map((m) => flat(m[0], 300));
                    o.productIds = [...xml.matchAll(/<ProductIdentifier>[\s\S]*?<\/ProductIdentifier>/g)].map((m) => flat(m[0], 300));
                    o.products = (xml.match(/<Product>/g) || []).length;
                    o.extent = [...xml.matchAll(/<(Extent|Measure|ImprintName|ProductAvailability|ProductComposition)>[\s\S]*?<\/\1>/g)].map((m) => flat(m[0], 200)).slice(0, 20);
                } else o.download = 'none';
            }
            return o;
        });
        fact('onix', o);
    }

    await close();
});
