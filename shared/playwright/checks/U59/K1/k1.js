// U59 claim check, chunk K1: Administration › "Hosted Journals" list (who opens it, a row), the
// "Create Journal" window, a refused and an accepted save, what a new journal starts with, a
// one-language site.
// Spec: docs/specs/U59-hosted-journals.md — body 10–133, Settings 305–312, Cross-feature 343–349,
// 353–355, 360–365, register A1, A3, OPS1; footnotes a, b, c, d, e, g, m, td1, td2, td3, td4, f-a1,
// f-a3, f-ops1.
//
//   PROBE_FEATURE=U59 PROBE_AGENT=ccK1 node bin/probe.js <app|all> shared/playwright/checks/U59/K1/k1.js
//   PHASES=seed,access,jpath,list,form,refuse,leave,createA,afterA,createB,createC,names,a1,many,onelang,final
//   (default: every phase but `many` and `onelang`, which change what every agent on the fleet sees:
//   `many` adds 52 disabled scratch journals (the list's length axis), `onelang` disables French on the
//   site for a moment (Rule 7) and must run with no other agent on the fleet; both are opt-in).
//   Later phases read k1-state-<app>.json (written by seed and the create phases).
//
// Journals per app (tag prefix u59k1; none of the seeded journals is edited):
//   S   scratch (POST scenarios/context), no country, enabled         a1 (Edit), site home has two entries
//   S2  scratch, no country                                           a1 (Settings wizard › Journal)
//   JA  created on "Create Journal": en+fr, primary en, EN+FR title, description, "Enable" unticked
//   JB  created on "Create Journal": en only, description, "Enable" ticked
//   JC  created on "Create Journal": en+fr, primary French, French title only
//   JD  created on "Create Journal" while the site has English alone (onelang)
//   M*  52 scratch journals, disabled (many)
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, settled, tag, outDir} = require('../../../probe');

const T = 30_000;
const DEFAULT = ['seed', 'access', 'jpath', 'list', 'form', 'refuse', 'leave', 'createA', 'afterA', 'createB', 'createC', 'names', 'reqlang', 'goto', 'a1', 'final'];
const PHASES = (process.env.PHASES || DEFAULT.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const PK = 'publicknowledge';
const LP = process.env.LISTTAG || 'l';   // snapshot prefix of the list phase (l1 = the one-journal site)
const ROSTER = {
    ojs: [['manager', 'manager.maya'], ['editor', 'editor.diana'], ['subEditor', 'sectioneditor.ana'], ['assistant', 'copyeditor.carla'], ['reviewer', 'reviewer.julia'], ['author', 'author.alex'], ['reader', 'reader.rosa']],
    omp: [['manager', 'manager.maya'], ['editor', 'editor.diana'], ['subEditor', 'sectioneditor.ana'], ['assistant', 'copyeditor.carla'], ['reviewer', 'reviewer.julia'], ['author', 'author.alex'], ['reader', 'reader.rosa']],
    ops: [['manager', 'manager.maya'], ['subEditor', 'sectioneditor.ana'], ['assistant', 'assistant.rita'], ['author', 'author.alex'], ['reader', 'reader.rosa']],
};
const TABLE = {ojs: 'journals', omp: 'presses', ops: 'servers'};
const IDCOL = {ojs: 'journal_id', omp: 'press_id', ops: 'server_id'};
const sql = (db, q) => execFileSync('psql', ['-d', db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();

// ------------------------------------------------------------------ page instrumentation (from U57 K1)
async function instrument(page) {
    const ev = {dialogs: [], errs: [], bad: [], posts: []};
    page.on('dialog', (d) => {
        ev.dialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 400)});
        // a page-leave question is answered by the step that expects it (ev.answer), otherwise accepted
        const a = ev.answer || 'accept';
        (a === 'dismiss' ? d.dismiss() : d.accept()).catch(() => {});
    });
    page.on('console', (m) => { if (m.type() === 'error') ev.errs.push({at: Date.now(), t: m.text().slice(0, 300)}); });
    page.on('pageerror', (e) => ev.errs.push({at: Date.now(), t: `pageerror: ${String(e.message).slice(0, 300)}`}));
    page.on('response', (r) => { if (r.status() >= 400) ev.bad.push({at: Date.now(), s: r.status(), m: r.request().method(), u: r.url().replace(/^.*\/index\.php/, '').replace(/csrfToken=[^&]+/, '').slice(0, 200)}); });
    page.on('request', (r) => { if (r.method() !== 'GET') ev.posts.push({at: Date.now(), m: r.method(), u: r.url().replace(/^.*\/index\.php/, '').slice(0, 160), o: r.headers()['x-http-method-override'] || null}); });
    await page.context().addInitScript(() => {
        window.__notices = [];
        const seen = new WeakSet();
        const sweep = () => {
            document.querySelectorAll('.ui-pnotify, [class*="pnotify"], .pkpNotification, .pkp_notification, [role="alert"], [class*="toast"], [class*="Toast"]').forEach((e) => {
                const t = (e.innerText || '').trim();
                if (t && !seen.has(e)) { seen.add(e); window.__notices.push({t: t.slice(0, 300), at: Date.now()}); }
            });
        };
        new MutationObserver(sweep).observe(document, {subtree: true, childList: true, characterData: true});
    });
    ev.since = async (t0) => {
        const raw = await page.evaluate((s) => (window.__notices || []).filter((n) => n.at >= s), t0).catch(() => []);
        return {
            notices: [...new Set(raw.map((n) => n.t))].filter((t) => !/^(Saving|Loading)/.test(t)),
            dialogs: ev.dialogs.filter((d) => d.at >= t0).map((d) => `${d.type}: ${d.message}`),
            errs: ev.errs.filter((d) => d.at >= t0).map((d) => d.t),
            bad: ev.bad.filter((d) => d.at >= t0).map((d) => `${d.s} ${d.m} ${d.u}`),
            posts: ev.posts.filter((d) => d.at >= t0).map((d) => `${d.m}${d.o ? `(${d.o})` : ''} ${d.u}`),
        };
    };
    return ev;
}

async function snap(page, name, extra = {}) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

// The page as facts: heading, trail, access-denied text, login form.
async function pageFacts(page) {
    const d = await page.evaluate(() => {
        const tc = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('main') || document.body;
        const crumbs = document.querySelector('nav.app__breadcrumbs, nav.cmp_breadcrumbs');
        return {
            title: document.title,
            h1: tc(main.querySelector('h1')),
            crumbs: crumbs ? [...crumbs.querySelectorAll('li')].map((li) => ({text: tc(li), link: !!li.querySelector('a')})) : null,
            body: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 600),
            loginForm: !!document.querySelector('form#login, form.cmp_form.login, input[name="username"]'),
        };
    }).catch((e) => ({error: String(e).slice(0, 200)}));
    return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), ...d};
}

// ------------------------------------------------------------------ the Hosted Journals list
async function readList(page) {
    return page.evaluate(() => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const c = document.querySelector('#contextGridContainer');
        if (!c) return null;
        const crumbs = document.querySelector('nav.app__breadcrumbs');
        const head = c.querySelector('.header');
        const rows = [...c.querySelectorAll('tbody tr.gridRow')].map((r) => ({
            id: r.id.replace(/^.*-row-/, ''),
            cells: [...r.querySelectorAll('td')].map((td) => txt(td)),
            cls: r.className,
            html: r.innerHTML.replace(/\s+/g, ' ').replace(/<script.*?<\/script>/g, '').slice(0, 400),
        }));
        return {
            crumbs: crumbs ? [...crumbs.querySelectorAll('li')].map((li) => ({text: txt(li), link: !!li.querySelector('a')})) : null,
            h1: txt(document.querySelector('main h1')),
            gridTitle: txt(c.querySelector('h4')),
            columns: [...c.querySelectorAll('thead th')].map((th) => txt(th)),
            actions: head ? [...head.querySelectorAll('.actions a')].map((a) => ({text: txt(a) || a.textContent.trim(), visible: !!a.getClientRects().length})) : [],
            rows,
            paging: [...c.querySelectorAll('.gridPaging, .pkp_linkaction_moreItems, [class*="paging"], .pagination')].map((e) => txt(e)),
            under: txt(c.querySelector('.footer, .gridFooter')),
            emptyLine: txt(c.querySelector('tbody.empty')),
            upgrade: /new version/i.test(document.body.innerText),
        };
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));
}
async function landList(page, app, locale = 'en') {
    const resp = await page.goto(app.url(`/index.php/index/${locale}/admin/contexts`)).catch((e) => ({error: String(e.message)}));
    await idle(page).catch(() => {});
    await page.locator('#contextGridContainer tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {}); await sleep(300);
    return resp && resp.status ? resp.status() : null;
}
const gridRow = (page, id) => page.locator(`#contextGridContainer tr.gridRow[id$="-row-${id}"]`).first();
async function rowArrow(page, id) {
    const row = gridRow(page, id);
    const a = row.locator('a.show_extras').first();
    const out = {arrow: await a.count(), arrowName: await a.textContent().then((t) => t.trim()).catch(() => null)};
    if (out.arrow) {
        await a.click().catch(() => {}); await sleep(500);
        const ctl = page.locator(`[id="${await row.getAttribute('id')}-control-row"]`);
        out.links = await ctl.locator('a').evaluateAll((as) => as.filter((x) => x.getClientRects().length).map((x) => x.innerText.trim()));
        out.ctl = ctl;
    }
    return out;
}

// ------------------------------------------------------------------ the journal form (Create / Edit / wizard)
const formOf = (page) => page.locator('form').filter({has: page.locator('[id^="context-name-control"]')}).last();
async function openCreate(page, app, locale = 'en') {
    await landList(page, app, locale);
    const create = page.locator('#contextGridContainer .header a[id*="createContext"]').first();
    const label = flat(await create.innerText().catch(() => ''), 80);
    await create.click();
    await page.locator('[id^="context-name-control"]').first().waitFor({state: 'visible', timeout: T});
    await idle(page); await sleep(700);
    return {label, cf: formOf(page)};
}
async function readForm(cf) {
    return cf.evaluate((f) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const fields = [...f.querySelectorAll('.pkpFormField')].filter((g) => !g.parentElement.closest('.pkpFormField')).map((g) => {
            const label = g.querySelector('.pkpFormFieldLabel, legend');
            return {
                label: txt(label),
                required: !!g.querySelector('.pkpFormFieldLabel__required, [class*="required"]'),
                visible: !!g.getClientRects().length,
                desc: txt(g.querySelector('.pkpFormField__description')),
                prefix: txt(g.querySelector('.pkpFormField__inputPrefix')),
                errors: [...g.querySelectorAll('.pkpFormField__error, .pkpFieldError')].filter((e) => e.getClientRects().length).map((e) => txt(e)).filter(Boolean),
                inputs: [...g.querySelectorAll('input:not([type=submit]), select, textarea')].map((i) => `${i.name || i.id}${i.type === 'checkbox' || i.type === 'radio' ? `=${i.value}:${i.checked ? 'X' : '-'}` : i.tagName === 'SELECT' ? `=${i.value}(${i.options.length})` : `=${(i.value || '').slice(0, 40)}`}${i.getClientRects().length ? '' : '(hidden)'}`),
            };
        });
        const footer = f.querySelector('.pkpFormPage__footer, .pkpFormPage__buttons, .pkpFormFooter') || f;
        return {
            fields,
            localeButtons: [...f.querySelectorAll('.pkpFormLocales button, [class*="Locales"] button')].map((b) => txt(b)),
            localesLine: txt(f.querySelector('.pkpFormLocales, [class*="formLocales"]')),
            errorsLine: txt(f.querySelector('.pkpFormPage__errors, .pkpFormErrors, [class*="errors"]')),
            goTo: [...f.querySelectorAll('a, button')].filter((a) => /^Go to/.test((a.innerText || '').trim())).map((a) => txt(a)),
            status: txt(f.querySelector('[role="status"]')),
            footer: txt(footer).slice(-300),
            saveDisabled: [...f.querySelectorAll('button')].filter((b) => /^Save$/.test(b.innerText.trim())).map((b) => b.disabled),
        };
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));
}
// fill one field of the form (text, multilingual text, select, checkbox)
async function setText(cf, id, v) { const i = cf.locator(`[id="${id}"]`).first(); await i.fill(v); await i.blur().catch(() => {}); }
async function showFrench(cf) {
    const b = cf.getByRole('button', {name: 'French', exact: true}).first();
    if (await b.count() && await cf.locator('[id="context-name-control-fr_CA"]').first().isHidden().catch(() => true)) { await b.click().catch(() => {}); await sleep(400); }
}
async function typeRich(page, id, text) {
    await page.waitForFunction((x) => { const e = window.tinymce && window.tinymce.get(x); return !!(e && e.initialized); }, id, {timeout: T}).catch(() => {});
    const body = page.frameLocator(`[id="${id}_ifr"]`).locator('body');
    await body.click().catch(() => {});
    await page.keyboard.type(text);
    await page.locator('[id^="context-urlPath-control"]').first().focus().catch(() => {});
}
async function tick(cf, name, value, want = true) {
    const b = cf.locator(`input[name="${name}"][value="${value}"]`).first();
    if (!(await b.count())) return false;
    if ((await b.isChecked()) !== want) await b.click().catch(() => {});
    return true;
}
async function pickCountry(cf, label = 'Iceland') { await cf.locator('select[name="country"]').first().selectOption({label}).catch(() => {}); }
async function fillBasics(page, cf, v) {
    if (v.name != null) await setText(cf, 'context-name-control-en', v.name);
    if (v.nameFr != null) { await showFrench(cf); await setText(cf, 'context-name-control-fr_CA', v.nameFr); }
    if (v.acronym != null) await setText(cf, 'context-acronym-control-en', v.acronym);
    if (v.acronymFr != null) { await showFrench(cf); await setText(cf, 'context-acronym-control-fr_CA', v.acronymFr); }
    if (v.contactName != null) await setText(cf, 'context-contactName-control', v.contactName);
    if (v.contactEmail != null) await setText(cf, 'context-contactEmail-control', v.contactEmail);
    if (v.country) await pickCountry(cf, v.country);
    if (v.description) await typeRich(page, 'context-description-control-en', v.description);
    if (v.path != null) await setText(cf, 'context-urlPath-control', v.path);
    for (const l of v.langs || []) await tick(cf, 'supportedLocales', l, true);
    for (const l of v.unlangs || []) await tick(cf, 'supportedLocales', l, false);
    if (v.primary) await tick(cf, 'primaryLocale', v.primary, true);
    if (v.enabled != null) await tick(cf, 'enabled', 'true', v.enabled);
}
// press "Save" and read: the POST sent (if any), the form's messages, where the page went
async function pressSave(page, cf, ev, name) {
    const t0 = Date.now();
    const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
    const urlBefore = page.url();
    const btn = cf.getByRole('button', {name: /^(Save|Enregistrer)$/});
    if (await btn.isDisabled().catch(() => false)) {
        // a Vue form keeps "Save" disabled after a refused save until a flagged box changes
        const form = await readForm(cf);
        const out = {saveDisabled: true, sent: false, errors: form.fields ? form.fields.filter((f) => f.errors.length).map((f) => `${f.label}: ${f.errors.join(' / ')}`) : form, errorsLine: form.errorsLine};
        await snap(page, name, {save: out});
        return out;
    }
    await btn.click();
    const resp = await w;
    let body = null;
    if (resp) body = await resp.text().then((b) => b.slice(0, 600)).catch(() => null);
    await page.waitForURL((u) => String(u) !== urlBefore, {timeout: resp && resp.status() < 400 ? 20000 : 1500}).catch(() => {});
    await idle(page).catch(() => {}); await sleep(900);
    const e = await ev.since(t0);
    const left = page.url() !== urlBefore;
    const form = left ? null : await readForm(cf);
    const out = {status: resp ? resp.status() : null, sent: !!resp, body, urlAfter: page.url().replace(/^https?:\/\/[^/]+/, ''), left, ms: Date.now() - t0, ...e,
        dialogOpen: await page.getByRole('dialog', {name: /^Create (Journal|Press|Server)$/}).count().catch(() => null),
        errors: form && !form.error ? form.fields.filter((f) => f.errors.length).map((f) => `${f.label}: ${f.errors.join(' / ')}`) : null,
        errorsLine: form && form.errorsLine, goTo: form && form.goTo, formStatus: form && form.status};
    await snap(page, name, {save: out});
    return out;
}

// ------------------------------------------------------------------ main
forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
    const isOMP = app.name === 'omp';
    const db = app.db || `${app.name}_test_s2`;
    const log = (...a) => console.log(`[${app.name}]`, ...a);
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('k1-facts', {[k]: v}, {merge: true}); };
    const ctxRows = () => sql(db, `select ${IDCOL[app.name]}, path, seq, enabled from ${TABLE[app.name]} order by seq, ${IDCOL[app.name]}`).split('\n').map((l) => l.split('|'));
    const ctxId = (p) => (ctxRows().find((r) => r[1] === p) || [])[0];
    const cu = (ctx, rest = '') => app.url(`/index.php/${ctx}${rest}`);

    const {page, close} = await launch(app);
    const ev = await instrument(page);
    const as = async (user, ctx) => { await signIn(page, user, ctx ? {contextPath: ctx} : undefined); await idle(page).catch(() => {}); };
    async function sect(name, fn) {
        const t0 = Date.now();
        try { const r = await fn(); log(`[${name} done in ${Math.round((Date.now() - t0) / 1000)} s]`); return r; } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
            await snap(page, `zz-failed-${name}`).catch(() => {});
            return null;
        }
    }
    const pkId = ctxId(PK);

    try {
        // ============================================================ seed: S and S2 (the test tooling: no country)
        if (on('seed')) await sect('seed', async () => {
            if (!S.t) { S.t = tag('u59k1'); save(); }
            for (const k of ['S', 'S2']) {
                if (S[k]) continue;
                const p = `${S.t}${k.toLowerCase()}`;
                const r = await app.api.createContext({tag: p, context: {name: `U59 K1 ${k} ${S.t}`, acronym: `K1${k}`}});
                S[k] = {path: p, id: ctxId(p), resp: JSON.stringify(r).slice(0, 200)};
                save();
            }
            fact('seed', S);
        });

        // ============================================================ access: Actors rows 1–5, Rule 1's gate (td1)
        if (on('access')) await sect('access', async () => {
            const out = {};
            const addrs = {contexts: '/index/en/admin/contexts', wizard: `/index/en/admin/wizard/${pkId}`};
            const read = async (label) => {
                const r = {};
                for (const [k, a] of Object.entries(addrs)) {
                    const t0 = Date.now();
                    const resp = await page.goto(app.url(`/index.php${a}`)).catch((e) => ({error: String(e.message)}));
                    await idle(page).catch(() => {});
                    const f = await pageFacts(page);
                    r[k] = {status: resp && resp.status ? resp.status() : null, url: f.url, h1: f.h1, loginForm: f.loginForm, body: flat(f.body, 260), bad: (await ev.since(t0)).bad};
                    await snap(page, `a-${label}-${k}`);
                }
                return r;
            };
            // the Site Administrator at the site's address, and with the seeded journal's path in its place
            await as('admin');
            out.admin = await read('admin');
            for (const [k, a] of Object.entries({contextsAtJournal: `/${PK}/en/admin/contexts`, wizardAtJournal: `/${PK}/en/admin/wizard/${pkId}`, contextsAtJournalNoLocale: `/${PK}/admin/contexts`})) {
                const resp = await page.goto(app.url(`/index.php${a}`)).catch(() => null); await idle(page).catch(() => {});
                const f = await pageFacts(page);
                out.admin[k] = {status: resp && resp.status ? resp.status() : null, url: f.url, h1: f.h1, body: flat(f.body, 260)};
                await snap(page, `a-admin-${k}`);
            }
            // Administration's own page: the button that opens the list
            await page.goto(app.url('/index.php/index/en/admin')); await idle(page);
            out.adminPage = {links: await page.locator('main a').evaluateAll((as) => as.filter((a) => a.getClientRects().length).map((a) => a.innerText.trim()).filter(Boolean)).catch(() => [])};
            await snap(page, 'a-admin-administration-page');
            await loc(page, 'Administration: the "Hosted Journals" link', page.locator('main').getByRole('link', {name: /^Hosted (Journals|Presses|Servers)$/}));
            // every other permission level
            for (const [lvl, u] of ROSTER[app.name]) {
                await as(u, PK);
                out[lvl] = await read(lvl);
                if (lvl === 'manager') {
                    // Actors row 4: what the journal's own Settings › Journal offers a manager (read only)
                    await page.goto(cu(PK, '/en/management/settings/context')); await idle(page);
                    await sleep(800);
                    out.managerMasthead = {labels: await page.locator('main .pkpFormFieldLabel, main legend').evaluateAll((ls) => ls.filter((l) => l.getClientRects().length).map((l) => l.innerText.replace(/\s+/g, ' ').trim())).catch(() => []),
                        tabs: await page.locator('main [role="tab"]').evaluateAll((ts) => ts.map((t) => t.innerText.trim())).catch(() => []),
                        buttons: await page.locator('main button').evaluateAll((bs) => bs.filter((b) => b.getClientRects().length).map((b) => b.innerText.trim()).filter(Boolean)).catch(() => [])};
                    await snap(page, 'a-manager-settings-journal-masthead', {mast: out.managerMasthead});
                    await page.locator('#contact-button').first().click().catch(() => {}); await idle(page); await sleep(600);
                    out.managerContact = {labels: await page.locator('main .pkpFormFieldLabel, main legend').evaluateAll((ls) => ls.filter((l) => l.getClientRects().length).map((l) => l.innerText.replace(/\s+/g, ' ').trim())).catch(() => [])};
                    await snap(page, 'a-manager-settings-journal-contact', {contact: out.managerContact});
                    // the side menu has no Administration entry
                    out.managerSide = flat(await page.locator('nav[aria-label="Site Navigation"], nav#app-nav').first().innerText().catch(() => null), 600);
                }
                await signOut(page);
            }
            // signed out
            out.out = await read('out');
            // Actors row 5: the site's home page, signed out and as a reader
            for (const [who, u] of [['visitor', null], ['reader', 'reader.rosa']]) {
                if (u) await as(u, PK); else await signOut(page).catch(() => {});
                await page.goto(app.url('/index.php/index/en')); await idle(page);
                out[`home-${who}`] = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), list: await page.locator('.journals li, .presses li, .servers li, ul.journals > li, .page_index_site li').evaluateAll((ls) => ls.map((l) => l.innerText.replace(/\s+/g, ' ').trim().slice(0, 160))).catch(() => []), h2: await page.locator('h2').allInnerTexts().catch(() => [])};
                await snap(page, `a-home-${who}`, {home: out[`home-${who}`]});
            }
            await signOut(page).catch(() => {});
            fact('access', out);
        });

        // ============================================================ jpath: Actors row 1's last end for other accounts ("anyone", journal path in place of the site's)
        if (on('jpath')) await sect('jpath', async () => {
            const out = {};
            for (const [who, u] of [['out', null], ['manager', 'manager.maya'], ['reader', 'reader.rosa']]) {
                if (u) await as(u, PK); else await signOut(page).catch(() => {});
                out[who] = {};
                for (const [k, a] of Object.entries({contexts: `/${PK}/en/admin/contexts`, wizard: `/${PK}/en/admin/wizard/${pkId}`})) {
                    const resp = await page.goto(app.url(`/index.php${a}`)).catch(() => null); await idle(page).catch(() => {});
                    const f = await pageFacts(page);
                    out[who][k] = {status: resp && resp.status ? resp.status() : null, url: f.url, loginForm: f.loginForm, body: flat(f.body, 200).slice(-90)};
                    await snap(page, `j-${who}-${k}-at-journal`);
                }
            }
            await signOut(page).catch(() => {});
            fact('jpath', out);
        });

        // ============================================================ list: Rules 1, 2 (td2), the page as it stands
        if (on('list')) await sect('list', async () => {
            const out = {};
            await as('admin');
            const t0 = Date.now();
            out.status = await landList(page, app);
            out.list = await readList(page);
            out.db = ctxRows();
            out.errsOnLoad = await ev.since(t0);
            await snap(page, `${LP}-01-list`, {list: out.list});
            await loc(page, 'Hosted Journals: the grid', page.locator('#contextGridContainer'));
            await loc(page, 'Hosted Journals: "Create Journal"', page.locator('#contextGridContainer .header a[id*="createContext"]'));
            await loc(page, 'Hosted Journals: "Order"', page.locator('#contextGridContainer .header a[id*="orderItems"]'));
            await loc(page, 'Hosted Journals: a row (by id)', gridRow(page, pkId));
            // "Order", then "Cancel ordering"
            const order = page.locator('#contextGridContainer .header a[id*="orderItems"]').first();
            out.orderVisible = await order.isVisible().catch(() => false);
            if (out.orderVisible) {
                const t1 = Date.now();
                await order.click().catch(() => {}); await sleep(800);
                out.ordering = {controls: await page.locator('#contextGridContainer .order_finish_controls a').evaluateAll((as) => as.filter((a) => a.getClientRects().length).map((a) => a.innerText.trim())).catch(() => []),
                    ...(await ev.since(t1))};
                await snap(page, `${LP}-02-ordering`, {ordering: out.ordering});
                const t2 = Date.now();
                await page.locator('#contextGridContainer .order_finish_controls a.cancelFormButton').first().click().catch(() => {}); await sleep(800);
                out.cancelOrdering = {orderVisibleAfter: await order.isVisible().catch(() => false), ...(await ev.since(t2))};
                await snap(page, `${LP}-03-cancel-ordering`, {cancel: out.cancelOrdering});
            }
            // a row's arrow, then "Edit" and close it
            const t3 = Date.now();
            const ra = await rowArrow(page, pkId);
            out.arrow = {arrow: ra.arrow, arrowName: ra.arrowName, links: ra.links, ...(await ev.since(t3))};
            await snap(page, `${LP}-04-row-arrow`, {arrow: out.arrow});
            if (ra.ctl) {
                await loc(page, 'Hosted Journals: a row\'s "Edit"', ra.ctl.getByRole('link', {name: 'Edit', exact: true}));
                await loc(page, 'Hosted Journals: a row\'s "Settings wizard"', ra.ctl.getByRole('link', {name: 'Settings wizard', exact: true}));
                const t4 = Date.now();
                await ra.ctl.getByRole('link', {name: 'Edit', exact: true}).click();
                await page.locator('[id^="context-name-control"]').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
                await idle(page); await sleep(800);
                const cf = formOf(page);
                out.editPK = {form: await readForm(cf), dialog: flat(await page.getByRole('dialog').last().innerText().catch(() => null), 300), ...(await ev.since(t4))};
                await snap(page, `${LP}-05-edit-publicknowledge-readonly`, {edit: out.editPK});
                const t5 = Date.now();
                await page.getByRole('dialog').last().getByRole('button', {name: 'Close', exact: true}).last().click().catch(() => {});
                await sleep(900);
                out.editClose = {dialogs: await page.getByRole('dialog').count(), ...(await ev.since(t5))};
                await snap(page, `${LP}-06-edit-closed`, {close: out.editClose});
            }
            out.errsAll = await ev.since(t0);
            fact(`list-${LP}`, out);
        });

        // ============================================================ form: Fields table, Rule 3 (the window as it opens)
        if (on('form')) await sect('form', async () => {
            const out = {};
            await as('admin');
            const t0 = Date.now();
            const {label, cf} = await openCreate(page, app);
            out.label = label;
            out.dialog = {name: await page.getByRole('dialog').last().getAttribute('aria-label').catch(() => null), heading: flat(await page.getByRole('dialog').last().locator('h1, h2').first().innerText().catch(() => null), 100)};
            out.form = await readForm(cf);
            out.country = await cf.locator('select[name="country"]').first().evaluate((s) => ({value: s.value, selectedIndex: s.selectedIndex, n: s.options.length, first: [s.options[0].value, s.options[0].text], blank: [...s.options].filter((o) => !o.value).length,
                sortedByName: [...s.options].map((o) => o.text).every((t, i, a) => i === 0 || a[i - 1].localeCompare(t) <= 0), last: s.options[s.options.length - 1].text})).catch((e) => String(e.message));
            out.buttons = await page.getByRole('dialog').last().locator('button').evaluateAll((bs) => bs.filter((b) => b.getClientRects().length).map((b) => b.innerText.trim() || b.getAttribute('aria-label')).filter(Boolean)).catch(() => []);
            out.errs = await ev.since(t0);
            await snap(page, 'f-01-create-form', {form: out});
            await loc(page, 'Create Journal: the window', page.getByRole('dialog', {name: /^Create (Journal|Press|Server)$/}));
            await loc(page, 'Create Journal: title (English)', cf.locator('#context-name-control-en'));
            await loc(page, 'Create Journal: "Path" prefix', cf.locator('.pkpFormField__inputPrefix'));
            await loc(page, 'Create Journal: "Country"', cf.locator('select[name="country"]'));
            await loc(page, 'Create Journal: "Enable…" box', cf.locator('input[name="enabled"]'));
            await loc(page, 'Create Journal: "Save"', cf.getByRole('button', {name: /^(Save|Enregistrer)$/}));
            // the French fields
            await showFrench(cf);
            out.french = await readForm(cf);
            await snap(page, 'f-02-create-form-french-shown', {french: out.french});
            // A3: the prefix and the seeded journal's home address
            await page.goto(cu(PK)); await idle(page);
            out.pkHome = page.url();
            out.pkHomeLink = await page.locator('a').evaluateAll((as) => as.map((a) => a.href).filter((h) => /publicknowledge\/?$|publicknowledge\/(en\/)?index$/.test(h)).slice(0, 3)).catch(() => []);
            fact('form', out);
        });

        // ============================================================ refuse: Rule 4, the refusals (td3), A1, OPS1
        if (on('refuse')) await sect('refuse', async () => {
            const out = {};
            await as('admin');
            let {cf} = await openCreate(page, app);
            // 1. "Save" on the empty form
            out.empty = await pressSave(page, cf, ev, 'r-01-empty');
            // "Go to" link: what it does
            out.goTo = {};
            for (const f of ['Path', 'Journal Initials|Press Initials|Server Initials', 'Languages']) {
                const go = cf.getByRole('button', {name: new RegExp(`^Go to (${f}):`)}).first();
                if (!(await go.count())) { out.goTo[f] = 'absent'; continue; }
                await go.click().catch(() => {}); await sleep(700);
                out.goTo[f] = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}#${a.id}[${a.name || ''}${a.value ? `=${a.value}` : ''}]` : null; });
            }
            out.jumpNext = {};
            const jump = cf.getByRole('button', {name: 'Jump to next error'}).first();
            for (let i = 0; i < 3 && await jump.count(); i++) { await jump.click().catch(() => {}); await sleep(500); out.jumpNext[i] = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}#${a.id}[${a.name || ''}]` : null; }); }
            // 2. French title alone (primary English): the title refusal per language
            await fillBasics(page, cf, {nameFr: 'Titre K1 seulement'});
            out.frOnly = await pressSave(page, cf, ev, 'r-02-french-title-only');
            // 3. every required field, no country
            const p = `${S.t}ra`;
            await fillBasics(page, cf, {name: `U59 K1 refused ${S.t}`, acronym: 'K1R', contactName: 'Rae Principal', contactEmail: `${S.t}rae@mail.test`, path: p, langs: ['en', 'fr_CA'], primary: 'en'});
            out.noCountry = await pressSave(page, cf, ev, 'r-03-no-country');
            // 4. initials emptied (email valid, country picked): refused before sending?
            await pickCountry(cf);
            await setText(cf, 'context-acronym-control-en', '');
            out.noInitials = await pressSave(page, cf, ev, 'r-04-no-initials');
            // 5. initials back, email "x"
            await setText(cf, 'context-acronym-control-en', 'K1R');
            await setText(cf, 'context-contactEmail-control', 'x');
            out.badEmail = await pressSave(page, cf, ev, 'r-05-email-x');
            await setText(cf, 'context-contactEmail-control', `${S.t}rae@mail.test`);
            // 6. the paths
            out.paths = {};
            for (const [k, v] of [['space', 'a b'], ['dash', '-ab'], ['end', 'ab-'], ['taken', PK], ['zero', '0'], ['dot', 'a.b'], ['slash', 'a/b']]) {
                await setText(cf, 'context-urlPath-control', v);
                out.paths[k] = await pressSave(page, cf, ev, `r-06-path-${k}`);
                if (out.paths[k].left) { note(`ccK1 [${app.name}]: path "${v}" was ACCEPTED on Create Journal — a journal exists with it`); S[`accepted_${k}`] = v; save(); break; }
            }
            // 7. primary locale not among the ticked languages
            if (!Object.values(out.paths).some((x) => x.left)) {
                await setText(cf, 'context-urlPath-control', p);
                await tick(cf, 'supportedLocales', 'fr_CA', false);
                await tick(cf, 'primaryLocale', 'fr_CA', true);
                out.primaryNotTicked = await pressSave(page, cf, ev, 'r-07-primary-not-ticked');
                // 8. no language ticked at all
                await tick(cf, 'supportedLocales', 'en', false);
                out.noLanguages = await pressSave(page, cf, ev, 'r-08-no-languages');
                // 9. two errors from the server at once: no country is not possible any more (picked); email + path
                await tick(cf, 'supportedLocales', 'en', true); await tick(cf, 'primaryLocale', 'en', true);
                await setText(cf, 'context-contactEmail-control', 'x');
                await setText(cf, 'context-urlPath-control', PK);
                out.twoServer = await pressSave(page, cf, ev, 'r-09-email-and-path');
            }
            out.dbAfter = ctxRows().filter((r) => r[1].startsWith(S.t) || ['a b', '-ab', '0', 'ab-', 'AB_c-1', 'a.b'].includes(r[1])).map((r) => r.join('|'));
            fact('refuse', out);
        });

        // ============================================================ goto: what "Go to {field}" and "Jump to next error" do
        if (on('goto')) await sect('goto', async () => {
            const out = {};
            await as('admin');
            const {cf} = await openCreate(page, app);
            await pressSave(page, cf, ev, 'g-01-empty');
            // the "Go to" buttons: where they sit
            out.goToButtons = await cf.evaluate((f) => [...f.querySelectorAll('button')].filter((b) => /^Go to/.test(b.innerText.trim())).map((b) => ({t: b.innerText.trim(), srOnly: !!b.closest('.-screenReader'), box: (() => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })()})));
            out.footer = await cf.locator('.pkpFormPage__footer').first().innerText().then((t) => t.replace(/\s+/g, ' ').trim()).catch(() => null);
            // "Jump to next error", five presses: which refused field is at the top of the window after each
            const topErr = () => page.evaluate(() => {
                const errs = [...document.querySelectorAll('.pkpFormField__error, .pkpFieldError')].filter((e) => e.getClientRects().length);
                const vis = errs.map((e) => { const g = e.closest('.pkpFormField'); const l = g && g.querySelector('.pkpFormFieldLabel, legend'); return {f: l ? l.innerText.replace(/\s+/g, ' ').replace(/ \* Required$/, '').trim() : '?', top: Math.round(e.getBoundingClientRect().top)}; });
                const a = document.activeElement;
                return {inView: vis.filter((v) => v.top > 60 && v.top < 900).map((v) => v.f), active: a ? `${a.tagName}#${a.id}` : null};
            });
            out.jump = [await topErr()];
            const j = cf.getByRole('button', {name: 'Jump to next error'}).first();
            for (let i = 0; i < 5; i++) { await j.click().catch(() => {}); await sleep(800); out.jump.push(await topErr()); }
            await snap(page, 'g-02-after-jumps', {goto: out});
            // the keyboard way: Tab from "Jump to next error" after a press
            fact('goto', out);
        });

        // ============================================================ leave: the window left with changes unsaved
        if (on('leave')) await sect('leave', async () => {
            const out = {};
            await as('admin');
            const {cf} = await openCreate(page, app);
            await fillBasics(page, cf, {name: 'Unsaved K1', path: `${S.t}zz`});
            const t0 = Date.now();
            await page.getByRole('dialog').last().getByRole('button', {name: 'Close', exact: true}).last().click().catch(() => {});
            await sleep(1200);
            out.close = {dialogOpen: await page.getByRole('dialog', {name: /^Create (Journal|Press|Server)$/}).count(), visibleDialogs: await page.locator('[role="dialog"]:visible').evaluateAll((ds) => ds.map((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 200))), ...(await ev.since(t0))};
            await snap(page, 'v-01-close-with-changes', {close: out.close});
            // reopen: does the form keep the typed values?
            await page.waitForTimeout(600);
            const create = page.locator('#contextGridContainer .header a[id*="createContext"]').first();
            if (await create.isVisible().catch(() => false)) {
                await create.click().catch(() => {});
                await page.locator('[id^="context-name-control"]').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
                await idle(page); await sleep(600);
                out.reopened = {name: await formOf(page).locator('#context-name-control-en').inputValue().catch(() => null), path: await formOf(page).locator('#context-urlPath-control').inputValue().catch(() => null)};
                await snap(page, 'v-02-reopened', {reopened: out.reopened});
                // leave the page by address with changes typed
                await fillBasics(page, formOf(page), {name: 'Unsaved K1 again'});
                const t1 = Date.now();
                await page.goto(app.url('/index.php/index/en/admin')).catch((e) => { out.gotoError = String(e.message).slice(0, 120); });
                await idle(page).catch(() => {});
                out.leaveByAddress = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), ...(await ev.since(t1))};
                await snap(page, 'v-03-left-by-address', {leave: out.leaveByAddress});
            }
            out.created = ctxRows().filter((r) => r[1] === `${S.t}zz`).length;
            fact('leave', out);
        });

        // ============================================================ createA: Rule 5, an accepted save (td4) — "Enable" unticked
        if (on('createA')) await sect('createA', async () => {
            if (S.JA) return;
            const out = {};
            await as('admin');
            const {cf} = await openCreate(page, app);
            const p = `${S.t}a`;
            await fillBasics(page, cf, {name: `U59 K1 A ${S.t}`, nameFr: `U59 K1 A français ${S.t}`, acronym: 'K1A', acronymFr: 'K1AF', contactName: 'Ada Principal', contactEmail: `${S.t}ada@mail.test`,
                country: 'Iceland', description: 'Journal A description typed on Create.', path: p, langs: ['en', 'fr_CA'], primary: 'en'});
            out.before = await readForm(cf);
            out.save = await pressSave(page, cf, ev, 'c-01-A-saved');
            await idle(page).catch(() => {});
            // the landing page, settled
            await page.locator('[id^="context-name-control"]').first().waitFor({timeout: T}).catch(() => {});
            out.landingTitle = await settled(page, page.locator('[id^="context-name-control-en"]').first()).catch(() => null);
            out.landing = await pageFacts(page);
            out.landingTabs = await page.locator('main [role="tab"]').evaluateAll((ts) => ts.map((t) => t.innerText.trim())).catch(() => []);
            out.landingForm = await readForm(formOf(page));
            await snap(page, 'c-02-A-landing', {landing: out});
            S.JA = {path: p, id: ctxId(p)}; save();
            out.db = ctxRows().slice(-4).map((r) => r.join('|'));
            fact('createA', out);
        });

        // ============================================================ afterA: Rules 5, 6 (td4); Cross-feature 360–365
        if (on('afterA')) await sect('afterA', async () => {
            if (!S.JA) return;
            const out = {};
            const J = S.JA;
            await as('admin');
            // the list: where the new row stands, what it shows
            await landList(page, app);
            const L = await readList(page);
            out.rows = L.rows.map((r) => `${r.id}:${r.cells.join(' | ')}`);
            out.rowIndex = L.rows.findIndex((r) => r.id === String(J.id));
            out.rowsTotal = L.rows.length;
            out.rowHtmlA = (L.rows.find((r) => r.id === String(J.id)) || {}).html;
            out.rowHtmlPK = (L.rows.find((r) => r.id === String(pkId)) || {}).html;
            out.db = ctxRows().map((r) => r.join('|'));
            await snap(page, 'd-01-list-after-A', {list: L});
            // the switcher (Cross-feature 360–362)
            const sw = page.locator('header .app__contexts').first();
            if (await sw.count()) {
                await sw.locator('button').first().click().catch(() => {}); await sleep(600);
                out.switcher = await sw.locator('a').evaluateAll((as) => as.map((a) => a.textContent.replace(/\s+/g, ' ').trim())).catch(() => []);
                await snap(page, 'd-02-switcher', {switcher: out.switcher});
                await sw.locator('button').first().click().catch(() => {});
            } else out.switcher = 'no switcher';
            // the site's home page, signed out (A not enabled)
            const V = await launch(app);
            try {
                await V.page.goto(app.url('/index.php/index/en')); await idle(V.page);
                out.home = {url: V.page.url().replace(/^https?:\/\/[^/]+/, ''), entries: await V.page.locator('main li, .page_index_site li').evaluateAll((ls) => ls.map((l) => l.innerText.replace(/\s+/g, ' ').trim().slice(0, 120)).filter(Boolean)).catch(() => [])};
                out.homeHasA = out.home.entries.some((e) => e.includes(`U59 K1 A ${S.t}`));
                await snap(V.page, 'd-03-site-home-visitor', {home: out.home});
                await V.page.goto(cu(J.path)); await idle(V.page);
                out.visitorAHome = V.page.url().replace(/^https?:\/\/[^/]+/, '');
                await snap(V.page, 'd-04-A-home-visitor');
            } finally { await V.close(); }
            // Users & Roles: the Site Administrator's row
            await page.goto(cu(J.path, '/en/management/settings/access')); await idle(page);
            const ut = page.getByRole('table', {name: /Current Users \(/});
            await ut.locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(500);
            out.users = await ut.evaluate((tb) => ({
                heads: [...tb.querySelectorAll('thead th')].map((th) => th.innerText.replace(/\s+/g, ' ').trim()),
                rows: [...tb.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim())),
            })).catch((e) => String(e.message));
            await snap(page, 'd-05-A-users', {users: out.users});
            // the Site Administrator's role row on its "Edit" page is U53's; the list is enough here
            // Sections (Series on a press)
            await page.goto(cu(J.path, '/en/management/settings/context')); await idle(page);
            await page.getByRole('tab', {name: isOMP ? 'Series' : 'Sections', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(1200);
            out.sections = await page.locator('main [role="tabpanel"]:visible table tbody tr, main [role="tabpanel"]:visible tr.gridRow').evaluateAll((rs) => rs.filter((r) => r.getClientRects().length).map((r) => r.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
            out.sectionsPanel = flat(await page.locator('main [role="tabpanel"]:visible').first().innerText().catch(() => null), 500);
            await snap(page, 'd-06-A-sections', {sections: out.sections});
            // Contact: principal contact typed, no technical support contact
            await page.locator('#contact-button').first().click().catch(() => {}); await idle(page); await sleep(800);
            out.contact = await page.locator('main [role="tabpanel"]:visible input[type=text], main [role="tabpanel"]:visible input[type=email]').evaluateAll((is) => is.filter((i) => i.getClientRects().length).map((i) => `${i.name}=${i.value}`)).catch(() => []);
            await snap(page, 'd-07-A-contact', {contact: out.contact});
            // Masthead: the description is the "Journal Summary"; the country
            await page.locator('#masthead-button').first().click().catch(() => {}); await idle(page); await sleep(900);
            out.masthead = await page.evaluate(() => ({
                summary: window.tinymce ? (window.tinymce.get() || []).filter((e) => /description/i.test(e.id)).map((e) => `${e.id}=${e.getContent()}`) : null,
                summaryLabel: [...document.querySelectorAll('main .pkpFormFieldLabel')].map((l) => l.innerText.replace(/\s+/g, ' ').trim()).filter((t) => /Summary/.test(t)),
                country: (document.querySelector('main select[name="country"]') || {}).value || null,
                name: [...document.querySelectorAll('main input[name^="name"]')].map((i) => `${i.name}=${i.value}`),
                acronym: [...document.querySelectorAll('main input[name^="acronym"]')].map((i) => `${i.name}=${i.value}`),
            })).catch((e) => String(e.message));
            await snap(page, 'd-08-A-masthead', {masthead: out.masthead});
            // Languages (Settings › Website › Setup › Languages)
            await page.goto(cu(J.path, '/en/management/settings/website')); await idle(page);
            await page.locator('#setup-button').first().click().catch(() => {});
            await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
            await page.locator('#languageGridContainer tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
            await idle(page); await sleep(500);
            out.languages = await page.locator('#languageGridContainer tr.gridRow').evaluateAll((rs) => rs.map((r) => `${r.id.replace(/^.*-row-/, '')}:` + [...r.querySelectorAll('input')].map((b) => `${(b.id.match(/-(contextPrimary|uiLocale|formLocale)/) || [])[1]}${b.checked ? 'X' : '-'}`).join(','))).catch(() => []);
            await snap(page, 'd-09-A-languages', {languages: out.languages});
            // For Readers / For Authors as a signed-in admin reads them (the journal is not enabled)
            out.texts = {};
            for (const k of ['readers', 'authors']) {
                await page.goto(cu(J.path, `/en/information/${k}`)); await idle(page);
                out.texts[k] = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), links: await page.locator('.page_information a, main a, .pkp_structure_main a').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))].filter((h) => h && /index\.php/.test(h))).catch(() => []), text: flat(await page.locator('.page_information, .pkp_structure_main').first().innerText().catch(() => null), 400)};
                await snap(page, `d-10-A-for-${k}`, {text: out.texts[k]});
            }
            // About › Submissions: the checklist's link (the texts a preprint server shows; OJS/OMP too)
            await page.goto(cu(J.path, '/en/about/submissions')); await idle(page);
            out.aboutSubmissions = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), links: await page.locator('.pkp_structure_main a, main a').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))].filter((h) => h && /index\.php/.test(h))).catch(() => [])};
            await snap(page, 'd-11-A-about-submissions', {about: out.aboutSubmissions});
            // the enrolment row in the database (ground truth for the start date)
            out.dbEnrol = sql(db, `select u.username, ug.role_id, uug.date_start, uug.date_end from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id join users u on u.user_id = uug.user_id where ug.context_id = ${J.id}`);
            out.dbSections = isOMP ? sql(db, `select count(*) from series where press_id = ${J.id}`) : sql(db, `select section_id from sections where ${IDCOL[app.name]} = ${J.id}`);
            fact('afterA', out);
        });

        // ============================================================ createB: "Enable" ticked, English alone, a description
        if (on('createB')) await sect('createB', async () => {
            const out = {};
            await as('admin');
            if (!S.JB) {
                const {cf} = await openCreate(page, app);
                const p = `${S.t}b`;
                await fillBasics(page, cf, {name: `U59 K1 B ${S.t}`, acronym: 'K1B', contactName: 'Bo Principal', contactEmail: `${S.t}bo@mail.test`,
                    country: 'Canada', description: 'Journal B description typed on Create.', path: p, langs: ['en'], primary: 'en', enabled: true});
                out.save = await pressSave(page, cf, ev, 'b-01-B-saved');
                S.JB = {path: p, id: ctxId(p)}; save();
            }
            // the site's home page at once, signed out
            const V = await launch(app);
            try {
                await V.page.goto(app.url('/index.php/index/en')); await idle(V.page);
                out.home = {url: V.page.url().replace(/^https?:\/\/[^/]+/, ''),
                    entries: await V.page.locator('main li, .page_index_site li').evaluateAll((ls) => ls.map((l) => l.innerText.replace(/\s+/g, ' ').trim().slice(0, 200)).filter(Boolean)).catch(() => []),
                    bEntryHtml: await V.page.locator('li').filter({hasText: `U59 K1 B ${S.t}`}).first().innerHTML().then((h) => h.replace(/\s+/g, ' ').slice(0, 800)).catch(() => null),
                    sEntryHtml: S.S ? await V.page.locator('li').filter({hasText: `U59 K1 S ${S.t}`}).first().innerHTML().then((h) => h.replace(/\s+/g, ' ').slice(0, 800)).catch(() => null) : null};
                out.homeHasB = out.home.entries.some((e) => e.includes(`U59 K1 B ${S.t}`));
                out.homeHasA = out.home.entries.some((e) => e.includes(`U59 K1 A ${S.t}`));
                await snap(V.page, 'b-02-site-home-visitor', {home: out.home});
            } finally { await V.close(); }
            // B's languages: what English alone gives
            await page.goto(cu(S.JB.path, '/en/management/settings/website')); await idle(page);
            await page.locator('#setup-button').first().click().catch(() => {});
            await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
            await page.locator('#languageGridContainer tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
            await idle(page); await sleep(500);
            out.languages = await page.locator('#languageGridContainer tr.gridRow').evaluateAll((rs) => rs.map((r) => `${r.id.replace(/^.*-row-/, '')}:` + [...r.querySelectorAll('input')].map((b) => `${(b.id.match(/-(contextPrimary|uiLocale|formLocale)/) || [])[1]}${b.checked ? 'X' : '-'}`).join(','))).catch(() => []);
            await snap(page, 'b-03-B-languages', {languages: out.languages});
            out.db = ctxRows().slice(-5).map((r) => r.join('|'));
            fact('createB', out);
        });

        // ============================================================ createC: primary French, French title alone
        if (on('createC')) await sect('createC', async () => {
            const out = {};
            await as('admin');
            if (!S.JC) {
                const {cf} = await openCreate(page, app);
                const p = `${S.t}c`;
                await fillBasics(page, cf, {nameFr: `U59 K1 C seulement ${S.t}`, acronymFr: 'K1C', contactName: 'Cy Principal', contactEmail: `${S.t}cy@mail.test`,
                    country: 'France', path: p, langs: ['en', 'fr_CA'], primary: 'fr_CA'});
                out.save = await pressSave(page, cf, ev, 'k-01-C-saved');
                if (!out.save.left) {
                    // the English title may be required too: record and fill it as a fallback
                    out.saveErrors = out.save.errors;
                    await fillBasics(page, cf, {name: `U59 K1 C english ${S.t}`, acronym: 'K1CE'});
                    out.save2 = await pressSave(page, cf, ev, 'k-01b-C-saved-with-english');
                }
                S.JC = {path: p, id: ctxId(p), englishTitle: !out.save.left}; save();
            }
            fact('createC', out);
        });

        // ============================================================ names: Rule 2, the row's name by reading language
        if (on('names')) await sect('names', async () => {
            const out = {};
            await as('admin');
            for (const loc_ of ['en', 'fr_CA']) {
                await landList(page, app, loc_);
                const L = await readList(page);
                out[loc_] = L.rows.filter((r) => [S.JA, S.JB, S.JC, S.S].filter(Boolean).map((j) => String(j.id)).includes(r.id) || r.id === String(pkId)).map((r) => `${r.id}:${r.cells.join(' | ')}`);
                out[`${loc_}-head`] = {crumbs: L.crumbs, gridTitle: L.gridTitle, columns: L.columns, actions: L.actions};
                await snap(page, `n-01-list-${loc_}`, {list: L});
            }
            out.dbNames = sql(db, `select c.path, s.locale, s.setting_value from ${TABLE[app.name]} c join ${TABLE[app.name].replace(/s$/, '').replace(/presse$/, 'press')}_settings s on s.${IDCOL[app.name]} = c.${IDCOL[app.name]} where s.setting_name = 'name' and c.path like '${S.t}%' order by c.path, s.locale`);
            out.dbPrimary = sql(db, `select path, primary_locale from ${TABLE[app.name]} where path like '${S.t}%' order by path`);
            fact('names', out);
        });

        // ============================================================ a1: "Country" on Edit and on the Settings wizard's "Journal" tab
        if (on('a1')) await sect('a1', async () => {
            const out = {};
            await as('admin');
            // Edit on S (tooling, no country): Save untouched, then "Enable" unticked, then a country
            if (S.S) {
                await landList(page, app);
                const ra = await rowArrow(page, S.S.id);
                await ra.ctl.getByRole('link', {name: 'Edit', exact: true}).click();
                await page.locator('[id^="context-name-control"]').first().waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(800);
                const cf = formOf(page);
                out.editForm = await readForm(cf);
                await snap(page, 'e-01-S-edit-open', {form: out.editForm});
                out.editUntouched = await pressSave(page, cf, ev, 'e-02-S-edit-save-untouched');
                await tick(cf, 'enabled', 'true', false);
                out.editUnEnable = await pressSave(page, cf, ev, 'e-03-S-edit-untick-enable');
                // put "Enable" back, pick a country and save (S is ours)
                await tick(cf, 'enabled', 'true', true);
                await pickCountry(cf, 'Norway');
                out.editWithCountry = await pressSave(page, cf, ev, 'e-04-S-edit-with-country');
                out.dbS = sql(db, `select enabled from ${TABLE[app.name]} where path = '${S.S.path}'`);
            }
            // the wizard's "Journal" tab on S2 (no country)
            if (S.S2) {
                await page.goto(app.url(`/index.php/index/en/admin/wizard/${S.S2.id}`)); await idle(page);
                await page.locator('[id^="context-name-control"]').first().waitFor({timeout: T}).catch(() => {});
                await settled(page, page.locator('[id^="context-name-control-en"]').first()).catch(() => {});
                const cf = formOf(page);
                out.wizardForm = await readForm(cf);
                await snap(page, 'e-05-S2-wizard-journal-tab', {form: out.wizardForm});
                const t0 = Date.now();
                const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
                await cf.getByRole('button', {name: /^(Save|Enregistrer)$/}).click();
                const r = await w; await idle(page).catch(() => {}); await sleep(900);
                const f = await readForm(cf);
                out.wizardSave = {status: r && r.status(), body: r ? await r.text().then((b) => b.slice(0, 400)).catch(() => null) : null, errors: f.fields ? f.fields.filter((x) => x.errors.length).map((x) => `${x.label}: ${x.errors.join(' / ')}`) : f, errorsLine: f.errorsLine, status2: f.status, ...(await ev.since(t0))};
                await snap(page, 'e-06-S2-wizard-save-no-country', {save: out.wizardSave});
            }
            // the seeded journal's "Edit": the Country as it opens (read only, never saved)
            await landList(page, app);
            const ra = await rowArrow(page, pkId);
            await ra.ctl.getByRole('link', {name: 'Edit', exact: true}).click();
            await page.locator('[id^="context-name-control"]').first().waitFor({state: 'visible', timeout: T});
            await idle(page); await sleep(800);
            out.pkCountry = await formOf(page).locator('select[name="country"]').first().evaluate((s) => ({value: s.value, idx: s.selectedIndex})).catch(() => null);
            await snap(page, 'e-07-publicknowledge-edit-country-readonly', {country: out.pkCountry});
            await page.getByRole('dialog').last().getByRole('button', {name: 'Close', exact: true}).last().click().catch(() => {});
            await sleep(900);
            fact('a1', out);
        });

        // ============================================================ reqlang: which language's title the form requires (page read in French; primary French)
        if (on('reqlang')) await sect('reqlang', async () => {
            const out = {};
            await as('admin');
            // the window opened from the French reading of the list, English title empty, French typed
            const {cf} = await openCreate(page, app, 'fr_CA');
            out.frForm = (await readForm(cf)).fields.slice(0, 4).map((f) => `${f.label} ${f.inputs.join(',')}`);
            await snap(page, 'q-01-create-in-french', {form: out.frForm});
            await fillBasics(page, cf, {nameFr: 'Titre seulement', acronymFr: 'TS', contactName: 'Q', contactEmail: `${S.t}q@mail.test`, path: `${S.t}q`, langs: ['fr_CA'], primary: 'fr_CA', country: 'France'});
            out.frenchOnly = await pressSave(page, cf, ev, 'q-02-french-reading-french-title-only');
            fact('reqlang', out);
            if (out.frenchOnly.left) { S.JQ = {path: `${S.t}q`, id: ctxId(`${S.t}q`)}; save(); note(`Create Journal read in French accepted a French-only title (journal ${S.t}q)`); }
        });

        // ============================================================ cleanup: the one journal created without the tag in its path (OJS, AB_c-1), removed on screen
        if (on('cleanup')) await sect('cleanup', async () => {
            const out = {};
            const bad = ctxRows().filter((r) => r[1] === 'AB_c-1');
            if (!bad.length) { fact('cleanup', 'none'); return; }
            const name = sql(db, `select setting_value from ${TABLE[app.name].replace(/s$/, '').replace(/presse$/, 'press')}_settings where ${IDCOL[app.name]} = ${bad[0][0]} and setting_name = 'name' and locale = 'en'`);
            if (!name.startsWith('U59 K1 ')) { fact('cleanup', `not ours: ${name}`); return; }
            await as('admin');
            await landList(page, app);
            const ra = await rowArrow(page, bad[0][0]);
            await ra.ctl.getByRole('link', {name: 'Remove', exact: true}).click();
            const d = page.locator('[role=dialog]:visible, [data-cy="dialog"]:visible').last();
            await d.waitFor({timeout: 8000}).catch(() => {});
            out.question = flat(await d.innerText().catch(() => null), 300);
            const w = page.waitForResponse((r) => r.request().method() !== 'GET' && /contexts|delete/.test(r.url()), {timeout: 60000}).catch(() => null);
            await d.getByRole('button', {name: /^(OK|Yes|Remove|Delete)$/}).first().click().catch(() => {});
            const r = await w; out.status = r && r.status();
            await idle(page); await sleep(1500);
            out.gone = !ctxRows().some((x) => x[1] === 'AB_c-1');
            fact('cleanup', out);
        });

        // ============================================================ many: the list's length axis (52 disabled scratch journals)
        if (on('many')) await sect('many', async () => {
            const out = {};
            S.M = S.M || [];
            for (let i = S.M.length; i < 52; i++) {
                const p = `${S.t}m${i}`;
                await app.api.createContext({tag: p, context: {name: `U59 K1 M${i} ${S.t}`, enabled: false}});
                S.M.push(p); save();
            }
            await as('admin');
            const t0 = Date.now();
            await landList(page, app);
            const L = await readList(page);
            out.ms = Date.now() - t0;
            out.rowsShown = L.rows.length;
            out.dbCount = ctxRows().length;
            out.paging = L.paging; out.under = L.under; out.actions = L.actions;
            out.orderMatchesDb = JSON.stringify(L.rows.map((r) => r.id)) === JSON.stringify(ctxRows().map((r) => r[0]));
            out.firstLast = [L.rows[0] && L.rows[0].cells.join('|'), L.rows[L.rows.length - 1] && L.rows[L.rows.length - 1].cells.join('|')];
            out.tail = await page.locator('#contextGridContainer').evaluate((c) => c.innerText.split('\n').slice(-6).join(' / ')).catch(() => null);
            await snap(page, 'm-01-list-many', {list: {...L, rows: L.rows.length}});
            fact('many', out);
        });

        // ============================================================ onelang: Rule 7, Settings 3 (the site with English alone)
        if (on('onelang')) await sect('onelang', async () => {
            const out = {};
            await as('admin');
            const landSite = async () => {
                await page.goto(app.url('/index.php/index/en/admin/settings')); await idle(page);
                await page.locator('#setup-button').first().click().catch(() => {}); await idle(page).catch(() => {});
                await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
                await page.locator('#languageGridContainer tr.gridRow').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(page).catch(() => {}); await sleep(500);
            };
            const siteRows = () => page.locator('#languageGridContainer tr.gridRow').evaluateAll((rs) => rs.map((r) => `${r.id.replace(/^.*-row-/, '')}:` + [...r.querySelectorAll('input')].map((b) => `${(b.id.match(/-(enable|sitePrimary)/) || [])[1]}${b.checked ? 'X' : '-'}`).join(','))).catch(() => []);
            const pressFr = async (name) => {
                const t0 = Date.now();
                const w = page.waitForResponse((r) => r.request().method() === 'POST' && /admin-language-grid|language/.test(r.url()), {timeout: 240000}).catch(() => null);
                await page.locator('#languageGridContainer input[id^="select-cell-fr_CA-enable"]').first().click();
                // a confirmation may ask
                const d = page.locator('[role=dialog]:visible, [data-cy="dialog"]:visible').last();
                if (await d.waitFor({timeout: 6000}).then(() => true).catch(() => false)) {
                    out[`${name}Question`] = flat(await d.innerText().catch(() => null), 300);
                    const btns = d.getByRole('button'); const n = await btns.count();
                    for (let i = 0; i < n; i++) { const b = btns.nth(i); const t = ((await b.innerText().catch(() => '')) || '').trim(); if (t && !/^(Cancel|Close|No|×)$/i.test(t) && await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; } }
                }
                const r = await w; await idle(page).catch(() => {}); await sleep(1500);
                const e = await ev.since(t0);
                await landSite();
                const rows = await siteRows();
                await snap(page, `o-${name}`, {rows, status: r && r.status(), ...e});
                return {status: r && r.status(), rows, ...e, ms: Date.now() - t0};
            };
            await landSite();
            out.before = await siteRows();
            out.disable = await pressFr('01-fr-disable');
            try {
                const t0 = Date.now();
                const {cf} = await openCreate(page, app);
                out.form = await readForm(cf);
                out.formErrs = await ev.since(t0);
                await snap(page, 'o-02-create-form-one-language', {form: out.form});
                if (!S.JD) {
                    const p = `${S.t}d`;
                    const t1 = Date.now();
                    await fillBasics(page, cf, {name: `U59 K1 D ${S.t}`, acronym: 'K1D', contactName: 'Di Principal', contactEmail: `${S.t}di@mail.test`, country: 'Chile', path: p});
                    out.fillErrs = await ev.since(t1);
                    out.save = await pressSave(page, cf, ev, 'o-03-D-saved');
                    S.JD = {path: p, id: ctxId(p)}; save();
                }
                out.dbD = sql(db, `select path, primary_locale from ${TABLE[app.name]} where path = '${S.JD.path}'`);
                out.dbDlocales = sql(db, `select s.setting_name, s.setting_value from ${TABLE[app.name].replace(/s$/, '').replace(/presse$/, 'press')}_settings s where s.${IDCOL[app.name]} = ${S.JD.id} and s.setting_name in ('supportedLocales','supportedFormLocales','supportedSubmissionLocales')`);
                await page.goto(cu(S.JD.path, '/management/settings/website')); await idle(page);
                await page.locator('#setup-button').first().click().catch(() => {});
                await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
                await page.locator('#languageGridContainer tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
                await idle(page); await sleep(500);
                out.Dlanguages = await page.locator('#languageGridContainer tr.gridRow').evaluateAll((rs) => rs.map((r) => `${r.id.replace(/^.*-row-/, '')}:` + [...r.querySelectorAll('input')].map((b) => `${(b.id.match(/-(contextPrimary|uiLocale|formLocale)/) || [])[1]}${b.checked ? 'X' : '-'}`).join(','))).catch(() => []);
                await snap(page, 'o-04-D-languages', {languages: out.Dlanguages});
            } finally {
                // French back on the site, then on publicknowledge's "UI" (the seed state) as its manager
                await landSite();
                out.enable = await pressFr('05-fr-enable');
                out.pkBefore = sql(db, `select setting_value from ${TABLE[app.name].replace(/s$/, '').replace(/presse$/, 'press')}_settings where ${IDCOL[app.name]} = ${pkId} and setting_name = 'supportedLocales'`);
                if (!/fr_CA/.test(out.pkBefore)) {
                    await as('manager.maya', PK);
                    await page.goto(cu(PK, '/management/settings/website')); await idle(page);
                    await page.locator('#setup-button').first().click().catch(() => {});
                    await page.locator('#languages-button').filter({visible: true}).first().click().catch(() => {});
                    await page.locator('#languageGridContainer tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
                    await idle(page); await sleep(500);
                    const box = page.locator('#languageGridContainer input[id^="select-cell-fr_CA-uiLocale"]').first();
                    if (await box.count() && !(await box.isChecked())) {
                        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /languages/.test(r.url()), {timeout: 60000}).catch(() => null);
                        await box.click(); await w; await idle(page); await sleep(1200);
                    }
                    out.pkAfter = sql(db, `select setting_value from ${TABLE[app.name].replace(/s$/, '').replace(/presse$/, 'press')}_settings where ${IDCOL[app.name]} = ${pkId} and setting_name in ('supportedLocales','supportedFormLocales','supportedSubmissionLocales')`);
                    await snap(page, 'o-06-publicknowledge-fr-ui-restored');
                }
            }
            fact('onelang', out);
        });

        if (on('final')) fact('final', {db: ctxRows().map((r) => r.join('|'))});
    } finally {
        await close();
    }
});
