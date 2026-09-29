// U23 claim check, chunk I29 (housekeeping 2026-09-29): the incidental rows for the editorial dashboard.
// Chunk: .reports/hk29/chunks/U23.md — incidentals row 4 (inactive and editor-only sections in the dashboard's
// "Filters" › "Section", OJS and OPS) and row 5 (the Filters window's own "Clear Filters", "Close" after it, and the
// list's "Clear Filters" beside the chips, all three apps).
// Spec: docs/specs/U23-submissions-dashboard.md — Fields table row "Section" (fn-i), Rule 6, Rule 8 (fn-i).
//
//   PROBE_FEATURE=U23 PROBE_AGENT=ccI29 RUN=1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U23/I29/i29.js
//   PHASES=sections,clear (default: both). RUN names the facts file (i29-facts-run<RUN>) and prefixes every snapshot
//   (r<RUN>-…), so two runs sit side by side; every run seeds its own scratch contexts (tag prefix u23i29); state in
//   i29-state-r<RUN>-<app>.json (RESEED=1 for a fresh seed).
//
// Scratch contexts per app and run (users mg = Journal Manager, se = Section Editor / Series editor / Moderator,
// au = author; every submission is by au with se a participant as Section Editor):
//   A  (OJS, OPS) sections "Open" and "Shut"; "Shut" marked inactive on screen (Settings › Sections › Edit).
//   B  (OJS, OPS) sections "Open" and "EdOnly"; "EdOnly" marked editor-only on screen.
//   C  (OJS, OPS) the one default section (the other end of the section count).
//   R  sections "Alpha" and "Beta", both active (OJS, OPS), or series "one" and "two" (OMP); one category "Cat One";
//      one submission in each section / series. Row 4's two-active control and row 5's drive.
// Row 4: mg's and se's dashboard "Filters" on A, B, C, R (the Section field and its options); mg applies the inactive
// and the editor-only option. OMP: the press R with two series (the absence control).
// Row 5: on R, as mg and as se: apply a filter (Section "Alpha" on OJS/OPS, Category "Cat One" on OMP), then the
// window's "Clear Filters" › "Close"; the window's "Clear Filters" › "Apply Filters"; the list's "Clear Filters"; the
// chip's X; a tick left unapplied with "Close". Each read on the page right after and again after a reload.
// publicknowledge and the roster users are not used. No assertions: the script records, the reader judges.
'use strict';

const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || '1';
const PHASES = (process.env.PHASES || 'sections,clear').split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[i29 r${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    const isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const statePath = path.join(outDir(), `i29-state-r${RUN}-${app.name}.json`);
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i29-facts-run${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '').replace(/csrfToken=[^&]+/, '');
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const u = (p, k, roles, g, fam) => ({username: `${p}${k}`, roles, givenName: g, familyName: fam});

    await app.api.bootstrapProbe(app.contextPath);

    async function person(label) {
        const b = await launch(app);
        const P = {label, page: b.page, close: b.close, traffic: [], errors: [], dialogs: []};
        P.page.on('dialog', (d) => { P.dialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300), url: strip(P.page.url())}); d.accept().catch(() => {}); });
        P.page.context().on('response', (r) => {
            const url = r.url();
            if (r.status() >= 400 || /\/api\/v1\//.test(url)) P.traffic.push({at: Date.now(), m: r.request().method(), s: r.status(), u: strip(url).replace(/^\/index\.php\//, '')});
        });
        P.page.on('pageerror', (e) => P.errors.push({at: Date.now(), msg: flat(e.message, 300)}));
        P.since = (t0) => P.traffic.filter((x) => x.at >= t0 && !/_i18n/.test(x.u)).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 220)}`);
        P.bad = (t0 = 0) => P.traffic.filter((x) => x.at >= t0 && x.s >= 400).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 200)}`);
        P.errs = (t0 = 0) => P.errors.filter((e) => e.at >= t0).map((e) => e.msg);
        P.as = async (user, ctx) => { await signIn(P.page, user, ctx ? {contextPath: ctx} : {}); await idle(P.page).catch(() => {}); };
        P.go = async (url) => {
            const r = await P.page.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)}));
            await idle(P.page).catch(() => {});
            return r && typeof r.status === 'function' ? r.status() : (r && r.err) || null;
        };
        P.snap = async (name, extra = {}, {png = false} = {}) => {
            let s;
            try { s = await screen(P.page); } catch (e) { s = {url: P.page.url(), error: String(e.message).slice(0, 200)}; }
            Object.assign(s, extra);
            record(`r${RUN}-${name}`, s);
            if (png) await shot(P.page, `r${RUN}-${name}`).catch(() => {});
            return s;
        };
        return P;
    }
    async function sect(name, fn) {
        log(`== ${name}`);
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
            return null;
        }
    }

    // The list page as data (outside any dialog): heading, rows, chips, the list's "Clear Filters", the address.
    async function readList(page) {
        return page.evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const main = document.querySelector('main') || document.body;
            const out = (e) => !e.closest('[role=dialog]');
            const vis = (e) => e.getClientRects().length > 0;
            const rows = [...main.querySelectorAll('table tbody tr')].filter(out).map((tr) => t(tr.innerText).slice(0, 160));
            const chips = [...main.querySelectorAll('div.bg-selection-light')].filter(out).filter(vis).map((c) => t(c.innerText));
            const chipX = [...main.querySelectorAll('button')].filter(out).filter(vis).map((b) => t(b.getAttribute('aria-label') || '')).filter((x) => /^Clear filter/.test(x));
            const clearBtn = [...main.querySelectorAll('button')].filter(out).filter(vis).filter((b) => t(b.innerText) === 'Clear Filters').length;
            const dlg = [...document.querySelectorAll('[role=dialog]')].filter(vis);
            return {url: location.pathname + location.search, h1: t((main.querySelector('h1') || {}).innerText), rows, chips, chipX, listClearFilters: clearBtn, dialogOpen: dlg.length};
        });
    }
    const filtersWin = (page) => page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Apply Filters', exact: true})}).last();
    async function openFilters(page) {
        const btn = page.locator('main').first().getByRole('button', {name: 'Filters', exact: true}).first();
        await btn.waitFor({timeout: T}).catch(() => {});
        if (!(await btn.count())) return false;
        await btn.click();
        await filtersWin(page).getByRole('button', {name: 'Apply Filters', exact: true}).waitFor({timeout: T});
        await idle(page); await sleep(700);
        return true;
    }
    async function readFilters(page) {
        return filtersWin(page).evaluate((d) => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            const sets = [...d.querySelectorAll('fieldset, .pkpFormField')].filter(vis).map((f) => ({
                label: t((f.querySelector('legend, .pkpFormFieldLabel, label') || {}).innerText),
                options: [...f.querySelectorAll('input[type=checkbox]')].map((b) => ({label: t((b.closest('label') || b.parentElement).innerText), checked: b.checked})),
            })).filter((x) => x.options.length);
            const slider = d.querySelector('[role=slider], input[type=range]');
            return {labels: [...d.querySelectorAll('legend, .pkpFormFieldLabel')].filter(vis).map((x) => t(x.innerText)),
                buttons: [...d.querySelectorAll('button')].filter(vis).map((b) => t(b.innerText || b.getAttribute('aria-label'))).filter(Boolean), sets,
                picked: [...d.querySelectorAll('button')].map((b) => t(b.getAttribute('aria-label') || b.textContent || '')).filter((x) => /^Remove /.test(x)),
                slider: slider ? (slider.getAttribute('aria-valuenow') || slider.value) : null};
        });
    }
    async function closeFilters(page) {
        await filtersWin(page).getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(700); await idle(page).catch(() => {});
    }
    async function filtersAt(P, url, name) {
        if (url) await P.go(url);
        await sleep(500);
        const t0 = Date.now();
        const list = await readList(P.page);
        if (!(await openFilters(P.page))) { await P.snap(name, {list, filters: null}); return {list, filters: null}; }
        const f = await readFilters(P.page);
        await P.snap(name, {list, filters: f});
        await closeFilters(P.page);
        return {list, filters: f, traffic: P.since(t0), bad: P.bad(t0), pageErrors: P.errs(t0)};
    }
    const settle = async (page) => { await idle(page).catch(() => {}); await sleep(1500); };
    // Pick one option in the open window: a Section checkbox, or on a press the "Categories" suggest box
    // (type, then the suggestion; the pick shows as a "Remove {name}" chip inside the field).
    async function pick(page, label) {
        const win = filtersWin(page);
        if (!isOMP) {
            const box = win.getByRole('checkbox', {name: label, exact: true}).first();
            if (!(await box.count())) return false;
            await box.check();
            return true;
        }
        const field = win.locator('.pkpFormField, .pkpAutosuggest').filter({has: page.locator('.pkpFormFieldLabel, legend, label').filter({hasText: /^\s*Categories\b/})}).last();
        const input = field.locator('input:not([type=hidden])').first();
        if (!(await input.count())) return false;
        await input.click(); await input.fill(''); await input.pressSequentially(label.slice(0, 3), {delay: 40});
        const opt = page.locator('[role=listbox]:visible [role=option]').filter({hasText: label}).first();
        await opt.waitFor({timeout: T});
        await opt.click();
        await field.getByRole('button', {name: `Remove ${label}`, exact: true}).waitFor({timeout: T}).catch(() => {});
        await sleep(400);
        return true;
    }
    async function tickApply(P, label) {
        await openFilters(P.page);
        if (!(await pick(P.page, label))) { await closeFilters(P.page); return false; }
        await filtersWin(P.page).getByRole('button', {name: 'Apply Filters', exact: true}).click();
        await settle(P.page);
        return true;
    }

    // ------------------------------------------------------------------ seeding
    const sec = (abbrev, title) => ({abbrev, title, policy: `${title} policy`, ...(isOPS ? {path: abbrev.toLowerCase()} : {})});
    async function mk(key, {sections, series, categories} = {}) {
        const t = tag(`u23i29${key.toLowerCase()}`);
        const c = await app.api.createContext({tag: t, context: {name: `U23 I29 ${key} ${t}`, acronym: 'U23I29', contactName: 'I29 Contact', contactEmail: `${t}c@mail.test`},
            users: [u(t, 'mg', ['manager'], 'Mara', 'Manager'), u(t, 'se', ['sectionEditor'], 'Sel', 'Editor'), u(t, 'au', ['author'], 'Ada', 'Author')],
            ...(sections ? {sections} : {}), ...(series ? {series} : {}), ...(categories ? {categories} : {})});
        const o = {tag: t, path: c.path || t, subs: {}};
        const places = sections ? sections.map((s) => ({name: s.title, k: {section: s.abbrev}}))
            : series ? series.map((s) => ({name: s.title, k: {series: s.path}})) : [{name: 'default', k: {}}];
        for (const pl of places) {
            try {
                const r = await app.api.createSubmission({tag: `${t}${pl.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`, context: o.path, submitter: `${t}au`,
                    title: `In ${pl.name} ${t}`, ...pl.k, participants: [{username: `${t}se`, role: 'sectionEditor'}]});
                o.subs[pl.name] = r.submissionId;
            } catch (e) { o.subs[pl.name] = `error ${String(e.message).slice(0, 200)}`; }
        }
        return o;
    }

    try {
        if (!isOMP) {
            if (!S.A) { S.A = await mk('A', {sections: [sec('OPN', 'Open'), sec('SHT', 'Shut')]}); save(); }
            if (!S.B) { S.B = await mk('B', {sections: [sec('OPN', 'Open'), sec('EDO', 'EdOnly')]}); save(); }
            if (!S.C) { S.C = await mk('C'); save(); }
            if (!S.R) { S.R = await mk('R', {sections: [sec('ALP', 'Alpha'), sec('BET', 'Beta')], categories: [{path: 'catone', title: 'Cat One'}]}); save(); }
        } else if (!S.R) {
            S.R = await mk('R', {series: [{path: 'one', title: 'Series One'}, {path: 'two', title: 'Series Two'}], categories: [{path: 'catone', title: 'Cat One'}]}); save();
        }
        fact('seed', S);

        // ============================================================ sections (Fields "Section", fn-i; row 4)
        if (on('sections')) await sect('sections', async () => {
            const P = await person('sections');
            const out = {};
            const GRIDSEL = '#sectionsGridContainer', FORMSEL = 'form#sectionForm';
            const grid = () => P.page.locator(GRIDSEL).first();
            const form = () => P.page.locator(FORMSEL).first();
            const top = () => P.page.locator('[role="dialog"]:visible').last();
            async function openTab(ctx) {
                await P.go(cu(ctx, '/en/management/settings/context'));
                await P.page.getByRole('tab', {name: 'Sections', exact: true}).first().click(); await idle(P.page);
                await grid().waitFor({timeout: T});
                await grid().locator('tr.gridRow, tbody.empty').first().waitFor({state: 'attached', timeout: T}).catch(() => {});
                await sleep(500);
            }
            const gridTitles = async () => grid().locator('tbody:not(.empty) tr.gridRow').evaluateAll((trs) => trs.map((tr) => {
                const c = tr.querySelectorAll('td');
                const box = tr.querySelector('input[type=checkbox]');
                return {title: (c[0] ? c[0].innerText : '').replace(/\s+/g, ' ').replace(/^Settings\s*/, '').trim(), inactive: box ? box.checked : null};
            }));
            async function tickBox(title, rx, label) {
                const row = grid().locator('tr.gridRow').filter({hasText: title}).first();
                const tog = row.locator('a.show_extras');
                if (await tog.count()) { await tog.first().click(); await sleep(400); }
                const id = await row.getAttribute('id');
                await P.page.locator(`tr#${id} + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
                await form().locator('input[name^="title"]').first().waitFor({timeout: T});
                await idle(P.page); await sleep(800);
                const cb = form().getByRole('checkbox', {name: rx}).first();
                const cbLabel = flat(await cb.evaluate((b) => (b.closest('label') || b.parentElement).innerText).catch(() => null), 200);
                await cb.check();
                const t0 = Date.now();
                const w = P.page.waitForResponse((r) => r.request().method() === 'POST' && /update-?section/i.test(r.url()), {timeout: T}).catch(() => null);
                await form().getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                await sleep(1200); await idle(P.page).catch(() => {});
                const open = await form().isVisible().catch(() => false);
                if (open) { await top().getByRole('button', {name: 'Close'}).first().click().catch(() => {}); await sleep(900); }
                const res = {checkbox: cbLabel, post: r ? r.status() : null, windowOpen: open, bad: P.bad(t0)};
                await P.snap(label, {save: res});
                return res;
            }
            // The section's Edit window reopened after a fresh load of the tab: the box's state as stored.
            async function readBox(title, rx, label) {
                const row = grid().locator('tr.gridRow').filter({hasText: title}).first();
                const tog = row.locator('a.show_extras');
                if (await tog.count()) { await tog.first().click(); await sleep(400); }
                const id = await row.getAttribute('id');
                await P.page.locator(`tr#${id} + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
                await form().locator('input[name^="title"]').first().waitFor({timeout: T});
                await idle(P.page); await sleep(800);
                const checked = await form().getByRole('checkbox', {name: rx}).first().isChecked().catch(() => null);
                await P.snap(label, {checked});
                await top().getByRole('button', {name: 'Close'}).first().click().catch(() => {}); await sleep(900);
                return checked;
            }
            async function applyAndRead(label, name) {
                const t0 = Date.now();
                const ok = await tickApply(P, label);
                if (!ok) return {absent: true};
                const list = await readList(P.page);
                await P.snap(name, {list});
                const o = {list, traffic: P.since(t0), bad: P.bad(t0), pageErrors: P.errs(t0)};
                const pageClear = P.page.locator('main').first().getByRole('button', {name: 'Clear Filters', exact: true}).first();
                if (await pageClear.count()) { await pageClear.click(); await settle(P.page); }
                o.afterListClear = await readList(P.page);
                return o;
            }
            const dash = (ctx) => cu(ctx, '/en/dashboard/editorial?currentViewId=active');
            try {
                if (!isOMP) {
                    if (!S.setupDone) {
                        await P.as(`${S.A.tag}mg`, S.A.path);
                        await openTab(S.A.path);
                        out.aShut = await tickBox('Shut', /Mark this section as inactive/, 's01-a-shut-inactive-saved');
                        await openTab(S.A.path);
                        out.aGrid = await gridTitles();
                        await P.snap('s02-a-sections-grid', {grid: out.aGrid});
                        await P.as(`${S.B.tag}mg`, S.B.path);
                        await openTab(S.B.path);
                        out.bEdOnly = await tickBox('EdOnly', /Items can only be submitted by/, 's03-b-edonly-saved');
                        await openTab(S.B.path);
                        out.bGrid = await gridTitles();
                        await P.snap('s04-b-sections-grid', {grid: out.bGrid});
                        out.bEdOnlyStored = await readBox('EdOnly', /Items can only be submitted by/, 's04b-b-edonly-reopened');
                        S.setupDone = true; save();
                    }
                    for (const [k, n] of [['A', '05'], ['B', '07'], ['C', '09'], ['R', '11']]) {
                        const ctx = S[k];
                        await P.as(`${ctx.tag}mg`, ctx.path);
                        out[`${k}mg`] = await filtersAt(P, dash(ctx.path), `s${n}-${k.toLowerCase()}-manager-filters`);
                        if (k === 'A') {
                            await loc(P.page, 'Dashboard: "Filters"', P.page.locator('main').getByRole('button', {name: 'Filters', exact: true}));
                            await openFilters(P.page);
                            await loc(P.page, 'Filters window: "Section" option "Shut" (inactive)', filtersWin(P.page).getByRole('checkbox', {name: 'Shut', exact: true}));
                            await closeFilters(P.page);
                            out.AmgApplyShut = await applyAndRead('Shut', 's05b-a-manager-applied-shut');
                        }
                        if (k === 'B') out.BmgApplyEdOnly = await applyAndRead('EdOnly', 's07b-b-manager-applied-edonly');
                        await P.as(`${ctx.tag}se`, ctx.path);
                        out[`${k}se`] = await filtersAt(P, dash(ctx.path), `s${String(Number(n) + 1).padStart(2, '0')}-${k.toLowerCase()}-sectioneditor-filters`);
                    }
                } else {
                    await P.as(`${S.R.tag}mg`, S.R.path);
                    out.Rmg = await filtersAt(P, dash(S.R.path), 's11-r-manager-filters');
                    await P.as(`${S.R.tag}se`, S.R.path);
                    out.Rse = await filtersAt(P, dash(S.R.path), 's12-r-serieseditor-filters');
                }
                await signOut(P.page).catch(() => {});
                out.crashes = P.traffic.filter((x) => x.s >= 500).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 160)}`);
                out.bad = P.bad();
                out.pageErrors = P.errs();
                out.dialogs = P.dialogs;
                fact('sections', out);
            } finally { save(); await P.close(); }
        });

        // ============================================================ clear (Rule 8, Rule 6, fn-i; row 5)
        if (on('clear')) await sect('clear', async () => {
            const P = await person('clear');
            const option = isOMP ? 'Cat One' : 'Alpha';
            const url = cu(S.R.path, '/en/dashboard/editorial?currentViewId=active');
            const out = {option};
            const reload = async () => { await P.page.reload().catch(() => {}); await settle(P.page); return readList(P.page); };
            try {
                for (const who of ['mg', 'se']) {
                    const o = {};
                    const n = (s) => `c-${who}-${s}`;
                    await P.as(`${S.R.tag}${who}`, S.R.path);
                    await P.go(url); await settle(P.page);
                    o.before = await readList(P.page);
                    await P.snap(n('00-before'), {list: o.before});
                    // 1. apply
                    let t0 = Date.now();
                    o.applied = await tickApply(P, option);
                    o.afterApply = await readList(P.page);
                    o.applyTraffic = P.since(t0);
                    await P.snap(n('01-applied'), {list: o.afterApply});
                    if (who === 'mg') {
                        await loc(P.page, 'Dashboard: the active filter chip', P.page.locator('div.bg-selection-light').filter({hasText: option}));
                        await loc(P.page, 'Dashboard: the chip\'s X', P.page.getByRole('button', {name: new RegExp(`^Clear filter: .*${option}`)}));
                        await loc(P.page, 'Dashboard: the list\'s "Clear Filters" beside the chips', P.page.locator('main').getByRole('button', {name: 'Clear Filters', exact: true}));
                    }
                    // 2. reopen: what the window shows; its "Clear Filters"; then "Close"
                    t0 = Date.now();
                    await openFilters(P.page);
                    o.reopened = await readFilters(P.page);
                    await P.snap(n('02-reopened'), {filters: o.reopened});
                    if (who === 'mg') await loc(P.page, 'Filters window: "Clear Filters"', filtersWin(P.page).getByRole('button', {name: 'Clear Filters', exact: true}));
                    await filtersWin(P.page).getByRole('button', {name: 'Clear Filters', exact: true}).first().click();
                    await idle(P.page); await sleep(900);
                    o.windowAfterClear = await readFilters(P.page).catch((e) => ({err: String(e.message).slice(0, 120)}));
                    o.windowOpenAfterClear = await filtersWin(P.page).isVisible().catch(() => false);
                    o.listBehindAfterClear = await readList(P.page);
                    await P.snap(n('03-window-cleared'), {filters: o.windowAfterClear, windowOpen: o.windowOpenAfterClear, list: o.listBehindAfterClear});
                    o.clearTraffic = P.since(t0);
                    if (o.windowOpenAfterClear) await closeFilters(P.page);
                    o.afterClearClose = await readList(P.page);
                    await P.snap(n('04-cleared-then-close'), {list: o.afterClearClose});
                    o.afterClearCloseReload = await reload();
                    await P.snap(n('05-cleared-then-close-reload'), {list: o.afterClearCloseReload});
                    await openFilters(P.page);
                    o.reopenedAfterClearClose = await readFilters(P.page);
                    await P.snap(n('06-reopened-after-clear-close'), {filters: o.reopenedAfterClearClose});
                    await closeFilters(P.page);
                    // 3. the window's "Clear Filters", then "Apply Filters"
                    t0 = Date.now();
                    if (!(o.afterClearCloseReload.chips || []).length) { await tickApply(P, option); o.reappliedFor3 = await readList(P.page); }
                    await openFilters(P.page);
                    await filtersWin(P.page).getByRole('button', {name: 'Clear Filters', exact: true}).first().click();
                    await idle(P.page); await sleep(900);
                    o.windowAfterClear2 = await readFilters(P.page).catch(() => null);
                    await filtersWin(P.page).getByRole('button', {name: 'Apply Filters', exact: true}).click();
                    await settle(P.page);
                    o.afterClearApply = await readList(P.page);
                    o.clearApplyTraffic = P.since(t0);
                    await P.snap(n('07-cleared-then-apply'), {list: o.afterClearApply});
                    o.afterClearApplyReload = await reload();
                    await P.snap(n('08-cleared-then-apply-reload'), {list: o.afterClearApplyReload});
                    // 4. the list's "Clear Filters" beside the chips
                    t0 = Date.now();
                    await tickApply(P, option);
                    o.beforeListClear = await readList(P.page);
                    const pageClear = P.page.locator('main').first().getByRole('button', {name: 'Clear Filters', exact: true}).first();
                    o.listClearPresent = await pageClear.count();
                    if (o.listClearPresent) { await pageClear.click(); await settle(P.page); }
                    o.afterListClear = await readList(P.page);
                    o.listClearTraffic = P.since(t0);
                    await P.snap(n('09-list-clear'), {list: o.afterListClear, before: o.beforeListClear});
                    o.afterListClearReload = await reload();
                    await P.snap(n('10-list-clear-reload'), {list: o.afterListClearReload});
                    await openFilters(P.page);
                    o.reopenedAfterListClear = await readFilters(P.page);
                    await closeFilters(P.page);
                    // 5. the chip's X
                    await tickApply(P, option);
                    const x = P.page.getByRole('button', {name: new RegExp(`^Clear filter: .*${option}`)}).first();
                    o.chipXPresent = await x.count();
                    if (o.chipXPresent) { await x.click(); await settle(P.page); }
                    o.afterChipX = await readList(P.page);
                    await P.snap(n('11-chip-x'), {list: o.afterChipX});
                    // 6. a tick left unapplied, "Close"; the list, then the window again; then a reload
                    t0 = Date.now();
                    await openFilters(P.page);
                    o.unappliedPicked = await pick(P.page, option);
                    await closeFilters(P.page);
                    o.unappliedClose = {list: await readList(P.page), traffic: P.since(t0)};
                    await openFilters(P.page);
                    o.unappliedClose.reopened = await readFilters(P.page);
                    await P.snap(n('12-unapplied-tick-close-reopened'), {filters: o.unappliedClose.reopened, list: o.unappliedClose.list});
                    await closeFilters(P.page);
                    o.unappliedClose.reload = await reload();
                    await P.snap(n('13-unapplied-tick-close-reload'), {list: o.unappliedClose.reload});
                    out[who] = o;
                }
                await signOut(P.page).catch(() => {});
                out.crashes = P.traffic.filter((x) => x.s >= 500).map((x) => `${x.m} ${x.s} ${x.u.slice(0, 160)}`);
                out.bad = P.bad();
                out.pageErrors = P.errs();
                out.dialogs = P.dialogs;
                fact('clear', out);
            } finally { save(); await P.close(); }
        });
    } finally {
        save();
    }
});
