// U74 "ONIX metadata & export" claim check, chunk K2: the workflow's
// "Marketing" › "Audience" and "Representatives" pages, the representative
// window (Fields), Rules 1–8, A3. OMP drives the screens; OJS and OPS get
// the read-only absence control (phase X).
//
// Run (every phase, or K2_PHASE=A,R,... for some; K2_RUN names the facts file):
//   PROBE_FEATURE=U74 PROBE_AGENT=ccK2 K2_RUN=run1 node bin/probe.js all shared/playwright/checks/U74/K2/k2.js
// Phases (each run seeds its own scratch press, tag prefix u74k2):
//   A  "Audience": a new book's five lists, the td6 save and reload, a range with no
//      qualifier, the qualifier axis, leaving with an unsaved choice (Rules 2–4, A3)
//   R  "Representatives" and the representative window: the empty table, the window's
//      fields, Rules 5–7 (td7, td12), Cancel with a change
//   D  deleting a representative (Rule 8, td13), across two versions
//   V  the pages across "Create New Version" and its publish (Rule 1, td11)
//   N  A3's lean: an empty audience list in the Native XML export's ONIX product
//   X  OJS / OPS: the workflow's "Marketing" addresses on a journal and a server
// Outputs: .reports/U74/ccK2/ (snapshots <run>-<name>-<app>.json + .png, facts-<run>-<app>.json).
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, idle, tag} = require('../../../probe');

const PHASES = (process.env.K2_PHASE || 'A,R,D,V,N,X').split(',').map((s) => s.trim().toUpperCase());
const RUN = process.env.K2_RUN || 'run1';
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

async function post(app, route, body) {
    const r = await fetch(app.url(`/index.php/index/api/v1/_test/${route}`), {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-Test-Key': app.testApiKey},
        body: JSON.stringify(body),
    });
    return {status: r.status, json: await r.json().catch(() => null)};
}
async function must(app, route, body) {
    const r = await post(app, route, body);
    if (r.status !== 200) throw new Error(`${route} ${r.status} ${JSON.stringify(r.json).slice(0, 600)}`);
    return r.json;
}

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const facts = {};
    const factsName = `facts-${RUN}`;
    const fact = (k, v) => { facts[k] = v; record(factsName, {[k]: v}, {merge: true}); console.log(`[k2 ${app.name}] ${k}: ${JSON.stringify(v).slice(0, 400)}`); };
    const guard = async (label, fn) => {
        try { return await fn(); } catch (e) { fact(`ERROR ${label}`, String(e.stack || e).slice(0, 1200)); return null; }
    };
    const db = (sql) => {
        try {
            return execFileSync('psql', ['-d', `${app.name}_test`, '-tA', '-F', '|', '-c', sql], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim().split('\n').filter(Boolean);
        } catch (e) { return [`SQL ERROR ${flat(e.stderr, 300)}`]; }
    };

    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    const dialogsSince = (n) => dialogs.slice(n);
    const requests = [];
    page.on('request', (r) => {
        const u = r.url();
        if (r.method() !== 'GET' && !/_test\//.test(u) && /(representative|\/api\/v1\/submissions|market|publication-format)/i.test(u)) {
            requests.push({m: r.method(), o: r.headers()['x-http-method-override'] || null, u: u.replace(/^.*\/index\.php/, ''), body: flat(decodeURIComponent((r.postData() || '').replace(/\+/g, ' ')).replace(/csrfToken=[^&]+/, 'csrfToken=…'), 600)});
        }
    });
    const responses = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (r.request().method() !== 'GET' && !/_test\//.test(u) && /(representative|\/api\/v1\/submissions|market)/i.test(u)) {
            let body = null;
            try { body = flat(await r.text(), 500); } catch { body = null; }
            responses.push({s: r.status(), u: u.replace(/^.*\/index\.php/, ''), body});
        }
    });
    const snap = async (name, extra) => {
        const s = await screen(page);
        record(`${RUN}-${name}`, extra ? {...s, extra} : s);
        await shot(page, `${RUN}-${name}`);
        return {file: `${RUN}-${name}-${app.name}.json`, notices: s.notices, dialog: s.text.dialog ? flat(s.text.dialog, 3000) : null};
    };

    const P = tag('u74k2');
    const mg = `${P}mg`;
    let wf;
    const editorialUrl = (sid, key) => app.url(`/index.php/${P}/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    const openKey = async (sid, key, heading) => {
        await page.goto(editorialUrl(sid, key));
        await wf.expectOpen(sid).catch(() => {});
        if (heading) await wf.heading().filter({hasText: heading}).waitFor({timeout: T}).catch(() => {});
        await idle(page);
    };
    const headingText = async () => flat(await wf.heading().textContent().catch(() => null));

    // ================================================================ seeding
    if (isOMP) {
        await must(app, 'scenarios/context', {
            tag: P,
            context: {name: {en: `K2 ${P}`}},
            publisher: 'K2 Press Ltd', location: 'Prague', codeType: 'Proprietary (01)', codeValue: 'K2-0001',
            users: [{username: mg, roles: ['manager']}, {username: `${P}au`, roles: ['author']}],
        });
    } else {
        await must(app, 'scenarios/context', {
            tag: P,
            context: {name: {en: `K2 ${P}`}},
            users: [{username: mg, roles: ['manager']}, {username: `${P}au`, roles: ['author']}],
        });
    }
    const book = (n, extra = {}) => must(app, 'scenarios/submission', {tag: `${P}${n}`, context: P, submitter: `${P}au`, title: `K2 ${n} ${P}`, ...extra});
    fact('press', P);

    await signIn(page, mg, {contextPath: P});
    wf = new WorkflowPage(page, P);

    // ---------------------------------------------------------------- Audience helpers
    const audForm = () => wf.primaryColumn();
    const readSelects = () => audForm().evaluate((root) => {
        const out = [];
        for (const s of root.querySelectorAll('select')) {
            const lab = s.id ? root.querySelector(`label[for="${s.id}"]`) : null;
            const opts = [...s.options].map((o) => ({v: o.value, t: o.text.trim()}));
            out.push({
                name: s.name, id: s.id, label: lab ? lab.innerText.replace(/\s+/g, ' ').trim() : null,
                required: s.required || s.getAttribute('aria-required') === 'true',
                value: s.value, selectedIndex: s.selectedIndex, selectedText: s.selectedIndex >= 0 ? s.options[s.selectedIndex].text.trim() : null,
                count: opts.length, emptyOptions: opts.filter((o) => o.v === '' || o.t === '').length,
                first: opts[0]?.t, last: opts[opts.length - 1]?.t,
                options: opts.map((o) => o.t),
            });
        }
        const inputs = [...root.querySelectorAll('input, textarea')].filter((e) => e.type !== 'hidden').map((e) => ({tag: e.tagName, type: e.type, name: e.name}));
        const buttons = [...root.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.innerText.replace(/\s+/g, ' ').trim());
        return {selects: out, inputs, buttons};
    });
    const briefSelects = (r) => r ? r.selects.map((s) => ({label: s.label, value: s.value, selectedIndex: s.selectedIndex, selectedText: s.selectedText, count: s.count, emptyOptions: s.emptyOptions, first: s.first, last: s.last})) : null;
    const chooseAud = async (label, option) => {
        const id = await audForm().locator('label').filter({hasText: new RegExp(`^\\s*${label.replace(/[()]/g, '\\$&')}\\s*\\*?\\s*$`)}).first().getAttribute('for');
        await page.locator(`[id="${id}"]`).selectOption({label: option});
    };
    const saveAud = async () => {
        const n = requests.length;
        const resp = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await audForm().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await audForm().locator('.pkpFormPage__status').filter({hasText: /Saved|error/i}).first().waitFor({timeout: 10_000}).catch(() => {});
        const status = flat(await audForm().locator('.pkpFormPage__status, [role="status"]').allInnerTexts().catch(() => []));
        return {status: r ? r.status() : null, statusText: status, requests: requests.slice(n)};
    };
    const audDb = (sid) => db(`select setting_name, coalesce(setting_value,'<null>') from submission_settings where submission_id=${sid} and setting_name like 'audience%' order by 1`);

    // ================================================================ A: Audience
    if (isOMP && PHASES.includes('A')) await guard('A', async () => {
        const b1 = await book('a1');
        const b2 = await book('a2');
        fact('A.books', {b1: b1.submissionId, b2: b2.submissionId});
        // a new book
        await openKey(b1.submissionId, 'marketing_audience', 'Audience');
        const s0 = await snap('a-new');
        fact('A.new.heading', await headingText());
        fact('A.new.menu', await wf.menuEntries().catch((e) => String(e)));
        const r0 = await readSelects();
        fact('A.new.selects', briefSelects(r0));
        fact('A.new.options', r0.selects.map((s) => ({label: s.label, options: s.options})));
        fact('A.new.inputsButtons', {inputs: r0.inputs, buttons: r0.buttons});
        fact('A.new.formText', flat(await audForm().innerText()));
        fact('A.new.snap', s0.file);
        await loc(page, 'Audience page: the form\'s Save', audForm().getByRole('button', {name: 'Save', exact: true}));
        await loc(page, 'Audience page: the five lists', audForm().locator('select'));
        // td6: choose four, Save
        await chooseAud('Audience', 'Professional and scholarly (06)');
        await chooseAud('Audience Range Qualifier', 'US school grade range (11)');
        await chooseAud('Audience Range (from)', 'Ninth Grade (9)');
        await chooseAud('Audience Range (exact)', 'Twelfth Grade (12)');
        const sv = await saveAud();
        const s1 = await snap('a-saved');
        fact('A.save', {...sv, notices: s1.notices, snap: s1.file});
        fact('A.save.samePage', briefSelects(await readSelects()));
        await page.reload(); await wf.expectOpen(b1.submissionId).catch(() => {}); await wf.heading().filter({hasText: 'Audience'}).waitFor({timeout: T}).catch(() => {});
        const s2 = await snap('a-saved-reload');
        fact('A.save.reload', {selects: briefSelects(await readSelects()), snap: s2.file});
        fact('A.save.db', audDb(b1.submissionId));
        // the saved lists: can any be emptied? (A3)
        const r2 = await readSelects();
        fact('A.saved.emptyChoices', r2.selects.map((s) => ({label: s.label, emptyOptions: s.emptyOptions, count: s.count})));
        // leaving with an unsaved choice (Rule 2): side menu "Representatives", then back
        const d0 = dialogs.length;
        await chooseAud('Audience', 'Children (02)');
        fact('A.unsaved.before', briefSelects(await readSelects())[0]);
        await wf.menuLink('Representatives').click();
        await wf.heading().filter({hasText: 'Representatives'}).waitFor({timeout: T}).catch(() => {});
        const s3 = await snap('a-unsaved-left');
        fact('A.unsaved.left', {heading: await headingText(), dialogs: dialogsSince(d0), snap: s3.file});
        await wf.menuLink('Audience').click();
        await wf.heading().filter({hasText: 'Audience'}).waitFor({timeout: T}).catch(() => {});
        await idle(page);
        const s4 = await snap('a-unsaved-back');
        fact('A.unsaved.back', {selects: briefSelects(await readSelects()), dialogs: dialogsSince(d0), snap: s4.file});
        fact('A.unsaved.db', audDb(b1.submissionId));

        // a second book: the qualifier axis, then "(to)" alone with no qualifier
        await openKey(b2.submissionId, 'marketing_audience', 'Audience');
        const q0 = await readSelects();
        fact('A2.new.selects', briefSelects(q0));
        const rangeOpts = (r) => r.selects.filter((s) => /Range \(/.test(s.label || '')).map((s) => ({label: s.label, count: s.count, first: s.first, last: s.last, options: s.options.join('|')}));
        const noQual = rangeOpts(q0);
        const byQual = {};
        for (const q of ['Reading age, years (18)', 'US school grade range (11)', q0.selects[1].options[0]]) {
            await chooseAud('Audience Range Qualifier', q);
            await sleep(300);
            const cur = rangeOpts(await readSelects());
            byQual[q] = {sameAsNoQualifier: JSON.stringify(cur) === JSON.stringify(noQual), first: cur.map((c) => c.first), counts: cur.map((c) => c.count)};
        }
        fact('A2.qualifierAxis', byQual);
        const s5 = await snap('a2-qualifier-changed');
        // leave by reload with the qualifier chosen and unsaved
        const d1 = dialogs.length;
        await page.reload(); await wf.expectOpen(b2.submissionId).catch(() => {}); await wf.heading().filter({hasText: 'Audience'}).waitFor({timeout: T}).catch(() => {});
        await idle(page);
        fact('A2.reloadUnsaved', {dialogs: dialogsSince(d1), selects: briefSelects(await readSelects()), snapBefore: s5.file});
        await chooseAud('Audience Range (to)', 'Tenth Grade (10)');
        const sv2 = await saveAud();
        const s6 = await snap('a2-to-saved');
        fact('A2.save', {...sv2, notices: s6.notices, samePage: briefSelects(await readSelects()), snap: s6.file});
        await page.reload(); await wf.expectOpen(b2.submissionId).catch(() => {}); await wf.heading().filter({hasText: 'Audience'}).waitFor({timeout: T}).catch(() => {});
        const s7 = await snap('a2-to-reload');
        fact('A2.reload', {selects: briefSelects(await readSelects()), snap: s7.file});
        fact('A2.db', audDb(b2.submissionId));
    });

    // ---------------------------------------------------------------- Representatives helpers
    const grid = () => page.locator('div[id^="component-grid-catalogentry-representativesgrid"]').first();
    const readGrid = () => grid().evaluate((g) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const header = g.querySelector('.header');
        const bodies = [...g.querySelectorAll('table tbody')].filter(vis).map((tb) => ({cls: tb.className, rows: [...tb.querySelectorAll('tr')].filter(vis).map((tr) => {
            const copy = tr.cloneNode(true);
            copy.querySelectorAll('script, .pkp_screen_reader').forEach((n) => n.remove());
            return {cls: tr.className, id: tr.id, text: copy.innerText.replace(/\s+/g, ' ').trim(), cells: [...copy.querySelectorAll(':scope > td, :scope > th')].map((c) => c.innerText.replace(/\s+/g, ' ').trim())};
        })}));
        return {heading: t(header && header.querySelector('h4, h3')), headerLinks: header ? [...header.querySelectorAll('a')].filter(vis).map((a) => t(a)) : [],
            columns: [...g.querySelectorAll('thead th')].filter(vis).map((th) => t(th)), bodies};
    });
    const gridRows = async () => {
        const g = await readGrid();
        const out = [];
        let group = null;
        for (const b of g.bodies) for (const r of b.rows) {
            if (/control-row/.test(r.id) || /row_controls/.test(r.cls)) continue;
            if (/empty/.test(b.cls)) { out.push({group, empty: r.text}); continue; }
            if (r.cells.length >= 2 && r.cells[1] === '' && /^(Agents|Suppliers)$/.test(r.cells[0])) { group = r.cells[0]; continue; }
            out.push({group, name: r.cells[0], role: r.cells[1]});
        }
        return out;
    };
    const repForm = () => page.locator('form#representativeForm:visible');
    const repDialog = () => page.locator('[role="dialog"]').filter({has: page.locator('form#representativeForm')}).last();
    const readRepWindow = async () => {
        const title = flat(await repDialog().locator('h1, h2').first().innerText().catch(() => null));
        const form = await repForm().evaluate((f) => {
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none';
            const lab = (e) => {
                if (e.id) { const l = f.querySelector(`label[for="${e.id}"]`); if (l) return l.innerText.replace(/\s+/g, ' ').trim(); }
                const sec = e.closest('.section, fieldset');
                const l = sec && sec.querySelector('label.label, legend, .label');
                return l ? l.innerText.replace(/\s+/g, ' ').trim() : null;
            };
            return {
                fields: [...f.querySelectorAll('input, select, textarea')].filter((e) => e.type !== 'hidden').map((e) => ({
                    tag: e.tagName.toLowerCase(), type: e.type, name: e.name, label: lab(e), visible: vis(e),
                    required: e.required || e.classList.contains('required') || e.getAttribute('aria-required') === 'true',
                    value: e.type === 'radio' || e.type === 'checkbox' ? e.value : e.value, checked: e.type === 'radio' || e.type === 'checkbox' ? e.checked : undefined,
                    selectedText: e.tagName === 'SELECT' && e.selectedIndex >= 0 ? e.options[e.selectedIndex].text.trim() : undefined,
                    options: e.tagName === 'SELECT' ? [...e.options].map((o) => (o.value === '' ? '<empty>' : o.text.trim())) : undefined,
                })),
                text: f.innerText.replace(/\s+\n/g, '\n').trim(),
                buttons: [...f.querySelectorAll('button, a.cancelButton, a')].filter(vis).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
                errors: [...f.querySelectorAll('label.error, .error, .pkp_form_error')].filter(vis).map((e) => ({text: e.innerText.replace(/\s+/g, ' ').trim(), for: e.getAttribute('for'), cls: e.className})).filter((e) => e.text),
            };
        });
        return {title, ...form};
    };
    const visibleRoleLists = async () => {
        const w = await readRepWindow();
        return w.fields.filter((f) => /Role$/.test(f.name)).map((f) => ({name: f.name, visible: f.visible, required: f.required, selectedText: f.selectedText, count: f.options.length, first: f.options[0], second: f.options[1], last: f.options[f.options.length - 1], options: f.options}));
    };
    const openAddRep = async () => {
        await page.locator('a').filter({hasText: /^\s*Add Representative\s*$/}).first().click();
        await repForm().waitFor({timeout: T});
        await idle(page);
        await repForm().locator('input[name="name"]').waitFor({timeout: T});
    };
    const chooseType = async (type) => { await repForm().locator(`input[name="isSupplier"][value="${type === 'supplier' ? 1 : 0}"]`).check(); await sleep(200); };
    const pickRole = async (type, label) => repForm().locator(`select[name="${type}Role"]`).selectOption({label});
    const pressOk = async () => {
        const n = responses.length;
        const d0 = dialogs.length;
        await repForm().getByRole('button', {name: 'OK', exact: true}).click();
        const closed = await page.locator('form#representativeForm').waitFor({state: 'hidden', timeout: 8000}).then(() => true).catch(() => false);
        await idle(page); await sleep(700);
        return {closed, responses: responses.slice(n), dialogs: dialogsSince(d0)};
    };
    const cancelRep = async () => {
        const d0 = dialogs.length;
        const c = repForm().locator('a, button').filter({hasText: /^\s*Cancel\s*$/}).first();
        await c.click();
        await page.locator('form#representativeForm').waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
        await sleep(700);
        return {dialogs: dialogsSince(d0), stillOpen: await repForm().count()};
    };
    const rowOf = (name) => grid().locator('tr.gridRow').filter({hasText: name}).first();
    const rowEntries = async (name) => {
        const row = rowOf(name);
        const id = await row.getAttribute('id');
        const controls = page.locator(`[id="${id}-control-row"]`);
        if (!(await controls.isVisible())) await row.locator('a.show_extras').click();
        await controls.waitFor({timeout: T});
        return controls;
    };
    const pressEntry = async (name, label) => {
        const controls = await rowEntries(name);
        const entries = (await controls.locator('a:visible').allInnerTexts()).map((x) => flat(x));
        await controls.locator('a:visible').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).click();
        return entries;
    };
    const addRep = async ({type, role, name, email, website, idValue, phone}) => {
        await openAddRep();
        if (type === 'supplier') { await chooseType('agent'); await chooseType('supplier'); } else await chooseType('agent');
        await pickRole(type, role);
        await repForm().locator('input[name="name"]').fill(name);
        if (email !== undefined) await repForm().locator('input[name="email"]').fill(email);
        if (website !== undefined) await repForm().locator('input[name="url"]').fill(website);
        if (idValue !== undefined) await repForm().locator('input[name="representativeIdValue"]').fill(idValue);
        if (phone !== undefined) await repForm().locator('input[name="phone"]').fill(phone);
        return pressOk();
    };
    const repDb = (sid) => db(`select representative_id, is_supplier, role, name, coalesce(representative_id_type,''), coalesce(representative_id_value,''), coalesce(phone,''), coalesce(email,''), coalesce(url,'') from representatives where submission_id=${sid} order by representative_id`);

    // ================================================================ R: Representatives and the window
    if (isOMP && PHASES.includes('R')) await guard('R', async () => {
        const b = await book('r1');
        const sid = b.submissionId;
        fact('R.book', sid);
        await openKey(sid, 'marketing_representatives', 'Representatives');
        await page.locator('a').filter({hasText: /^\s*Add Representative\s*$/}).first().waitFor({timeout: T});
        await idle(page);
        const s0 = await snap('r-empty');
        fact('R.empty', {heading: await headingText(), grid: await readGrid(), snap: s0.file});
        await loc(page, 'Representatives page: the grid', grid());
        await loc(page, 'Representatives page: "Add Representative"', page.locator('a').filter({hasText: /^\s*Add Representative\s*$/}));

        // the window as it arrives
        await openAddRep();
        const s1 = await snap('r-add-window');
        const w0 = await readRepWindow();
        fact('R.window.arrival', {...w0, snap: s1.file});
        fact('R.window.arrival.roleLists', await visibleRoleLists());
        await loc(page, 'Add Representative window: the form', repForm());
        await loc(page, 'Add Representative window: agent role list', repForm().locator('select[name="agentRole"]'));
        await loc(page, 'Add Representative window: supplier role list', repForm().locator('select[name="supplierRole"]'));
        // Cancel with a change (the way out)
        await repForm().locator('input[name="name"]').fill('Unsaved Name');
        await repForm().locator('input[name="name"]').blur();
        const c0 = await cancelRep();
        const s2 = await snap('r-cancel-changed');
        fact('R.window.cancelChanged', {...c0, rows: await gridRows(), snap: s2.file});

        // td7: Alpha, Beta
        const a1 = await addRep({type: 'agent', role: 'Exclusive sales agent (05)', name: 'Alpha Agency'});
        const sa = await snap('r-alpha-added');
        fact('R.alpha', {...a1, notices: sa.notices, rows: await gridRows(), snap: sa.file});
        const a2 = await addRep({type: 'agent', role: 'Sales agent (08)', name: 'Beta Agency'});
        const sb = await snap('r-beta-added');
        fact('R.beta', {...a2, notices: sb.notices, rows: await gridRows(), grid: await readGrid(), snap: sb.file});
        // the arrow's entries, Alpha › Edit › OK unchanged
        const entries = await pressEntry('Alpha Agency', 'Edit');
        await repForm().waitFor({timeout: T}); await idle(page);
        await repForm().locator('input[name="name"]').waitFor({timeout: T});
        const se = await snap('r-alpha-edit-window');
        fact('R.alpha.edit.window', {entries, ...(await readRepWindow()), snap: se.file});
        const e1 = await pressOk();
        const se2 = await snap('r-alpha-edited');
        fact('R.alpha.edited', {...e1, notices: se2.notices, rows: await gridRows(), snap: se2.file});

        // the window on "Supplier" as it arrives: a supplier role, a name, OK
        await openAddRep();
        await pickRole('supplier', 'Distributor to end-customers (12)');
        await repForm().locator('input[name="name"]').fill('Sigma Supply');
        const o1 = await pressOk();
        const ss = await snap('r-supplier-arrival-ok');
        const w1 = o1.closed ? null : await readRepWindow();
        fact('R.supplierArrivalOk', {...o1, errors: w1 && w1.errors, roleLists: o1.closed ? null : await visibleRoleLists(), rows: await gridRows(), snap: ss.file});
        if (!o1.closed) {
            await chooseType('agent'); await chooseType('supplier');
            const roles = await visibleRoleLists();
            const o2 = await pressOk();
            const ss2 = await snap('r-supplier-after-toggle-ok');
            fact('R.supplierAfterToggleOk', {roleListsBeforeOk: roles, ...o2, notices: ss2.notices, rows: await gridRows(), snap: ss2.file});
            if (!o2.closed) await cancelRep();
        }

        // td12: the role lists by type, switching back and forth
        await openAddRep();
        const t0 = await visibleRoleLists();
        await chooseType('agent');
        const t1 = await visibleRoleLists();
        await pickRole('agent', 'Exclusive sales agent (05)');
        await chooseType('supplier');
        const t2 = await visibleRoleLists();
        await pickRole('supplier', 'Wholesaler to retailers (04)').catch(async (e) => fact('R.switch.pickWholesaler', String(e).slice(0, 300)));
        await chooseType('agent');
        const t3 = await visibleRoleLists();
        const st = await snap('r-switch-back-agent');
        await repForm().locator('input[name="name"]').fill('Delta Switch');
        const o3 = await pressOk();
        const st2 = await snap('r-switch-ok');
        fact('R.switch', {supplierChosen: t0, agentChosen: t1, afterSupplier: t2, backToAgent: t3, snap: st.file, ok: o3, notices: st2.notices, rows: await gridRows()});
        // ending on Supplier after an agent role was chosen
        await openAddRep();
        await chooseType('agent');
        await pickRole('agent', 'Local publisher (07)');
        await chooseType('supplier');
        await pickRole('supplier', 'Wholesaler to retailers (04)').catch(() => {});
        await repForm().locator('input[name="name"]').fill('Omega Switch');
        const o4 = await pressOk();
        const so = await snap('r-switch-supplier-ok');
        fact('R.switchEndSupplier', {ok: o4, notices: so.notices, rows: await gridRows()});

        // Rule 7: refusals
        await openAddRep();
        await chooseType('agent');
        await pickRole('agent', 'Sales agent (08)');
        const r1 = await pressOk();
        const sr1 = await snap('r-refuse-noname');
        fact('R.refuse.noName', {...r1, window: r1.closed ? null : await readRepWindow(), snap: sr1.file});
        if (!r1.closed) {
            await repForm().locator('input[name="name"]').fill('Empty Role');
            await repForm().locator('select[name="agentRole"]').selectOption({value: ''});
            const r2 = await pressOk();
            const sr2 = await snap('r-refuse-norole');
            fact('R.refuse.noRole', {...r2, window: r2.closed ? null : await readRepWindow(), snap: sr2.file});
            if (!r2.closed) {
                await pickRole('agent', 'Sales agent (08)');
                await repForm().locator('input[name="name"]').fill('Epsilon Check');
                await repForm().locator('input[name="email"]').fill('not-an-email');
                await repForm().locator('input[name="url"]').fill('not a site');
                const r3 = await pressOk();
                const sr3 = await snap('r-refuse-email-url');
                fact('R.refuse.emailUrl', {...r3, window: r3.closed ? null : await readRepWindow(), snap: sr3.file});
                if (!r3.closed) {
                    await repForm().locator('input[name="email"]').fill('epsilon@example.org');
                    await repForm().locator('input[name="url"]').fill('www.example.org');
                    const r4 = await pressOk();
                    const sr4 = await snap('r-refuse-url-noscheme');
                    fact('R.refuse.urlNoScheme', {...r4, window: r4.closed ? null : await readRepWindow(), snap: sr4.file});
                    if (!r4.closed) {
                        await repForm().locator('input[name="url"]').fill('https://epsilon.example.org');
                        await repForm().locator('input[name="representativeIdValue"]').fill('any text !#% éü');
                        await repForm().locator('input[name="phone"]').fill('call me maybe');
                        const r5 = await pressOk();
                        const sr5 = await snap('r-accept-valid');
                        fact('R.accept.valid', {...r5, notices: sr5.notices, window: r5.closed ? null : await readRepWindow(), rows: await gridRows(), snap: sr5.file});
                        if (!r5.closed) await cancelRep();
                    }
                }
            }
        }
        fact('R.afterRefusals.rows', await gridRows());
        // Epsilon reopened: what was kept
        if ((await rowOf('Epsilon Check').count()) > 0) {
            await pressEntry('Epsilon Check', 'Edit');
            await repForm().waitFor({timeout: T}); await idle(page);
            await repForm().locator('input[name="name"]').waitFor({timeout: T});
            const sx = await snap('r-epsilon-reopened');
            fact('R.epsilon.reopened', {...(await readRepWindow()), snap: sx.file});
            await cancelRep();
        }
        // an existing supplier's "Edit", "OK" with nothing changed
        await pressEntry('Omega Switch', 'Edit');
        await repForm().waitFor({timeout: T}); await idle(page);
        await repForm().locator('input[name="name"]').waitFor({timeout: T});
        const we = await readRepWindow();
        const se1 = await snap('r-supplier-edit-window');
        const oe = await pressOk();
        const se3 = await snap('r-supplier-edit-ok-unchanged');
        fact('R.supplierEditUnchanged', {who: 'Omega Switch', roleLists: we.fields.filter((f) => /Role$/.test(f.name)).map((f) => ({name: f.name, visible: f.visible, selectedText: f.selectedText})), ok: oe, errors: oe.closed ? null : (await readRepWindow()).errors, notices: se3.notices, rows: await gridRows(), snaps: [se1.file, se3.file]});
        if (!oe.closed) await cancelRep();
        // an agent's "Edit": what the supplier list shows
        await pressEntry('Beta Agency', 'Edit');
        await repForm().waitFor({timeout: T}); await idle(page);
        await repForm().locator('input[name="name"]').waitFor({timeout: T});
        const wb = await readRepWindow();
        const sb2 = await snap('r-agent-edit-window');
        fact('R.agentEditWindow', {who: 'Beta Agency', roleLists: wb.fields.filter((f) => /Role$/.test(f.name)).map((f) => ({name: f.name, visible: f.visible, selectedText: f.selectedText})), snap: sb2.file});
        await cancelRep();
        // an existing supplier switched to Agent
        const supplierName = (await rowOf('Sigma Supply').count()) ? 'Sigma Supply' : 'Omega Switch';
        await pressEntry(supplierName, 'Edit');
        await repForm().waitFor({timeout: T}); await idle(page);
        await repForm().locator('input[name="name"]').waitFor({timeout: T});
        const w5 = await readRepWindow();
        await chooseType('agent');
        await pickRole('agent', 'Non-exclusive sales agent (06)');
        const o5 = await pressOk();
        const sm = await snap('r-supplier-to-agent');
        fact('R.supplierToAgent', {who: supplierName, editWindow: {title: w5.title, fields: w5.fields.map((f) => ({name: f.name, visible: f.visible, checked: f.checked, selectedText: f.selectedText, value: f.type === 'text' ? f.value : undefined}))}, ok: o5, notices: sm.notices, rows: await gridRows(), snap: sm.file});
        await page.reload(); await wf.expectOpen(sid).catch(() => {});
        await grid().waitFor({timeout: T}); await idle(page);
        const sf = await snap('r-final-reload');
        fact('R.final.reload', {rows: await gridRows(), snap: sf.file});
        fact('R.db', repDb(sid));
    });

    // ---------------------------------------------------------------- versions
    const createVersion = async (sid, pubId) => {
        await openKey(sid, `publication_${pubId}_titleAbstract`, 'Title');
        const item = await wf.revealPublicationEntry('Create New Version');
        await wf.expectVersionLoaded();
        await item.click();
        const dlg = page.getByRole('dialog', {name: 'Create New Version'});
        await dlg.getByRole('button', {name: 'Confirm', exact: true}).waitFor({timeout: T});
        await idle(page);
        const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
        const cr = await created;
        const body = await cr.json().catch(() => ({}));
        await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page);
        return {status: cr.status(), id: body.id};
    };
    const marketsDb = (sid) => db(`select m.market_id, pf.publication_format_id, pf.publication_id, m.agent_id, m.supplier_id from markets m join publication_formats pf on pf.publication_format_id=m.publication_format_id join publications p on p.publication_id=pf.publication_id where p.submission_id=${sid} order by 1`);
    const deleteRep = async (name, {cancelFirst = false, label = 'x'} = {}) => {
        const out = {name};
        const n = responses.length;
        const d0 = dialogs.length;
        out.entries = await pressEntry(name, 'Delete');
        const cd = page.getByRole('dialog', {name: 'Delete', exact: true});
        await cd.waitFor({timeout: T}).catch(() => {});
        out.confirm = {text: flat(await cd.innerText().catch(() => null)), buttons: (await cd.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x))};
        const sc = await snap(`d-confirm-${name.split(' ')[0].toLowerCase()}-${label}`);
        out.confirmSnap = sc.file;
        if (cancelFirst) {
            await cd.getByRole('button', {name: 'Cancel', exact: true}).click();
            await cd.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await sleep(700);
            out.afterCancel = {rows: await gridRows(), responses: responses.slice(n)};
            await pressEntry(name, 'Delete');
            await cd.waitFor({timeout: T}).catch(() => {});
        }
        const n2 = responses.length;
        const d2 = dialogs.length;
        await cd.getByRole('button', {name: 'OK', exact: true}).click();
        const detached = await cd.waitFor({state: 'detached', timeout: 8000}).then(() => true).catch(() => false);
        await idle(page); await sleep(1200);
        const tagName = name.split(' ')[0].toLowerCase();
        const s = await snap(`d-after-${tagName}-${label}`);
        out.after = {confirmClosed: detached, responses: responses.slice(n2), dialogs: dialogsSince(d2), notices: s.notices, openDialog: s.dialog, rows: await gridRows(), snap: s.file};
        if (!detached && (await cd.count())) {
            // the confirmation is still up: read it again later, press "OK" once more, then "Cancel"
            await sleep(5000);
            const s2 = await snap(`d-still-open-${tagName}-${label}`);
            out.stillOpen = {text: s2.dialog, spinner: await cd.locator('[class*="pinner"], [class*="loading"], svg.animate-spin, .animate-spin').count(), okEnabled: await cd.getByRole('button', {name: 'OK', exact: true}).isEnabled().catch(() => null), snap: s2.file};
            const n3 = responses.length; const d3 = dialogs.length;
            await cd.getByRole('button', {name: 'OK', exact: true}).click({timeout: 5000}).catch((e) => { out.stillOpen.okAgainError = String(e).slice(0, 200); });
            await sleep(2500);
            out.stillOpen.okAgain = {responses: responses.slice(n3), dialogs: dialogsSince(d3), stillOpen: await cd.count()};
            await cd.getByRole('button', {name: 'Cancel', exact: true}).click({timeout: 5000}).catch((e) => { out.stillOpen.cancelError = String(e).slice(0, 200); });
            const closedByCancel = await cd.waitFor({state: 'detached', timeout: 8000}).then(() => true).catch(() => false);
            await sleep(800);
            const s3 = await snap(`d-after-cancel-${tagName}-${label}`);
            out.stillOpen.cancel = {closed: closedByCancel, rows: await gridRows(), snap: s3.file};
        }
        return out;
    };

    // ================================================================ D: deleting (Rule 8, td13)
    if (isOMP && PHASES.includes('D')) await guard('D', async () => {
        const b = await book('d1', {
            published: true,
            representatives: [
                {type: 'supplier', role: 'Distributor to end-customers (12)', name: 'Gamma Distribution'},
                {type: 'agent', role: 'Exclusive sales agent (05)', name: 'Eta Agency'},
                {type: 'supplier', role: 'Wholesaler to retailers (04)', name: 'Zeta Free'},
            ],
            publicationFormats: [{name: 'PDF', markets: [{date: '20250101', dateFormat: 'YYYYMMDD', price: '10', supplier: 'Gamma Distribution', agent: 'Eta Agency', countriesIncluded: ['Canada (CA)']}]}],
        });
        const sid = b.submissionId;
        fact('D.book', {sid, pub: b.publicationId, reps: b.representatives, formats: b.publicationFormats});
        fact('D.markets.start', marketsDb(sid));
        await openKey(sid, 'marketing_representatives', 'Representatives');
        await grid().waitFor({timeout: T}); await idle(page);
        const s0 = await snap('d-start');
        fact('D.start.rows', {rows: await gridRows(), snap: s0.file});
        fact('D.gamma.v1', await deleteRep('Gamma Distribution', {cancelFirst: true, label: 'v1'}));
        fact('D.eta.v1', await deleteRep('Eta Agency', {label: 'v1'}));
        fact('D.zeta', await deleteRep('Zeta Free', {label: 'free'}));
        await page.reload(); await wf.expectOpen(sid).catch(() => {}); await grid().waitFor({timeout: T}); await idle(page);
        const s1 = await snap('d-after-reload');
        fact('D.reload.rows', {rows: await gridRows(), snap: s1.file});
        fact('D.db1', repDb(sid));

        // a new version; its market deleted on the new version only
        const v = await createVersion(sid, b.publicationId);
        fact('D.version', v);
        fact('D.markets.afterVersion', marketsDb(sid));
        const {PublicationFormatsPage} = require('../../../../../apps/omp/playwright/pages/PublicationFormatPages.js');
        const deleteMarketOn = async (pubId, label) => {
            const pf = new PublicationFormatsPage(page, P);
            await pf.gotoEditorial(sid, pubId);
            const win = await pf.openEdit('PDF');
            const tab = await win.openMetadata();
            const rows = tab.listRows('markets');
            const before = await rows.allInnerTexts();
            const s = await snap(`d-market-tab-${label}`);
            const first = rows.first();
            const id = await first.getAttribute('id');
            const controls = page.locator(`[id="${id}-control-row"]`);
            if (!(await controls.isVisible())) await first.locator('a.show_extras').click();
            const n = responses.length;
            await controls.locator('a:visible').filter({hasText: /^\s*Delete\s*$/}).click();
            const cd = page.getByRole('dialog', {name: 'Delete', exact: true});
            await cd.waitFor({timeout: T});
            await cd.getByRole('button', {name: 'OK', exact: true}).click();
            await cd.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page); await sleep(1000);
            const s2 = await snap(`d-market-deleted-${label}`);
            const after = await rows.allInnerTexts();
            await win.cancel().catch(() => {});
            return {before: before.map((x) => flat(x)), after: after.map((x) => flat(x)), notices: s2.notices, responses: responses.slice(n), snaps: [s.file, s2.file]};
        };
        fact('D.marketDeleted.v2', await guard('D.marketDeleted.v2', () => deleteMarketOn(v.id, 'v2')));
        fact('D.markets.afterV2Delete', marketsDb(sid));
        await openKey(sid, 'marketing_representatives', 'Representatives');
        await grid().waitFor({timeout: T}); await idle(page);
        fact('D.gamma.v1only', await deleteRep('Gamma Distribution', {label: 'v1only'}));
        fact('D.eta.v1only', await deleteRep('Eta Agency', {label: 'v1only'}));
        // the other end: version 1's market deleted too
        fact('D.marketDeleted.v1', await guard('D.marketDeleted.v1', () => deleteMarketOn(b.publicationId, 'v1')));
        fact('D.markets.afterV1Delete', marketsDb(sid));
        await openKey(sid, 'marketing_representatives', 'Representatives');
        await grid().waitFor({timeout: T}); await idle(page);
        fact('D.gamma.none', await deleteRep('Gamma Distribution', {label: 'none'}));
        fact('D.eta.none', await deleteRep('Eta Agency', {label: 'none'}));
        await page.reload(); await wf.expectOpen(sid).catch(() => {}); await grid().waitFor({timeout: T}); await idle(page);
        const s3 = await snap('d-final-reload');
        fact('D.final.rows', {rows: await gridRows(), snap: s3.file});
        fact('D.db.final', repDb(sid));
    });

    // ================================================================ V: across versions (Rule 1, td11)
    if (isOMP && PHASES.includes('V')) await guard('V', async () => {
        const b = await book('v1', {
            published: true,
            audience: {audience: 'Children (02)', rangeQualifier: 'US school grade range (11)', rangeFrom: 'Kindergarten (K)'},
            representatives: [{type: 'agent', role: 'Sales agent (08)', name: 'Vera Agent'}, {type: 'supplier', role: 'Distributor to end-customers (12)', name: 'Victor Supply'}],
        });
        const sid = b.submissionId;
        const readBoth = async (label) => {
            await openKey(sid, 'marketing_audience', 'Audience');
            const sa = await snap(`v-audience-${label}`);
            const aud = briefSelects(await readSelects());
            const menu = await wf.menuEntries().catch((e) => String(e));
            await openKey(sid, 'marketing_representatives', 'Representatives');
            await grid().waitFor({timeout: T}); await idle(page);
            const sr = await snap(`v-reps-${label}`);
            return {audience: aud.map((s) => `${s.label}=${s.selectedText}`), reps: await gridRows(), menu, snaps: [sa.file, sr.file]};
        };
        fact('V.v1', await readBoth('v1-published'));
        const v = await createVersion(sid, b.publicationId);
        fact('V.version', v);
        const s1 = await snap('v-after-create');
        fact('V.afterCreate.heading', {heading: await headingText(), snap: s1.file});
        fact('V.v2draft', await readBoth('v2-draft'));
        // publish the new version
        await guard('V.publish', async () => {
            await openKey(sid, `publication_${v.id}_titleAbstract`, 'Title');
            await wf.expectVersionLoaded();
            const { publishShownVersion } = require('../../../../../apps/omp/playwright/pages/PublicationPages.js');
            await publishShownVersion(page);
            fact('V.published', db(`select publication_id, status, version_stage, version_major, version_minor from publications where submission_id=${sid} order by 1`));
        });
        fact('V.v2published', await readBoth('v2-published'));
        fact('V.db', {aud: audDb(sid), reps: repDb(sid), pubSettingsAudience: db(`select ps.publication_id, ps.setting_name from publication_settings ps join publications p on p.publication_id=ps.publication_id where p.submission_id=${sid} and ps.setting_name like 'audience%'`)});
    });

    // ================================================================ N: A3's lean — an empty list in the Native XML export
    if (isOMP && PHASES.includes('N')) await guard('N', async () => {
        const n0 = await book('n0', {publicationFormats: [{name: 'PDF'}]});
        const n1 = await book('n1', {publicationFormats: [{name: 'PDF'}], audience: {audience: 'Children (02)'}});
        const exportOne = async (title, label) => {
            const r = {};
            await page.goto(app.url(`/index.php/${P}/management/importexport/plugin/NativeImportExportPlugin`)); await idle(page);
            await page.getByRole('tab', {name: 'Export', exact: true}).first().click();
            const et = page.locator('#exportSubmissions-tab');
            await et.locator('.listPanel__item').first().waitFor({timeout: T});
            await idle(page); await sleep(500);
            const items = et.locator('.listPanel__item');
            for (let i = 0; i < await items.count(); i++) {
                const it = items.nth(i);
                if ((await it.innerText()).includes(title)) await it.locator('input[type=checkbox]').check();
            }
            const vbox = et.locator('input[name="validation"]').first();
            if (await vbox.count()) await vbox.setChecked(false);
            const tabsBefore = await page.locator('#importExportTabs [role=tab]').count();
            await et.getByRole('button', {name: 'Export Submissions', exact: true}).click();
            for (let i = 0; i < 60; i++) { await sleep(500); if ((await page.locator('#importExportTabs [role=tab]').count()) > tabsBefore) break; }
            await idle(page); await sleep(1000);
            const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
            await panel.getByText(/Download Exported File|failed|error/i).first().waitFor({timeout: 60_000}).catch(() => {});
            const s = await snap(`n-export-${label}`);
            r.results = flat(await panel.innerText().catch(() => null), 1500);
            r.snap = s.file;
            const btn = panel.getByRole('button', {name: 'Download Exported File'});
            if (await btn.count()) {
                const dl = page.waitForEvent('download', {timeout: T}).catch(() => null);
                await btn.first().click();
                const d = await dl;
                if (d) {
                    const xml = fs.readFileSync(await d.path(), 'utf8');
                    const outPath = path.resolve(__dirname, '../../../../../.reports', process.env.PROBE_FEATURE || 'U74', process.env.PROBE_AGENT || 'ccK2', `${RUN}-n-${label}-${app.name}.xml`);
                    fs.writeFileSync(outPath, xml);
                    r.products = (xml.match(/<(?:onix:)?Product[\s>]/g) || []).length;
                    r.audience = [...xml.matchAll(/<(?:onix:)?Audience>[\s\S]*?<\/(?:onix:)?Audience>/g)].map((m) => flat(m[0], 300));
                    r.audienceRange = [...xml.matchAll(/<(?:onix:)?AudienceRange>[\s\S]*?<\/(?:onix:)?AudienceRange>/g)].map((m) => flat(m[0], 300));
                    r.audienceCodeMentions = (xml.match(/Audience/g) || []).length;
                } else r.download = 'none';
            }
            return r;
        };
        fact('N.noAudience', await exportOne(`K2 n0 ${P}`, 'n0'));
        fact('N.audienceOnly', await exportOne(`K2 n1 ${P}`, 'n1'));
        fact('N.db', {n0: audDb(n0.submissionId), n1: audDb(n1.submissionId)});
    });

    // ================================================================ X: OJS / OPS controls
    if (!isOMP && PHASES.includes('X')) await guard('X', async () => {
        const b = await book('x1');
        const sid = b.submissionId;
        for (const key of ['marketing_audience', 'marketing_representatives']) {
            const d0 = dialogs.length;
            await page.goto(editorialUrl(sid, key));
            await wf.expectOpen(sid).catch(() => {});
            await idle(page); await sleep(800);
            const s = await snap(`x-${key}`);
            fact(`X.${key}`, {url: page.url(), heading: await headingText(), menu: (await wf.menuEntries().catch((e) => [String(e)])).map((m) => (m.label !== undefined ? `${m.level}:${m.label}${m.selected ? '*' : ''}` : m)), dialogs: dialogsSince(d0), dialogText: s.dialog ? s.dialog.slice(0, 600) : null, snap: s.file});
        }
    });

    await close();
});
