// U40 claim check, chunk I28 (housekeeping 2026-09-28): the incidental rows for U40.
// Spec: docs/specs/U40-publication-metadata.md — Actors row "Save changes" (47), Rule 2 bullet 1 (142–143),
// footnote b; Fields "Default Chapter License URL" (115), OMP4 (1224–1231), footnotes g and f-omp4;
// "Settings that modify behavior" › Settings › Workflow › Metadata (394–408), footnote m.
//
//   admin    L87. A Site Administrator whose only role in a scratch context is an unassigned Copyeditor
//            (OPS: Editorial Board Member): the manager role ended on the admin's own Users & Roles › Edit
//            page ("Remove Role"), signed in again, the workflow opened by address. Title & Abstract (Prefix),
//            Metadata (Coverage), Data (Data Availability Statement, "Add Data Citation") and References
//            ("Add"): Save's state, a field typed, Save pressed when offered, the page read at once and after a
//            reload. Control: `admin` on a second scratch context where the manager role is kept, same pages.
//   meta     L88. A scratch manager on Settings › Workflow › Submission › "Metadata": "Enable keyword
//            metadata" ticked (seeded off) with "Require the author…", saved, reloaded; untick + re-tick
//            (unsaved) on Keywords (saved "Require") and Subjects (seeded "Ask"); saved, reloaded. Then an
//            unsaved choice left by a tab switch, the side menu's "Website", a typed address and a reload;
//            the "Publisher ID" boxes (one saved ticked then unticked, one ticked, both unsaved) the same way.
//   license  L160 + control. A scratch context whose license is set on screen (Settings › Distribution ›
//            License: "Author", "CC Attribution 4.0"). OMP: an Edited Volume's "Permissions & Disclosure":
//            "Default Chapter License URL" read locked, "Override", https://example.org/chapter-license
//            typed, read before Save, after Save, after a reload; then the control "License URL" overridden
//            to CC BY-NC 4.0 the same way (and the chapter field's sentence then). OJS / OPS: the control
//            alone (License URL override). Sweep: an unsaved Copyright Holder left by the side menu.
//
//   RUN=r1 PROBE_FEATURE=U40 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U40/I28/i28.js
//   RUN=r2 …   (each run seeds afresh; facts in facts-<RUN>-<app>.json; snapshots <RUN>-<name>-<app>)
//   PHASES=admin,meta,license (default all). The recorded runs: r1, r2, r3 all phases; r4 PHASES=admin
//   (the admin sweep's "Change" leg was added from r2, its Abstract typing from r3).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag, outDir} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'admin,meta,license').split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const CHAPTER_URL = 'https://example.org/chapter-license';
const CCBYNC = 'https://creativecommons.org/licenses/by-nc/4.0';

forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
    const isOMP = app.name === 'omp';
    const factsFile = path.join(outDir(), `facts-${RUN}-${app.name}.json`);
    const facts = fs.existsSync(factsFile) ? JSON.parse(fs.readFileSync(factsFile, 'utf8')) : {};
    const saveFacts = () => fs.writeFileSync(factsFile, JSON.stringify(facts, null, 1));
    let phase = '';
    const log = (...a) => console.log(`[${app.name} ${RUN}${phase ? ' ' + phase : ''}]`, ...a);
    const fact = (k, v) => { facts[k] = v; saveFacts(); log(k, JSON.stringify(v).slice(0, 2500)); };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);

    const {page} = await launch(app);
    const traffic = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u) || /_test\//.test(u)) return;
        const m = r.request().method();
        traffic.push({at: Date.now(), m: r.request().headers()['x-http-method-override'] || m, url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status(),
            body: m !== 'GET' && r.status() >= 400 ? await r.text().then((b) => b.slice(0, 300)).catch(() => null) : undefined});
    });
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 200)});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), msg: flat(e.message, 300)}));
    const since = (arr, t0) => arr.filter((e) => e.at >= t0).map(({at, ...x}) => x);
    const writes = (t0) => since(traffic, t0).filter((x) => x.m !== 'GET');
    const bad = (t0) => since(traffic, t0).filter((x) => x.status >= 400);

    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 300)}; }
        if (extra) s.facts = extra;
        record(`${RUN}-${name}`, s);
        await shot(page, `${RUN}-${name}`).catch(() => {});
        return `${RUN}-${name}-${app.name}`;
    }
    async function section(name, fn) {
        if (!on(name)) return;
        phase = name;
        const t0 = Date.now();
        log('== start');
        try { await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 1500));
            await snap(`${name}-zz-failed`).catch(() => {});
        }
        fact(`${name}.http4xx5xx`, bad(t0));
        fact(`${name}.pageErrors`, since(pageErrors, t0));
        fact(`${name}.dialogs`, since(dialogs, t0));
        phase = '';
    }
    const wf = () => page.locator('[role="dialog"]:visible').first();

    // --------------------------------------------------------------- workflow helpers
    async function gotoWorkflow(ctx, sid, key) {
        await page.goto(cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`)).catch(() => {});
        await idle(page).catch(() => {});
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page).catch(() => {});
    }
    async function menuLinks() {
        return wf().getByRole('link').evaluateAll((els) => els.filter((e) => e.offsetParent !== null)
            .map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
    }
    async function openEntry(name) {
        const d = wf();
        const entry = d.getByRole('link', {name, exact: true}).first();
        if (!(await entry.isVisible().catch(() => false))) {
            const group = d.getByRole('link', {name: /^(Publication|Preprint)$/}).first();
            if (await group.count()) { await group.click().catch(() => {}); await idle(page).catch(() => {}); }
        }
        if (!(await entry.isVisible().catch(() => false))) return false;
        await entry.click();
        await d.getByRole('heading', {name: new RegExp(`^(Publication|Preprint): ${name}$`)}).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
        await idle(page).catch(() => {});
        await formReady();
        return true;
    }
    const saveBtn = () => wf().getByRole('button', {name: 'Save', exact: true});
    async function formReady() {
        const start = Date.now();
        while (Date.now() - start < 15_000) {
            if (await saveBtn().count()) break;
            if (await wf().getByRole('button', {name: 'Add', exact: true}).count()) break;
            await sleep(250);
        }
        await idle(page).catch(() => {});
        await sleep(600);
    }
    async function btnState(l) {
        const n = await l.count().catch(() => 0);
        if (!n) return {present: false};
        const x = l.first();
        return {present: true, visible: await x.isVisible().catch(() => null), enabled: await x.isEnabled().catch(() => null)};
    }
    /** The sweep of a publication page: heading, every visible button and form control with its state. */
    async function pageSweep() {
        return wf().evaluate((root) => {
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
            const main = root.querySelector('main') || root;
            const lbl = (e) => (e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].innerText) || e.name || e.id || '').replace(/\s+/g, ' ').trim();
            return {
                heading: (main.querySelector('h2, h1') || {}).innerText || null,
                buttons: [...main.querySelectorAll('button, a[role="button"]')].filter(vis)
                    .map((b) => ({text: (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'})).filter((b) => b.text),
                controls: [...main.querySelectorAll('input, textarea, select, iframe')].filter((e) => vis(e) && e.type !== 'hidden')
                    .map((e) => ({tag: e.tagName.toLowerCase(), label: lbl(e), id: e.id, disabled: !!e.disabled, readOnly: !!e.readOnly})),
                warnings: (main.innerText.match(/(Warning:[^\n]*|[^\n]*can ?not be edited[^\n]*|[^\n]*read-only[^\n]*)/gi) || []).slice(0, 5),
            };
        }).catch((e) => ({err: flat(e.message, 200)}));
    }
    async function saveAndRead() {
        const t0 = Date.now();
        const st = await btnState(saveBtn());
        if (!st.present || !st.enabled) return {pressed: false, save: st};
        const resp = page.waitForResponse((r) => /\/api\/v1\/.*\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 12_000}).catch(() => null);
        await saveBtn().first().click();
        const r = await resp;
        const seen = new Set();
        const start = Date.now();
        while (Date.now() - start < 6000) {
            for (const x of await wf().locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])) if (x.trim()) seen.add(x.trim());
            if (seen.has('Saved')) break;
            await sleep(250);
        }
        await idle(page).catch(() => {});
        return {pressed: true, status: r ? r.status() : 'no request', statuses: [...seen],
            fieldErrors: await wf().locator('.pkpFieldError').allInnerTexts().catch(() => []),
            notices: await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => []), writes: writes(t0)};
    }
    async function richEditorIn(scope) {
        const ifr = scope.locator('iframe[id$="_ifr"]').first();
        if (!(await ifr.count())) return null;
        const id = (await ifr.getAttribute('id', {timeout: 5000}).catch(() => '')).replace(/_ifr$/, '');
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
        return id;
    }
    const richContent = (id) => page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id).catch(() => null);

    // --------------------------------------------------------------- admin (L87)
    async function endOwnManagerRole(ctx) {
        const rem = {};
        await page.goto(cu(ctx, '/en/management/settings/access'));
        await idle(page).catch(() => {});
        const table = page.locator('table').filter({hasText: /\badmin\b/}).first();
        await table.waitFor({state: 'visible', timeout: T}).catch(() => {});
        const adminRow = table.locator('tr').filter({hasText: /\badmin\b/}).first();
        await adminRow.locator('button').last().click();
        await idle(page).catch(() => {});
        await page.getByRole('menuitem', {name: /^Edit$/}).first().click().catch(() => {});
        await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T}).catch(() => {});
        await idle(page).catch(() => {});
        await page.getByRole('button', {name: /Remove Role/i}).first().waitFor({state: 'visible', timeout: 15000}).catch(() => {});
        const rolesNow = () => page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
        rem.rolesBefore = await rolesNow();
        await snap('admin-01-admin-user-edit');
        const roleRow = page.locator('tr').filter({hasText: /manager/i}).filter({has: page.getByRole('button', {name: /Remove Role/i})}).first();
        if (await roleRow.count()) {
            await roleRow.getByRole('button', {name: /Remove Role/i}).click();
            await idle(page).catch(() => {});
            const dlg = page.locator('[role="dialog"]:visible').filter({hasText: /Remove Role/i}).last();
            await dlg.waitFor({state: 'visible', timeout: 15000}).catch(() => {});
            rem.confirmText = flat(await dlg.innerText().catch(() => null), 300);
            const t0 = Date.now();
            await dlg.getByRole('button', {name: /^Remove Role$/i}).click().catch(() => {});
            await idle(page).catch(() => {}); await sleep(1200);
            rem.writes = writes(t0);
            rem.rolesAfter = await rolesNow();
            await snap('admin-02-after-remove-role');
        } else rem.noManagerRow = true;
        return rem;
    }

    async function drivePages(ctx, sid, key, citationPrefix) {
        const out = {};
        const stamp = `${RUN}${key}`;
        // Title & Abstract: the Prefix box
        await gotoWorkflow(ctx, sid);
        out.menu = await menuLinks();
        out.workflowSnap = await snap(`${key}-03-workflow`);
        const pages = [
            {name: 'Title & Abstract', field: () => wf().getByRole('textbox', {name: /^Prefix/}).first(), kind: 'text', value: `P${stamp}`},
            {name: 'Metadata', field: () => wf().getByRole('textbox', {name: /^Coverage/}).first(), kind: 'text', value: `Coverage ${stamp}`},
            {name: 'Data', kind: 'rich', value: `DAS ${stamp}`},
            {name: 'References', kind: 'refs', value: `${citationPrefix} added ${stamp}`},
        ];
        for (const p of pages) {
            const o = {};
            const slug = p.name.replace(/\W+/g, '').toLowerCase();
            await gotoWorkflow(ctx, sid);
            o.opened = await openEntry(p.name);
            o.url = page.url().replace(/^https?:\/\/[^/]+/, '');
            o.sweep = await pageSweep();
            o.snap = await snap(`${key}-${slug}-1-landed`, {sweep: o.sweep});
            if (!o.opened) { out[slug] = o; continue; }
            o.save = await btnState(saveBtn());
            if (p.kind === 'text') {
                const f = p.field();
                o.field = {present: (await f.count()) > 0, disabled: await f.isDisabled().catch(() => null), editable: await f.isEditable().catch(() => null), before: await f.inputValue().catch(() => null)};
                await f.fill(p.value, {timeout: 5000}).catch((e) => { o.fillErr = flat(e.message, 150); });
                o.field.typed = await f.inputValue().catch(() => null);
                o.saveAfterTyping = await btnState(saveBtn());
                o.result = await saveAndRead();
                o.samePage = await f.inputValue().catch(() => null);
                o.snapAfter = await snap(`${key}-${slug}-2-after-save`, {result: o.result});
                await page.reload().catch(() => {}); await idle(page).catch(() => {});
                await wf().waitFor({timeout: T}).catch(() => {});
                if (!(await p.field().count().catch(() => 0))) { await gotoWorkflow(ctx, sid); await openEntry(p.name); } else await formReady();
                o.afterReload = await p.field().inputValue().catch(() => null);
                o.snapReload = await snap(`${key}-${slug}-3-after-reload`);
            } else if (p.kind === 'rich') {
                const form = wf().locator('form').filter({has: page.locator('iframe[id$="_ifr"]')}).first();
                const id = await richEditorIn(wf());
                o.editor = {id, before: id ? await richContent(id) : null};
                if (id) {
                    await page.frameLocator(`#${id}_ifr`).locator('body').click({timeout: 5000}).catch((e) => { o.clickErr = flat(e.message, 150); });
                    await page.keyboard.type(p.value);
                    await sleep(400);
                    o.editor.typed = await richContent(id);
                }
                o.formPresent = (await form.count()) > 0;
                o.addDataCitation = await btnState(wf().getByRole('button', {name: 'Add Data Citation', exact: true}));
                o.saveAfterTyping = await btnState(saveBtn());
                o.result = await saveAndRead();
                o.samePage = id ? await richContent(id) : null;
                o.snapAfter = await snap(`${key}-${slug}-2-after-save`, {result: o.result});
                await page.reload().catch(() => {}); await idle(page).catch(() => {});
                await wf().waitFor({timeout: T}).catch(() => {});
                await formReady();
                let id2 = await richEditorIn(wf());
                if (!id2) { await gotoWorkflow(ctx, sid); await openEntry(p.name); id2 = await richEditorIn(wf()); }
                o.afterReload = id2 ? await richContent(id2) : null;
                o.snapReload = await snap(`${key}-${slug}-3-after-reload`);
            } else {
                const box = wf().getByRole('textbox', {name: /^References/}).first();
                const add = wf().getByRole('button', {name: 'Add', exact: true});
                o.box = {present: (await box.count()) > 0, disabled: await box.isDisabled().catch(() => null), editable: await box.isEditable().catch(() => null)};
                o.add = await btnState(add);
                const rowsOf = () => wf().locator('table').first().locator('tbody tr').allInnerTexts().then((xs) => xs.map((x) => flat(x, 120))).catch(() => []);
                o.rowsBefore = await rowsOf();
                await box.fill(p.value, {timeout: 5000}).catch((e) => { o.fillErr = flat(e.message, 150); });
                o.addAfterTyping = await btnState(add);
                if (o.addAfterTyping.present && o.addAfterTyping.enabled) {
                    const t0 = Date.now();
                    const resp = page.waitForResponse((r) => /importAdditionalCitations|citations/.test(r.url()) && r.request().method() !== 'GET', {timeout: 10000}).catch(() => null);
                    await add.first().click();
                    const r = await resp;
                    await idle(page).catch(() => {}); await sleep(1500);
                    o.result = {pressed: true, status: r ? r.status() : 'no request', writes: writes(t0)};
                } else o.result = {pressed: false};
                o.samePage = await rowsOf();
                o.snapAfter = await snap(`${key}-${slug}-2-after-add`, {result: o.result});
                await page.reload().catch(() => {}); await idle(page).catch(() => {});
                await wf().waitFor({timeout: T}).catch(() => {});
                await formReady(); await sleep(800);
                o.afterReload = await rowsOf();
                o.snapReload = await snap(`${key}-${slug}-3-after-reload`);
            }
            out[slug] = o;
        }
        out.change = await pressChange(ctx, sid, key);
        return out;
    }

    /** Sweep: the Title & Abstract page's "Change" (submission language), pressed; French picked, a title typed, Confirm. */
    async function pressChange(ctx, sid, key) {
        const o = {};
        await gotoWorkflow(ctx, sid);
        await openEntry('Title & Abstract');
        const btn = wf().getByRole('button', {name: 'Change', exact: true});
        o.button = await btnState(btn);
        if (!o.button.present || !o.button.enabled) return o;
        await btn.first().click();
        const panel = page.getByRole('dialog', {name: /Change Submission Language/i});
        await panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
        await panel.getByText(/I28 admin/).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(800);
        o.radios = await panel.getByRole('radio').evaluateAll((els) => els.map((e) => `${e.checked ? '(o)' : '( )'} ${(e.labels && e.labels[0] ? e.labels[0].innerText : e.value).trim()}`)).catch(() => []);
        o.snapOpen = await snap(`${key}-change-1-panel`, {radios: o.radios});
        const fr = panel.getByRole('radio', {name: /French/});
        if (await fr.count()) {
            await fr.first().check().catch(() => {});
            await sleep(1200);
            // every editor the panel reveals (Title; Abstract where the section requires it)
            const ids = await panel.locator('iframe[id$="_ifr"]').evaluateAll((els) => els.map((e) => e.id.replace(/_ifr$/, ''))).catch(() => []);
            o.editors = ids;
            for (const id of ids) {
                await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
                await page.frameLocator(`#${id}_ifr`).locator('body').click({timeout: 5000}).catch(() => {});
                await page.keyboard.type(/abstract/i.test(id) ? `Résumé ${RUN}${key}` : `Titre ${RUN}${key}`);
                await sleep(400);
            }
            o.snapFilled = await snap(`${key}-change-2-french-filled`);
            const t0 = Date.now();
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click().catch((e) => { o.confirmErr = flat(e.message, 150); });
            await sleep(2500); await idle(page).catch(() => {});
            o.writes = writes(t0);
            o.panelOpenAfter = await panel.isVisible().catch(() => false);
            o.panelErrors = await panel.locator('.pkpFieldError').allInnerTexts().catch(() => []);
            o.notices = await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => []);
            o.snapAfter = await snap(`${key}-change-3-after-confirm`, {writes: o.writes});
            if (o.panelOpenAfter) await panel.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
            await gotoWorkflow(ctx, sid);
            await openEntry('Title & Abstract');
            o.readoutAfterReload = flat(await wf().getByText(/Current Submission Language/).first().innerText().catch(() => null), 120);
            o.snapReload = await snap(`${key}-change-4-reloaded`);
        } else {
            o.noFrench = true;
            await panel.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
        }
        return o;
    }

    await section('admin', async () => {
        const left = isOPS ? 'editorialBoardMember' : 'copyeditor';
        const meta = {coverage: 'enable', dataAvailability: 'request', dataCitations: 'request'};
        const LANGS = {supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']};
        const tA = tag('u40i28a');
        const CA = await app.api.createContext({tag: tA, users: [
            {username: `${tA}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: `${tA}au`, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
            {username: 'admin', roles: [left]}], metadata: meta, context: LANGS});
        const SA = await app.api.createSubmission({tag: `${tA}s`, context: CA.path, submitter: `${tA}au`, title: `I28 admin ${tA}`, citationsRaw: ['I28 ref one', 'I28 ref two']});
        const tB = tag('u40i28b');
        const CB = await app.api.createContext({tag: tB, users: [
            {username: `${tB}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: `${tB}au`, roles: ['author'], givenName: 'Ava', familyName: 'Author'}], metadata: meta, context: LANGS});
        const SB = await app.api.createSubmission({tag: `${tB}s`, context: CB.path, submitter: `${tB}au`, title: `I28 admin control ${tB}`, citationsRaw: ['I28 ctl ref one', 'I28 ctl ref two']});
        fact('admin.seed', {roleLeft: left, A: {path: CA.path, sid: SA.submissionId, pub: SA.publicationId}, B: {path: CB.path, sid: SB.submissionId, pub: SB.publicationId}});

        // the no-manager end
        await signIn(page, 'admin', {contextPath: CA.path});
        fact('admin.remove', await endOwnManagerRole(CA.path));
        await signOut(page).catch(() => {});
        await signIn(page, 'admin', {contextPath: CA.path});
        await idle(page).catch(() => {});
        // the admin's own roles now, as the Users & Roles page shows them
        fact('admin.noManager', await drivePages(CA.path, SA.submissionId, 'admin-nomgr', 'I28'));
        await loc(page, 'References page: "Add" button', wf().getByRole('button', {name: 'Add', exact: true}));
        // the manager-kept end (control): admin is enrolled as the context's manager by every createContext
        await signIn(page, 'admin', {contextPath: CB.path});
        await idle(page).catch(() => {});
        fact('admin.managerKept', await drivePages(CB.path, SB.submissionId, 'admin-mgr', 'I28 ctl'));
        await signOut(page).catch(() => {});
    });

    // --------------------------------------------------------------- meta (L88)
    async function openMetadataSettings(ctx) {
        await page.goto(cu(ctx, '/management/settings/workflow')).catch(() => {});
        await idle(page).catch(() => {});
        const tab = page.locator('#metadata-button').first();
        if (await tab.count()) { await tab.click(); await idle(page).catch(() => {}); }
        const form = metaForm();
        await form.getByRole('group', {name: 'Keywords', exact: true}).waitFor({timeout: 20000}).catch(() => {});
        await sleep(400);
        return form;
    }
    const metaForm = () => page.locator('form').filter({has: page.getByRole('checkbox', {name: 'Enable references metadata'})}).first();
    async function readGroup(name) {
        const grp = metaForm().getByRole('group', {name, exact: true});
        if (!(await grp.count())) return {present: false};
        return grp.first().locator('input').evaluateAll((els) => els.map((e) => ({type: e.type, value: e.value, checked: e.checked, disabled: e.disabled,
            label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').replace(/\s+/g, ' ').trim().slice(0, 70),
            visible: !!(e.offsetWidth || e.offsetHeight || (e.labels && e.labels[0] && e.labels[0].offsetWidth))})))
            .then((xs) => ({present: true, box: xs.filter((x) => x.type === 'checkbox').map((x) => `${x.checked ? '[x]' : '[ ]'} ${x.label}${x.visible ? '' : ' (hidden)'}`),
                radio: xs.filter((x) => x.type === 'radio' && x.visible).map((x) => `${x.checked ? '(o)' : '( )'} ${x.label.split('…')[0].slice(0, 40)}`)}))
            .catch((e) => ({err: flat(e.message, 150)}));
    }
    const readAll = async () => ({keywords: await readGroup('Keywords'), subjects: await readGroup('Subjects'), publisherId: await readGroup('Publisher ID')});
    async function saveMeta() {
        const t0 = Date.now();
        const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await metaForm().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
        return {status: r ? r.status() : 'no request', writes: writes(t0)};
    }
    const radio = (group, re) => metaForm().getByRole('group', {name: group, exact: true}).getByRole('radio', {name: re});

    await section('meta', async () => {
        const t = tag('u40i28m');
        const C = await app.api.createContext({tag: t, users: [{username: `${t}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'}],
            metadata: {keywords: 'off', subjects: 'request'}});
        fact('meta.seed', {path: C.path});
        await signIn(page, `${t}mg`, {contextPath: C.path});
        await openMetadataSettings(C.path);
        const r = {};
        r.s0 = await readAll();
        await snap('meta-01-landed', r.s0);
        await loc(page, 'Metadata settings: "Enable keyword metadata"', page.getByRole('checkbox', {name: 'Enable keyword metadata', exact: true}));
        await loc(page, 'Metadata settings: group "Publisher ID"', page.getByRole('group', {name: 'Publisher ID', exact: true}));
        // 1. tick Keywords (seeded off): the radio a fresh tick shows; choose Require; save; reload
        await page.getByRole('checkbox', {name: 'Enable keyword metadata', exact: true}).check();
        await sleep(400);
        r.s1FreshTick = await readGroup('Keywords');
        await radio('Keywords', /^Require the author/).check();
        // Publisher ID: tick the first box too (saved ticked, for the untick leg below)
        const pidBoxes = metaForm().getByRole('group', {name: 'Publisher ID', exact: true}).getByRole('checkbox');
        await pidBoxes.nth(0).check();
        r.s1Save = await saveMeta();
        await snap('meta-02-saved-require', {save: r.s1Save});
        await page.reload().catch(() => {});
        await openMetadataSettings(C.path);
        r.s1Reload = await readAll();
        await snap('meta-03-reloaded', r.s1Reload);
        // 2. untick + re-tick, unsaved: Keywords (saved Require), Subjects (seeded Ask)
        for (const [g, boxName] of [['Keywords', 'Enable keyword metadata'], ['Subjects', 'Enable subject metadata']]) {
            const box = page.getByRole('checkbox', {name: boxName, exact: true});
            r[`s2box-${g}`] = await box.count();
            await box.uncheck(); await sleep(400);
            r[`s2Unticked-${g}`] = await readGroup(g);
            await box.check(); await sleep(400);
            r[`s2Reticked-${g}`] = await readGroup(g);
        }
        await snap('meta-04-reticked-unsaved', r);
        // 3. save as it stands, reload, read the stored choice
        r.s3Save = await saveMeta();
        await page.reload().catch(() => {});
        await openMetadataSettings(C.path);
        r.s3Reload = await readAll();
        await snap('meta-05-after-save-reload', r.s3Reload);
        // put Keywords back at Require and Subjects at Ask, saved, for the leave legs
        await radio('Keywords', /^Require the author/).check();
        await radio('Subjects', /^Ask the author/).check();
        r.s3bSave = await saveMeta();
        // 4. unsaved choice: Keywords → Ask; the Publisher ID box saved ticked → unticked, the second box → ticked
        const tabs = await page.locator('[role=tab]:visible').allInnerTexts().catch(() => []);
        r.tabs = tabs.map((x) => flat(x, 40));
        const change = async () => {
            await radio('Keywords', /^Ask the author/).check();
            await pidBoxes.nth(0).uncheck();
            await pidBoxes.nth(1).check();
            await sleep(300);
            return readAll();
        };
        // 4a. tab switch within Workflow › Submission, and back
        r.s4aChanged = await change();
        let t0 = Date.now();
        const other = page.locator('[role=tab]:visible').filter({hasNotText: /Metadata/}).filter({hasText: /Components|Disable Submissions|Checklist|Submission Checklist/}).first();
        r.s4aOther = flat(await other.innerText().catch(() => null), 40);
        await other.click().catch(() => {});
        await idle(page).catch(() => {}); await sleep(500);
        await snap('meta-06-other-tab');
        await page.locator('#metadata-button').first().click().catch(() => {});
        await idle(page).catch(() => {}); await sleep(500);
        r.s4aBack = await readAll();
        r.s4aDialogs = since(dialogs, t0);
        await snap('meta-07-back-on-metadata-tab', r.s4aBack);
        // 4b. leave by the side menu's "Website" (the change still unsaved)
        t0 = Date.now();
        const website = page.getByRole('link', {name: 'Website', exact: true}).first();
        r.s4bWebsiteLink = await website.count();
        await website.click().catch((e) => { r.s4bClickErr = flat(e.message, 150); });
        await page.waitForURL(/settings\/website/, {timeout: 15000}).catch(() => {});
        await idle(page).catch(() => {});
        r.s4bUrl = page.url().replace(/^https?:\/\/[^/]+/, '');
        r.s4bDialogs = since(dialogs, t0);
        r.s4bVisibleDialogs = (await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
        await snap('meta-08-left-by-side-menu');
        await openMetadataSettings(C.path);
        r.s4bReturn = await readAll();
        await snap('meta-09-returned-after-side-menu', r.s4bReturn);
        // 4c. leave by a typed address
        r.s4cChanged = await change();
        t0 = Date.now();
        await page.goto(cu(C.path, '/management/settings/distribution')).catch((e) => { r.s4cGotoErr = flat(e.message, 150); });
        await idle(page).catch(() => {});
        r.s4cDialogs = since(dialogs, t0);
        await openMetadataSettings(C.path);
        r.s4cReturn = await readAll();
        await snap('meta-10-returned-after-typed-address', r.s4cReturn);
        // 4d. reload with the change unsaved
        r.s4dChanged = await change();
        t0 = Date.now();
        await page.reload().catch((e) => { r.s4dReloadErr = flat(e.message, 150); });
        await openMetadataSettings(C.path);
        r.s4dDialogs = since(dialogs, t0);
        r.s4dReturn = await readAll();
        await snap('meta-11-after-reload-unsaved', r.s4dReturn);
        fact('meta', r);
        await signOut(page).catch(() => {});
    });

    // --------------------------------------------------------------- license (L160 + control)
    async function readPermFields() {
        await wf().locator('input[name="licenseUrl"]').first().waitFor({timeout: 15000}).catch(() => {});
        await sleep(500);
        return wf().evaluate((root) => {
            const fields = [...root.querySelectorAll('.pkpFormField')].filter((f) => f.offsetParent !== null && f.querySelector('input'));
            return fields.map((f) => {
                const input = f.querySelector('input');
                const lab = f.querySelector('label, legend');
                const desc = f.querySelector('.pkpFormField__description, [id$="-description"]');
                return {
                    name: input.name, label: lab ? lab.innerText.replace(/\s+/g, ' ').trim() : null,
                    value: input.value, disabled: input.disabled,
                    description: desc ? desc.innerText.replace(/\s+/g, ' ').trim() : null,
                    descLinks: desc ? [...desc.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})) : [],
                    override: [...f.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => b.innerText.trim()).filter(Boolean),
                };
            });
        }).catch((e) => [{err: e.message.slice(0, 200)}]);
    }
    const pick = (fields, name) => (fields.find((f) => f.name === name || (f.name || '').startsWith(`${name}-`)) || null);
    async function openPerm(ctx, sid, pub) {
        await gotoWorkflow(ctx, sid, `publication_${pub}_license`);
        return readPermFields();
    }
    async function overrideAndType(name, value) {
        const sel = `input[name="${name}"], input[name^="${name}-"]`;
        const fld = wf().locator('.pkpFormField').filter({has: page.locator(sel)}).first();
        const box = fld.locator(sel).first();
        const o = {disabledBefore: await box.isDisabled().catch(() => null)};
        if (o.disabledBefore) {
            await fld.getByRole('button', {name: /Override/}).first().click().catch((e) => { o.overrideErr = flat(e.message, 150); });
            await sleep(500);
        }
        o.afterOverride = pick(await readPermFields(), name);
        await box.fill(value).catch((e) => { o.fillErr = flat(e.message, 150); });
        await box.blur().catch(() => {});
        await sleep(500);
        o.typed = pick(await readPermFields(), name);
        return o;
    }
    async function setContextLicense(ctx) {
        const out = {};
        await page.goto(cu(ctx, '/management/settings/distribution')).catch(() => {});
        await idle(page).catch(() => {});
        const tab = page.getByRole('tab', {name: 'License', exact: true}).first();
        if (await tab.count()) { await tab.click(); await idle(page).catch(() => {}); await sleep(700); }
        const cc = page.getByRole('radio', {name: 'CC Attribution 4.0', exact: true});
        await cc.waitFor({state: 'visible', timeout: T}).catch(() => {});
        const author = page.getByRole('radio', {name: 'Author', exact: true});
        if (await author.count()) await author.check().catch(() => {});
        await cc.check().catch((e) => { out.ccErr = flat(e.message, 150); });
        const form = page.locator('form').filter({has: cc}).first();
        const t0 = Date.now();
        const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
        out.save = {status: r ? r.status() : 'no request', writes: writes(t0)};
        await snap('license-00-context-license-saved', out);
        return out;
    }
    async function savePermAndReload(ctx, sid, pub, label) {
        const o = {};
        o.save = await saveAndRead();
        o.samePage = await readPermFields();
        o.snapSaved = await snap(`license-${label}-saved`, o);
        o.reload = await openPerm(ctx, sid, pub);
        o.snapReload = await snap(`license-${label}-reloaded`, {reload: o.reload});
        return o;
    }

    await section('license', async () => {
        const t = tag('u40i28l');
        const C = await app.api.createContext({tag: t, users: [
            {username: `${t}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: `${t}au`, roles: ['author'], givenName: 'Ava', familyName: 'Author'}]});
        const spec = {tag: `${t}s`, context: C.path, submitter: `${t}au`, title: `I28 license ${t}`};
        if (isOMP) spec.workType = 'editedVolume';
        const S = await app.api.createSubmission(spec);
        fact('license.seed', {path: C.path, sid: S.submissionId, pub: S.publicationId, workType: spec.workType || null});
        await signIn(page, `${t}mg`, {contextPath: C.path});
        const r = {};
        r.before0 = await openPerm(C.path, S.submissionId, S.publicationId);
        await snap('license-01-before-context-license', {fields: r.before0});
        r.contextLicense = await setContextLicense(C.path);
        r.p0 = await openPerm(C.path, S.submissionId, S.publicationId);
        await snap('license-02-locked', {fields: r.p0});
        await loc(page, 'Permissions & Disclosure: License URL input', wf().locator('input[name="licenseUrl"]'));
        if (isOMP) {
            await loc(page, 'Permissions & Disclosure: "Default Chapter License URL" input', wf().locator('input[name="chapterLicenseUrl"]'));
            r.chapter = await overrideAndType('chapterLicenseUrl', CHAPTER_URL);
            await snap('license-03-chapter-typed-unsaved', r.chapter);
            r.chapterSaved = await savePermAndReload(C.path, S.submissionId, S.publicationId, '04-chapter');
        }
        // control: the version's own License URL
        r.license = await overrideAndType('licenseUrl', CCBYNC);
        await snap('license-05-licenseurl-typed-unsaved', r.license);
        r.licenseSaved = await savePermAndReload(C.path, S.submissionId, S.publicationId, '06-licenseurl');
        // sweep: an unsaved Copyright Holder, left by the side menu's "Title & Abstract"
        r.sweep = {};
        r.sweep.holder = await overrideAndType('copyrightHolder', 'Unsaved Holder I28');
        let t0 = Date.now();
        const ta = wf().getByRole('link', {name: 'Title & Abstract', exact: true}).last();
        await ta.click().catch((e) => { r.sweep.clickErr = flat(e.message, 150); });
        await sleep(1500); await idle(page).catch(() => {});
        r.sweep.dialogs = since(dialogs, t0);
        r.sweep.visibleDialogs = (await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 160));
        r.sweep.heading = await wf().getByRole('heading', {level: 2}).first().innerText().catch(() => null);
        await snap('license-07-left-unsaved-holder', r.sweep);
        const pm = wf().getByRole('link', {name: 'Permissions & Disclosure', exact: true}).last();
        await pm.click().catch(() => {});
        await idle(page).catch(() => {});
        r.sweep.back = pick(await readPermFields(), 'copyrightHolder');
        await snap('license-08-back-on-permissions', r.sweep.back);
        fact('license', r);
        await signOut(page).catch(() => {});
    });
});
