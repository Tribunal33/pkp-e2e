// U66 claim check K1: reaching the Institutions page, the settings around it
// and where the list is used (spec body 10–48, 78–90, 136–181, 190–265;
// register A1, A4, A6; footnotes a, b, c, e, h, i, s, q1, q7, q10, q11).
//
// Seeds its own scratch contexts per app and per run, signs in from the
// roster and scratch users, and records every screen with screen().
// Phases (PHASES=seed,menu,... picks; seed first, once per RUN):
//   seed     A (every permission level, both statistics boxes' journal side
//            ticked, two institutions), B (OJS/OMP: Editor and Production
//            Editor without "Permit changes to Settings"; no institution),
//            P (OJS/OMP: payments enabled, statistics untouched), E (admin
//            with Reader beside the manager role, one institution), C (the
//            list's consumers: OJS subscriptions, a published work for
//            COUNTER), D (another context with its own institution), H1/H0
//            (Hosted deletion with and without an institution)
//   menu     the side menu and the page address per level, site box off,
//            on (POST site, put back as found), and off again; q1 toggling
//            the journal's box on screen
//   roles    Settings › Users & Roles › Roles: level column, "Edit",
//            "Permit changes to Settings"; admin's roles in a journal
//   admin    A6/q7: admin with the manager role ended on screen
//   sidefx   Side effects 1–3, Rule 2, cross-feature purchase (OJS)
//   counter  q10: "Institution_ID" of a PR report (counterR5StartDate set
//            through POST site for the phase, put back as found)
//   hosted   q11: Administration › Hosted Journals/Presses/Servers delete
//   left     what a press/server whose deletion failed shows afterwards
//   pay      Payments "Enable" saved unticked, then ticked (P; U52 A12)
//   padmin   the Site Administrator's side menu on P
//   a4       {OJS} deleting an institution a subscription names (C)
// Run: RUN=1 PHASES=seed,menu PROBE_FEATURE=U66 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U66/K1/k1.js
// Facts: .reports/U66/ccK1/facts-r<RUN>-<app>.json (merged per phase).
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');
const {dbName} = require('../../../../../bin/apps.js');

const RUN = process.env.RUN || '1';
const PHASES = (process.env.PHASES || 'seed,menu,roles,admin,sidefx,counter,hosted').split(',');
const on = (p) => PHASES.includes(p);
const T = 20_000;
const DENIED = /does not have access to this operation/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sql = (app, q) => execFileSync('psql', ['-X', '-d', dbName(app.name), '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const CTX_TABLE = {ojs: ['journals', 'journal_id'], omp: ['presses', 'press_id'], ops: ['servers', 'server_id']};

let facts = {};
let phaseName = '';
// A server error's own text (a raw database or PHP message in an "Error"
// window or an answer) is not kept in any file here: it is routed to the
// private security repo (../pkp-e2e-sec, its security_policy.md).
const INTERNALS = /SQLSTATE|Stack trace|\.php(:| on line )\d+/;
function scrub(v) {
    if (Array.isArray(v)) return v.map(scrub);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)]));
    if (typeof v === 'string' && INTERNALS.test(v)) return '(server error text; not kept)';
    return v;
}
function fact(key, value) {
    value = scrub(value);
    facts[`${phaseName}.${key}`] = value;
    console.log(`[fact] ${phaseName}.${key}: ${flat(JSON.stringify(value), 900)}`);
}
async function step(name, fn) {
    try {
        return await fn();
    } catch (e) {
        fact(`ERR ${name}`, String((e && e.message) || e).split('\n').slice(0, 4).join(' | '));
        return null;
    }
}
async function snap(page, name) {
    const s = await screen(page);
    const n = `r${RUN}-${name}`;
    if (INTERNALS.test(JSON.stringify(s))) {
        record(n, {url: s.url, title: s.title, withheld: 'the screen showed a server error text; not kept'});
        return {...scrub(s), name: n};
    }
    record(n, s);
    await shot(page, n).catch(() => {});
    return {...s, name: n};
}
const seedFile = (app) => path.join(outDir(), `seed-r${RUN}-${app.name}.json`);
const loadSeed = (app) => JSON.parse(fs.readFileSync(seedFile(app), 'utf8'));
const cu = (app, ctx, p = '') => app.url(`/index.php/${ctx}/en${p}`);
const instUrl = (app, ctx) => cu(app, ctx, '/management/settings/institutions');
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
function siteRows(app) {
    return sql(app, "select setting_name, setting_value from site_settings where setting_name in ('enableInstitutionUsageStats','counterR5StartDate') order by 1");
}

// ---------------------------------------------------------------- seed
const LEVELS = {
    ojs: [['mgr', 'manager'], ['ed', 'editor'], ['pe', 'productionEditor'], ['se', 'sectionEditor'], ['ce', 'copyeditor'], ['au', 'author'], ['rv', 'externalReviewer'], ['rd', 'reader'], ['sm', 'subscriptionManager']],
    omp: [['mgr', 'manager'], ['ed', 'editor'], ['pe', 'productionEditor'], ['se', 'sectionEditor'], ['ce', 'copyeditor'], ['au', 'author'], ['rv', 'externalReviewer'], ['rd', 'reader']],
    ops: [['mgr', 'manager'], ['se', 'sectionEditor'], ['eb', 'editorialBoardMember'], ['au', 'author'], ['rd', 'reader']],
};
const INST = [
    {name: 'Campus Library', ipRanges: ['10.0.0.0/8'], ror: 'https://ror.org/0213rcc28'},
    {name: 'Local Library', ipRanges: ['192.168.5.0/24']},
];
const FILE = {
    ojs: {galleys: [{label: 'PDF', file: 'article.pdf'}]},
    omp: {publicationFormats: [{name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'}]},
    ops: {galleys: [{label: 'PDF', file: 'preprint.pdf'}]},
};
const U = (p, k, role) => ({username: `${p}${k}`, roles: [role], givenName: k.toUpperCase(), familyName: 'Kayone'});

async function seed(app) {
    const ojs = app.name === 'ojs';
    const ops = app.name === 'ops';
    const t = tag('u66k1');
    const S = {t, A: `${t}a`, B: `${t}b`, P: ops ? null : `${t}p`, E: `${t}e`, C: `${t}c`, D: `${t}d`, H1: `${t}h`, H0: `${t}z`};
    const nm = (k) => ({name: `U66 K1 ${k} ${t}`});
    const out = {...S, ids: {}};
    const mk = async (k, spec) => {
        const r = await app.api.createContext({tag: S[k], context: nm(k), ...spec});
        out.ids[k] = {contextId: r.contextId, institutions: r.institutions || null, subscriptions: r.subscriptions || null, issues: r.issues || null};
        return r;
    };
    await mk('A', {enableInstitutionUsageStats: true, users: LEVELS[app.name].map(([k, r]) => U(S.A, k, r)), institutions: INST});
    if (ops) await mk('B', {enableInstitutionUsageStats: true, users: [U(S.B, 'mgr', 'manager')]});
    else await mk('B', {enableInstitutionUsageStats: true, roles: {editor: {permitSettings: false}, productionEditor: {permitSettings: false}}, users: [U(S.B, 'mgr', 'manager'), U(S.B, 'ed', 'editor'), U(S.B, 'pe', 'productionEditor')]});
    if (S.P) {
        await mk('P', {payments: {enabled: true, currency: 'USD'}, roles: {editor: {permitSettings: false}},
            users: [U(S.P, 'mgr', 'manager'), U(S.P, 'ed', 'editor'), U(S.P, 'pe', 'productionEditor'), ...(ojs ? [U(S.P, 'sm', 'subscriptionManager')] : [])]});
    }
    await mk('E', {users: [{username: 'admin', roles: ['reader']}, U(S.E, 'mgr', 'manager')], institutions: [INST[0]]});
    if (ojs) {
        await mk('C', {payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by cheque to K1.'}, publishingMode: 'subscription',
            users: [U(S.C, 'mgr', 'manager'), U(S.C, 'au', 'author'), U(S.C, 'rd', 'reader'), U(S.C, 'r2', 'reader'), U(S.C, 'r3', 'reader')],
            institutions: INST,
            subscriptionTypes: [{name: 'K1 Campus', cost: 500, currency: 'USD', duration: 12, institutional: true}],
            subscriptions: [{user: `${S.C}rd`, type: 'K1 Campus', institution: 'Campus Library'}, {user: `${S.C}r2`, type: 'K1 Campus', institution: 'Local Library'}],
            issues: [{volume: 1, number: 1, year: 2026, published: true, datePublished: '2026-05-10'}]});
    } else {
        await mk('C', {users: [U(S.C, 'mgr', 'manager'), U(S.C, 'au', 'author'), U(S.C, 'rd', 'reader')], institutions: INST});
    }
    const sub = await app.api.createSubmission({tag: `${S.C}s`, context: S.C, submitter: `${S.C}au`, title: `K1 Counted Work ${t}`, published: true, datePublished: '2026-05-10',
        ...FILE[app.name], ...(ojs ? {issue: {volume: 1, number: 1, year: 2026}} : {})});
    out.sub = {id: sub.submissionId, pub: sub.publicationId, galleys: sub.galleys || null};
    await mk('D', {users: [U(S.D, 'mgr', 'manager')], institutions: [{name: 'Zebra Other Institute', ipRanges: ['172.16.9.0/24']}]});
    await mk('H1', {});
    await mk('H0', {});
    out.users = Object.fromEntries(LEVELS[app.name].map(([k]) => [k, `${S.A}${k}`]));
    fs.writeFileSync(seedFile(app), JSON.stringify(out, null, 2));
    fact('seed', out);
    return out;
}

// ---------------------------------------------------------------- screen helpers
async function readNav(page) {
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    if (!(await nav.count().catch(() => 0))) return {present: false, groups: [], links: []};
    return nav.first().evaluate((n) => {
        const t = (e) => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim();
        const groups = [...n.querySelectorAll('[role="button"][aria-controls]')].map((e) => {
            const r = document.getElementById(e.getAttribute('aria-controls') || '');
            return {label: t(e), items: r ? [...r.querySelectorAll('[role="treeitem"]')].map(t) : []};
        });
        const links = [...n.querySelectorAll('a')].map((a) => ({text: t(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}));
        return {present: true, groups, links};
    }).catch((e) => ({present: 'err', err: String(e.message).slice(0, 200), groups: [], links: []}));
}
function navSum(nav) {
    const inst = nav.links.find((l) => /management\/settings\/institutions/.test(l.href));
    const parent = inst ? (nav.groups.find((g) => g.items.includes(inst.text)) || {}).label || '(top level)' : null;
    return {
        institutions: !!inst,
        instText: inst ? inst.text : null,
        instParent: parent,
        settings: nav.groups.some((g) => /^Settings$/.test(g.label)) || nav.links.some((l) => /management\/settings\/(context|website|workflow|distribution)/.test(l.href)),
        groups: nav.groups.map((g) => `${g.label}${g.items.length ? ' › ' + g.items.join(', ') : ''}`),
        tops: nav.links.filter((l) => !nav.groups.some((g) => g.items.includes(l.text))).map((l) => l.text).slice(0, 30),
    };
}
async function menuAt(page, app, ctx, name, where = '/submissions') {
    const resp = await page.goto(cu(app, ctx, where)).catch((e) => ({err: e.message}));
    await idle(page);
    await sleep(400);
    const nav = await readNav(page);
    const s = await snap(page, name);
    return {snap: s.name, url: rel(page.url()), status: resp && resp.status ? resp.status() : resp, ...navSum(nav)};
}
async function pageInfo(page) {
    return page.evaluate(() => {
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('main') || document.body;
        return {
            h1: [...document.querySelectorAll('h1')].filter(vis).map(t).filter(Boolean),
            login: !!document.querySelector('input[name="username"]'),
            rows: [...main.querySelectorAll('.listPanel__item')].filter(vis).map(t),
            empty: t([...main.querySelectorAll('.listPanel__empty, .pkpListPanel__empty')].find(vis) || null),
            buttons: [...main.querySelectorAll('button')].filter(vis).map((b) => t(b) || b.getAttribute('aria-label')).filter(Boolean).slice(0, 40),
            dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(vis).map((d) => t(d).slice(0, 300)),
        };
    }).catch((e) => ({err: String(e.message).slice(0, 200)}));
}
async function land(page, url, name) {
    const chain = [];
    const onResp = (r) => {
        try {
            if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${rel(r.url())}`);
        } catch { /* none */ }
    };
    page.on('response', onResp);
    const resp = await page.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)}));
    await idle(page).catch(() => {});
    page.off('response', onResp);
    const s = await snap(page, name);
    const info = await pageInfo(page);
    const txt = `${s.text.main || ''} ${s.text.dialog || ''}`;
    return {snap: s.name, status: resp && resp.status ? resp.status() : resp, url: rel(page.url()), chain, denied: DENIED.test(txt), deniedText: (txt.match(/[^.]*does not have access to this operation\./) || [null])[0], notices: s.notices, ...info};
}
async function pressInst(page, name) {
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    const link = nav.locator('a[href*="management/settings/institutions"]').first();
    if (!(await link.count())) return {pressed: false};
    let how = 'click';
    if (!(await link.isVisible().catch(() => false))) {
        const idx = await nav.first().evaluate((n) => {
            const a = n.querySelector('a[href*="management/settings/institutions"]');
            return [...n.querySelectorAll('[role="button"][aria-controls]')].findIndex((h) => {
                const r = document.getElementById(h.getAttribute('aria-controls') || '');
                return r && r.contains(a);
            });
        });
        if (idx >= 0) {
            await nav.locator('[role="button"][aria-controls]').nth(idx).click();
            await sleep(500);
        }
    }
    const href = await link.getAttribute('href');
    const before = page.url();
    try {
        await Promise.all([page.waitForURL((u) => u.href !== before, {timeout: T}), link.click({timeout: 5000})]);
    } catch {
        how = 'goto(href)';
        await page.goto(href);
    }
    await idle(page);
    const s = await snap(page, name);
    const info = await pageInfo(page);
    const txt = `${s.text.main || ''} ${s.text.dialog || ''}`;
    return {pressed: true, how, snap: s.name, url: rel(page.url()), denied: DENIED.test(txt), ...info};
}
function apiWatch(page, re = /\/api\/v1\/institutions/) {
    const seen = [];
    const onResp = async (r) => {
        if (!re.test(r.url())) return;
        let body = null;
        if (r.status() >= 500) body = '(body not kept)';
        else if (r.status() >= 400) body = flat(await r.text().catch(() => null), 300);
        seen.push({method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, url: rel(r.url()).replace(/^.*\/api\/v1/, 'api/v1'), status: r.status(), body});
    };
    page.on('response', onResp);
    return {seen, stop: () => page.off('response', onResp)};
}
const rowsLoc = (page) => page.locator('main .listPanel__item');
const rowsText = async (page) => (await rowsLoc(page).allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
async function doSearch(page, phrase) {
    const box = page.getByRole('searchbox', {name: 'Search'});
    await box.fill(phrase);
    await box.press('Enter');
    await idle(page);
    await sleep(600);
}
const panelDlg = (page, title) => page.getByRole('dialog').filter({hasText: title});
async function openAdd(page) {
    await page.getByRole('button', {name: 'Add Institution'}).click();
    const dlg = panelDlg(page, 'Add Institution');
    await dlg.getByRole('button', {name: 'Save'}).waitFor({timeout: T});
    await idle(page);
    return dlg;
}
async function openEdit(page, rowName) {
    const row = rowsLoc(page).filter({hasText: rowName}).first();
    await row.getByRole('button', {name: 'Edit'}).click();
    const dlg = panelDlg(page, 'Edit Institution');
    await dlg.getByRole('button', {name: 'Save'}).waitFor({timeout: T});
    await idle(page);
    for (let i = 0; i < 20; i++) {
        const v = await dlg.locator('input[type="text"]').first().inputValue().catch(() => '');
        if (v) break;
        await sleep(250);
    }
    return dlg;
}
async function savePanel(page, dlg) {
    const w = apiWatch(page);
    const resp = page.waitForResponse((r) => /\/api\/v1\/institutions/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Save'}).click();
    const r = await resp;
    await sleep(1200);
    await idle(page);
    w.stop();
    const open = await dlg.isVisible().catch(() => false);
    const errs = open ? await dlg.locator('.pkpFieldError, .pkpFormPage__status, [role="alert"]').allInnerTexts().catch(() => []) : [];
    const dtext = open ? flat(await dlg.innerText().catch(() => null), 500) : null;
    return {status: r ? r.status() : 'no request', requests: w.seen, panelOpen: open, errors: errs.map((x) => flat(x, 200)).filter(Boolean), dialogText: dtext};
}
async function closePanel(page, dlg) {
    if (!(await dlg.isVisible().catch(() => false))) return;
    await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {});
    await dlg.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
    await sleep(700);
}
async function pressDelete(page, rowName, answer) {
    const row = rowsLoc(page).filter({hasText: rowName}).first();
    await row.getByRole('button', {name: 'Delete'}).click();
    const dlg = page.getByRole('dialog').filter({hasText: /Are you sure/});
    await dlg.waitFor({timeout: T});
    await sleep(300);
    const text = flat(await dlg.innerText().catch(() => null), 400);
    const buttons = await dlg.getByRole('button').allInnerTexts().then((a) => a.map((x) => flat(x, 40))).catch(() => []);
    const w = apiWatch(page);
    await dlg.getByRole('button', {name: answer, exact: true}).click();
    await sleep(1500);
    await idle(page);
    w.stop();
    const after = await pageInfo(page);
    return {confirmText: text, buttons, requests: w.seen, dialogsAfter: after.dialogs, rowsSamePage: after.rows};
}

// Counter R5 (U64 K4 helpers, trimmed)
const reportDialog = (page) => page.getByRole('dialog').filter({hasText: 'Report Settings'});
async function goCounter(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/en/stats/counterR5/counterR5`));
    await idle(page);
    await page.locator('.listPanel__item').first().waitFor({timeout: T}).catch(() => {});
}
async function openReport(page, id) {
    const btn = page.locator('.listPanel__item', {has: page.locator(`span[id="${id}"]`)}).getByRole('button', {name: 'Edit'});
    await btn.click();
    const dlg = reportDialog(page);
    await dlg.getByRole('button', {name: 'Download', exact: true}).waitFor({timeout: T});
    await idle(page);
    return dlg;
}
async function closeReport(page) {
    const dlg = reportDialog(page);
    await dlg.getByRole('button', {name: /^Close$/}).first().click().catch(() => {});
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await sleep(700);
}
async function customerIds(page, app, ctx, name) {
    await goCounter(page, app, ctx);
    const dlg = await openReport(page, 'PR');
    const s = await snap(page, name);
    const sel = dlg.locator('select[name="customer_id"]');
    const out = {snap: s.name, present: (await sel.count()) > 0};
    if (out.present) {
        out.options = await sel.locator('option').allInnerTexts().then((a) => a.map((x) => flat(x, 80)));
        out.label = flat(await dlg.locator('.pkpFormField').filter({has: sel}).locator('.pkpFormField__heading, legend, label').first().innerText().catch(() => null), 80);
    }
    await closeReport(page);
    return out;
}

// ---------------------------------------------------------------- phases
async function phaseMenu(app, S) {
    const ops = app.name === 'ops';
    const ojs = app.name === 'ojs';
    const initialSite = siteRows(app);
    fact('site rows at start', initialSite);
    const siteWasOn = /enableInstitutionUsageStats\|1/.test(initialSite);
    const {page, close} = await launch(app);
    const as = (u, ctx) => signIn(page, u, {contextPath: ctx});
    try {
        // ---- 1. the site's box as found (off at install)
        await step('off: A manager', async () => {
            await as(`${S.A}mgr`, S.A);
            fact('off A mgr menu', {site: siteRows(app), ...(await menuAt(page, app, S.A, 'm-off-A-mgr-menu'))});
            fact('off A mgr page', await land(page, instUrl(app, S.A), 'm-off-A-mgr-page'));
            await page.goto(cu(app, S.A, '/management/settings/distribution'));
            await idle(page);
            const tabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 40))).catch(() => []);
            await page.locator('#statistics-button').first().click();
            await idle(page);
            await sleep(500);
            const panel = page.locator('#statistics');
            const s = await snap(page, 'm-off-A-mgr-dist-statistics');
            fact('off A dist statistics tab', {tabs, snap: s.name, box: await panel.getByLabel('Enable institutional statistics', {exact: true}).count(), text: flat(await panel.innerText().catch(() => null), 700)});
            fact('off A Customer ID', await customerIds(page, app, S.A, 'm-off-A-customer-id'));
        });
        await step('off: admin on A', async () => {
            await signIn(page, 'admin');
            fact('off A admin menu', await menuAt(page, app, S.A, 'm-off-A-admin-menu'));
        });
        if (S.P) {
            await step('off: P (payments)', async () => {
                for (const k of ['mgr', 'ed', 'pe', ...(ojs ? ['sm'] : [])]) {
                    await as(`${S.P}${k}`, S.P);
                    const m = await menuAt(page, app, S.P, `m-off-P-${k}-menu`, k === 'sm' ? '/payments' : '/submissions');
                    const r = {site: siteRows(app), menu: m};
                    if (m.institutions) r.press = await pressInst(page, `m-off-P-${k}-pressed`);
                    r.address = await land(page, instUrl(app, S.P), `m-off-P-${k}-address`);
                    fact(`off P ${k}`, r);
                }
            });
        }
        // ---- 2. the site's box ticked
        fact('site on', await app.api.setSite({enableInstitutionUsageStats: true}));
        try {
            await step('on: A levels', async () => {
                for (const [k] of LEVELS[app.name]) {
                    await as(`${S.A}${k}`, S.A);
                    const m = await menuAt(page, app, S.A, `m-on-A-${k}-menu`, k === 'sm' ? '/payments' : '/submissions');
                    const r = {site: siteRows(app), menu: m};
                    if (m.institutions) r.press = await pressInst(page, `m-on-A-${k}-pressed`);
                    r.address = await land(page, instUrl(app, S.A), `m-on-A-${k}-address`);
                    fact(`on A ${k}`, r);
                }
            });
            await step('on: admin on A', async () => {
                await signIn(page, 'admin');
                const m = await menuAt(page, app, S.A, 'm-on-A-admin-menu');
                const r = {menu: m};
                if (m.institutions) r.press = await pressInst(page, 'm-on-A-admin-pressed');
                r.address = await land(page, instUrl(app, S.A), 'm-on-A-admin-address');
                fact('on A admin', r);
            });
            await step('on: B levels', async () => {
                for (const k of ops ? ['mgr'] : ['mgr', 'ed', 'pe']) {
                    await as(`${S.B}${k}`, S.B);
                    const m = await menuAt(page, app, S.B, `m-on-B-${k}-menu`);
                    const r = {site: siteRows(app), menu: m};
                    if (m.institutions) r.press = await pressInst(page, `m-on-B-${k}-pressed`);
                    r.address = await land(page, instUrl(app, S.B), `m-on-B-${k}-address`);
                    fact(`on B ${k}`, r);
                }
            });
            await step('on: D (journal box never ticked)', async () => {
                await as(`${S.D}mgr`, S.D);
                const m = await menuAt(page, app, S.D, 'm-on-D-mgr-menu');
                await page.goto(cu(app, S.D, '/management/settings/distribution'));
                await idle(page);
                await page.locator('#statistics-button').first().click();
                await idle(page);
                await sleep(500);
                const panel = page.locator('#statistics');
                const box = panel.getByLabel('Enable institutional statistics', {exact: true});
                const s = await snap(page, 'm-on-D-mgr-dist-statistics');
                fact('on D', {site: siteRows(app), menu: m, snap: s.name, box: await box.count(), checked: (await box.count()) ? await box.isChecked() : null, text: flat(await panel.innerText().catch(() => null), 700)});
            });
            await step('on: A Customer ID', async () => {
                await as(`${S.A}mgr`, S.A);
                fact('on A Customer ID', await customerIds(page, app, S.A, 'm-on-A-customer-id'));
            });
            // q1: the journal's box unticked and ticked again on screen by B's manager
            await step('on: q1 toggle on B', async () => {
                await as(`${S.B}mgr`, S.B);
                const toggle = async (want, label) => {
                    await page.goto(cu(app, S.B, '/management/settings/distribution'));
                    await idle(page);
                    await page.locator('#statistics-button').first().click();
                    await idle(page);
                    await sleep(500);
                    const panel = page.locator('#statistics');
                    const box = panel.getByLabel('Enable institutional statistics', {exact: true});
                    const before = await box.isChecked();
                    if (want) await box.check(); else await box.uncheck();
                    const w = page.waitForResponse((r) => /api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
                    await panel.getByRole('button', {name: 'Save', exact: true}).click();
                    const r = await w;
                    const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
                    await sleep(500);
                    const same = navSum(await readNav(page));
                    const s1 = await snap(page, `m-q1-B-${label}-same-page`);
                    await page.reload();
                    await idle(page);
                    const reload = navSum(await readNav(page));
                    const s2 = await snap(page, `m-q1-B-${label}-reloaded`);
                    return {before, status: r ? r.status() : 'no request', saved, sameSnap: s1.name, samePage: {institutions: same.institutions, instParent: same.instParent, groups: same.groups}, reloadSnap: s2.name, reloaded: {institutions: reload.institutions, groups: reload.groups}};
                };
                fact('q1 untick', await toggle(false, 'untick'));
                if (!ops) {
                    for (const k of ['ed', 'pe']) {
                        await as(`${S.B}${k}`, S.B);
                        fact(`q1 B ${k} after untick`, await menuAt(page, app, S.B, `m-q1-B-${k}-after-untick`));
                    }
                    await as(`${S.B}mgr`, S.B);
                }
                fact('q1 B mgr after untick', await menuAt(page, app, S.B, 'm-q1-B-mgr-after-untick'));
                fact('q1 B address after untick', await land(page, instUrl(app, S.B), 'm-q1-B-mgr-address-after-untick'));
                fact('q1 retick', await toggle(true, 'retick'));
            });
            await step('on: signed out', async () => {
                await signOut(page);
                fact('on signed out address', await land(page, instUrl(app, S.A), 'm-on-signedout-address'));
            });
        } finally {
            const back = await app.api.setSite({enableInstitutionUsageStats: siteWasOn}).catch((e) => e.message);
            fact('site put back', {back, rows: siteRows(app)});
        }
        // ---- 3. off again: the journal's box still stored ticked on A
        await step('off again: A manager', async () => {
            await as(`${S.A}mgr`, S.A);
            fact('off2 A mgr menu', {site: siteRows(app), ...(await menuAt(page, app, S.A, 'm-off2-A-mgr-menu'))});
            fact('off2 A mgr page', await land(page, instUrl(app, S.A), 'm-off2-A-mgr-page'));
            fact('off2 A Customer ID', await customerIds(page, app, S.A, 'm-off2-A-customer-id'));
            fact('off2 A context row', sql(app, `select setting_value from ${CTX_TABLE[app.name][1].replace('_id', '')}_settings where setting_name='enableInstitutionUsageStats' and ${CTX_TABLE[app.name][1]}=${loadSeed(app).ids.A.contextId}`).replace(/^.*$/, (x) => x || '(none)'));
        });
    } finally {
        await close();
    }
}

async function phaseRoles(app, S) {
    const ops = app.name === 'ops';
    const {page, close} = await launch(app);
    try {
        const readGrid = () => page.locator('#roleGridContainer').evaluate((g) => {
            const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
            return {
                cols: [...g.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
                rows: [...g.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => ({
                    name: (tr.querySelector('[id$="-name"] .label') || {}).innerText?.trim(),
                    level: (tr.querySelector('[id$="-roleId"] .label') || {}).innerText?.trim(),
                    arrow: !!tr.querySelector('a.show_extras, a.hide_extras'),
                })),
            };
        });
        const gotoRoles = async (ctx) => {
            await page.goto(cu(app, ctx, '/management/settings/access'));
            await idle(page);
            await page.locator('#roles-button').first().click();
            await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: T});
            await idle(page);
        };
        const rowLoc = (name) => page.locator('#roleGridContainer tr.gridRow').filter({has: page.locator('[id$="-name"] .label', {hasText: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)})}).first();
        const permitOf = async (ctx, name, snapName) => {
            await gotoRoles(ctx);
            const row = rowLoc(name);
            const arrow = row.locator('a.show_extras');
            if (!(await arrow.count())) return 'no arrow';
            await arrow.click();
            const ctl = row.locator('xpath=following-sibling::tr[1]');
            const links = (await ctl.getByRole('link').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
            const edit = ctl.getByRole('link', {name: 'Edit', exact: true});
            if (!(await edit.count())) return {links, edit: false};
            await edit.click();
            const form = page.locator('form#userGroupForm');
            await form.waitFor({state: 'visible', timeout: T});
            await idle(page);
            await sleep(400);
            const box = form.locator('input[name="permitSettings"]');
            const r = {links, edit: true, permit: (await box.count()) ? {checked: await box.isChecked(), disabled: await box.isDisabled(), visible: await box.isVisible()} : 'absent',
                label: flat(await form.locator('label').filter({has: box}).innerText().catch(() => null), 80) || flat(await form.getByText('Permit changes to Settings').first().innerText().catch(() => null), 80)};
            if (snapName) r.snap = (await snap(page, snapName)).name;
            await form.getByRole('link', {name: 'Cancel', exact: true}).or(form.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
            await form.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
            await sleep(600);
            return r;
        };
        await signIn(page, `${S.A}mgr`, {contextPath: S.A});
        await gotoRoles(S.A);
        const g = await readGrid();
        const s = await snap(page, 'r-roles-A-grid');
        fact('roles A grid', {snap: s.name, ...g});
        await loc(page, 'Roles › "Settings" arrow of a row', page.locator('#roleGridContainer a.show_extras'));
        const mgrLevel = g.rows.length ? g.rows.find((r) => /Manager/.test(r.level || ''))?.level : null;
        const mgrRows = g.rows.filter((r) => r.level === mgrLevel);
        fact('roles A manager-level rows', mgrRows);
        const perm = {};
        for (const r of mgrRows) perm[r.name] = await step(`permit ${r.name}`, () => permitOf(S.A, r.name, `r-roles-A-${r.name.replace(/\W+/g, '')}-window`));
        fact('roles A manager-level windows', perm);
        if (!ops) {
            await signIn(page, `${S.B}mgr`, {contextPath: S.B});
            const gb = (await gotoRoles(S.B), await readGrid());
            const ed = gb.rows.filter((r) => r.level === mgrLevel);
            const pb = {};
            for (const r of ed) pb[r.name] = await step(`permit B ${r.name}`, () => permitOf(S.B, r.name, null));
            fact('roles B manager-level windows', pb);
        }
        // admin's roles in a journal: publicknowledge (read-only) and A, read on the Users list as the journal's manager
        for (const [who, ctx] of [['manager.maya', app.contextPath], [`${S.A}mgr`, S.A]]) {
            await step(`admin roles on ${ctx}`, async () => {
                await signIn(page, who, {contextPath: ctx});
                await page.goto(cu(app, ctx, '/management/settings/access'));
                await idle(page);
                const box = page.getByRole('searchbox').first();
                if (await box.count()) {
                    await box.fill('admin');
                    await box.press('Enter');
                    await idle(page);
                    await sleep(800);
                }
                const rows = await page.locator('main tr').filter({hasText: 'admin@mail.test'}).allInnerTexts().then((a) => a.map((x) => flat(x, 300))).catch(() => []);
                const sn = await snap(page, `r-users-admin-${ctx === app.contextPath ? 'pk' : 'A'}`);
                fact(`admin row on ${ctx === app.contextPath ? 'publicknowledge' : 'A'}`, {snap: sn.name, rows});
            });
        }
    } finally {
        await close();
    }
}

async function dismissDialog(page) {
    const d = page.locator('[role="dialog"]:visible').last();
    if (!(await d.count())) return null;
    const text = flat(await d.innerText().catch(() => null), 200);
    await d.getByRole('button', {name: /^(OK|Close)$/}).first().click().catch(() => {});
    await sleep(700);
    return text;
}

async function phaseAdmin(app, S) {
    const {page, close} = await launch(app);
    const adminId = sql(app, "select user_id from users where username='admin'");
    try {
        // end admin's manager role in E on the admin's own edit page
        await step('remove admin manager role in E', async () => {
            await signIn(page, 'admin');
            await page.goto(cu(app, S.E, '/management/settings/access'));
            await idle(page);
            await sleep(800);
            const row = page.locator('main tr').filter({hasText: 'admin@mail.test'}).first();
            let via = 'users list › Edit';
            try {
                await row.waitFor({timeout: 8000});
                await row.locator('button').last().click();
                await sleep(500);
                await page.getByRole('menuitem', {name: /^Edit$/}).first().click();
                await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T});
            } catch {
                via = 'address';
                await page.goto(cu(app, S.E, `/management/settings/user/${adminId}`));
            }
            await idle(page);
            await sleep(800);
            const before = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
            await snap(page, 'a-E-admin-edit-before');
            const mgrRow = page.locator('tr').filter({hasText: /manager/i}).filter({has: page.getByRole('button', {name: /Remove Role/i})}).first();
            let removed = 'no manager row';
            if (await mgrRow.count()) {
                await mgrRow.getByRole('button', {name: /Remove Role/i}).click();
                await sleep(600);
                const d = page.locator('[role="dialog"]:visible').last();
                const w = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/api\/v1\//.test(r.url()), {timeout: T}).catch(() => null);
                await d.getByRole('button', {name: /^Remove Role$/i}).click().catch(() => {});
                const r = await w;
                await sleep(1000);
                removed = r ? r.status() : 'no response';
            }
            const after = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/i})}).allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
            await snap(page, 'a-E-admin-edit-after').catch(() => {});
            fact('E remove', {via, before, removed, after, groups: sql(app, `select ug.role_id from user_user_groups uug join user_groups ug using(user_group_id) where uug.user_id=${adminId} and ug.context_id=${loadSeed(app).ids.E.contextId} and (uug.date_end is null or uug.date_end > now())`)});
        });
        await signIn(page, 'admin');
        fact('E admin menu', await menuAt(page, app, S.E, 'a-E-admin-menu'));
        const lw = apiWatch(page, /\/api\/v1\//);
        const pg = await land(page, instUrl(app, S.E), 'a-E-admin-page');
        lw.stop();
        pg.apiOnLanding = lw.seen.filter((x) => x.status >= 400);
        pg.nav = navSum(await readNav(page));
        fact('E admin page', pg);
        if ((pg.h1 || []).includes('Institutions')) {
            const ld = page.locator('[role="dialog"]:visible').last();
            if (await ld.count()) {
                await ld.getByRole('button', {name: /^OK$/}).first().click().catch(() => {});
                await sleep(700);
            }
            await step('E search', async () => {
                const w = apiWatch(page);
                await doSearch(page, 'campus');
                w.stop();
                const s = await snap(page, 'a-E-admin-search');
                fact('E search', {requests: w.seen, rows: await rowsText(page), notices: s.notices, dialog: s.text.dialog, empty: (await pageInfo(page)).empty});
                const dlg = page.locator('[role="dialog"]:visible').last();
                if (await dlg.count()) {
                    await dlg.getByRole('button', {name: /OK|Close/}).first().click().catch(() => {});
                    await sleep(700);
                }
            });
            await page.goto(instUrl(app, S.E));
            await idle(page);
            fact(`E landing dialog ${Math.random().toString(36).slice(2, 5)}`, await dismissDialog(page));
            await step('E add', async () => {
                const dlg = await openAdd(page);
                await dlg.getByLabel('Name', {exact: false}).first().fill('Probe');
                const r = await savePanel(page, dlg);
                const s = await snap(page, 'a-E-admin-add-saved');
                fact('E add', {...r, notices: s.notices, pageRows: await rowsText(page)});
                await closePanel(page, dlg);
            });
            await page.goto(instUrl(app, S.E));
            await idle(page);
            fact(`E landing dialog ${Math.random().toString(36).slice(2, 5)}`, await dismissDialog(page));
            await step('E delete', async () => {
                const d = await pressDelete(page, 'Campus Library', 'Yes');
                const s = await snap(page, 'a-E-admin-delete-yes');
                d.notices = s.notices;
                d.dialog = s.text.dialog;
                const dlg = page.locator('[role="dialog"]:visible').last();
                if (await dlg.count()) {
                    await dlg.getByRole('button', {name: /OK|Close/}).first().click().catch(() => {});
                    await sleep(700);
                }
                await page.reload();
                await idle(page);
                const s2 = await snap(page, 'a-E-admin-delete-reloaded');
                d.rowsAfterReload = await rowsText(page);
                d.reloadSnap = s2.name;
                fact('E delete', d);
            });
            fact('E db institutions', sql(app, `select institution_id, deleted_at is not null from institutions where context_id=${loadSeed(app).ids.E.contextId} order by 1`));
        }
        // control: E's manager on the same list
        await step('E manager control', async () => {
            await signIn(page, `${S.E}mgr`, {contextPath: S.E});
            const c = await land(page, instUrl(app, S.E), 'a-E-mgr-page');
            const w = apiWatch(page);
            await doSearch(page, 'campus');
            w.stop();
            fact('E manager control', {page: c, searchRequests: w.seen, rowsAfterSearch: await rowsText(page)});
        });
    } finally {
        await close();
    }
}

async function phaseSidefx(app, S) {
    const ojs = app.name === 'ojs';
    const sd = loadSeed(app);
    const cid = sd.ids.C.contextId;
    const maxIds = () => sql(app, 'select (select coalesce(max(notification_id),0) from notifications), (select coalesce(max(log_id),0) from event_log), (select coalesce(max(log_id),0) from email_log)').split('|').map(Number);
    const t0 = new Date().toISOString();
    const ids0 = maxIds();
    const mail0 = await app.mail.messageCount().catch(() => null);
    const {page, close} = await launch(app);
    const T_ = {};
    try {
        await signIn(page, `${S.C}mgr`, {contextPath: S.C});
        const p0 = await land(page, instUrl(app, S.C), 's-C-page');
        fact('C page', p0);
        await loc(page, 'Institutions › "Search" box', page.getByRole('searchbox', {name: 'Search'}));
        await loc(page, 'Institutions › "Add Institution"', page.getByRole('button', {name: 'Add Institution'}));
        await loc(page, 'Institutions › list rows', rowsLoc(page));
        await loc(page, 'Institutions › row "Edit"', rowsLoc(page).first().getByRole('button', {name: 'Edit'}));
        await loc(page, 'Institutions › row "Delete"', rowsLoc(page).first().getByRole('button', {name: 'Delete'}));
        // Rule 2 on its own page: the other context's institution by search
        await step('C search Zebra', async () => {
            await doSearch(page, 'Zebra');
            const s = await snap(page, 's-C-search-zebra');
            fact('C search Zebra', {rows: await rowsText(page), empty: (await pageInfo(page)).empty, snap: s.name});
            await doSearch(page, '172.16');
            fact('C search 172.16', {rows: await rowsText(page), empty: (await pageInfo(page)).empty});
            await doSearch(page, '');
        });
        // the ROR box: typing never asks the registry (Cross-feature)
        await step('C add Fresh Institute', async () => {
            await page.goto(instUrl(app, S.C));
            await idle(page);
            const dlg = await openAdd(page);
            const ext = [];
            const onReq = (r) => { if (!/127\.0\.0\.1|localhost/.test(r.url())) ext.push(rel(r.url())); if (/ror/i.test(r.url()) && !/institutions/.test(r.url())) ext.push(r.url()); };
            page.on('request', onReq);
            await dlg.getByLabel('Name', {exact: false}).first().fill('Fresh Institute');
            await dlg.locator('textarea').first().fill('10.20.0.0/16');
            await dlg.getByLabel('ROR', {exact: false}).first().pressSequentially('https://ror.org/03yrm5c', {delay: 40});
            await sleep(1500);
            const sp = await snap(page, 's-C-add-typed');
            const listboxes = await page.getByRole('listbox').count();
            await dlg.getByLabel('ROR', {exact: false}).first().fill('https://ror.org/03yrm5c26');
            page.off('request', onReq);
            const r = await savePanel(page, dlg);
            const same = await rowsText(page);
            const s1 = await snap(page, 's-C-add-saved');
            await page.reload();
            await idle(page);
            const s2 = await snap(page, 's-C-add-reloaded');
            fact('C add Fresh Institute', {typedSnap: sp.name, rorRequests: ext, listboxes, ...r, samePageRows: same, notices: s1.notices, reloadedRows: await rowsText(page), reloadSnap: s2.name});
        });
        fact('C Customer ID after add', await step('cid1', () => customerIds(page, app, S.C, 's-C-customer-id-after-add')));
        if (ojs) {
            T_.window = async (name) => {
                await page.goto(cu(app, S.C, '/payments'));
                await idle(page);
                await page.getByRole('tab', {name: 'Institutional Subscriptions', exact: true}).click();
                await idle(page);
                await sleep(500);
                const panel = page.getByRole('tabpanel', {name: 'Institutional Subscriptions'});
                await panel.locator('table').first().waitFor({timeout: T}).catch(() => {});
                const grid = await panel.evaluate((root) => [...root.querySelectorAll('table')].filter((t) => t.getClientRects().length).map((t) => ({
                    columns: [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
                    rows: [...t.querySelectorAll('tbody tr.gridRow')].filter((tr) => tr.getClientRects().length).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim())),
                })));
                const sg = await snap(page, `${name}-grid`);
                await panel.getByRole('link', {name: 'Create New Subscription', exact: true}).first().click();
                const w = page.locator('[role="dialog"]:visible').last();
                await w.locator('[name="institutionId"]').waitFor({timeout: T}).catch(() => {});
                await idle(page);
                await sleep(600);
                const options = await w.locator('[name="institutionId"] option').allInnerTexts().then((a) => a.map((x) => flat(x, 80))).catch(() => []);
                const sw = await snap(page, `${name}-window`);
                const c = w.getByRole('button', {name: 'Close', exact: true}).first();
                if (await c.count()) await c.click().catch(() => {});
                await sleep(800);
                return {grid, gridSnap: sg.name, windowSnap: sw.name, options};
            };
            fact('C subscription window after add', await step('win1', () => T_.window('s-C-subs-after-add')));
        }
        // rename Campus Library
        await step('C rename Campus Library', async () => {
            await page.goto(instUrl(app, S.C));
            await idle(page);
            const dlg = await openEdit(page, 'Campus Library');
            const name = dlg.getByLabel('Name', {exact: false}).first();
            await name.fill('Campus Library Renamed');
            const r = await savePanel(page, dlg);
            const same = await rowsText(page);
            const s1 = await snap(page, 's-C-rename-saved');
            await page.reload();
            await idle(page);
            fact('C rename', {...r, samePageRows: same, notices: s1.notices, reloadedRows: await rowsText(page)});
        });
        fact('C Customer ID after rename', await step('cid2', () => customerIds(page, app, S.C, 's-C-customer-id-after-rename')));
        if (ojs) fact('C subscription window after rename', await step('win2', () => T_.window('s-C-subs-after-rename')));
        // IP ranges take effect from the next visit (OJS: an institutional subscription)
        if (ojs) {
            const visitor = async (name) => {
                const b = await launch(app);
                try {
                    await b.page.goto(cu(app, S.C, `/article/view/${sd.sub.id}`));
                    await idle(b.page);
                    const links = await b.page.locator('a.obj_galley_link').evaluateAll((els) => els.map((a) => ({text: a.innerText.trim(), cls: a.className, href: a.getAttribute('href')}))).catch(() => []);
                    const s = await snap(b.page, `${name}-article`);
                    let pressed = null;
                    const link = b.page.locator('a.obj_galley_link').first();
                    if (await link.count()) {
                        await Promise.all([b.page.waitForLoadState('load').catch(() => {}), link.click()]);
                        await idle(b.page);
                        await sleep(500);
                        const s2 = await snap(b.page, `${name}-galley`);
                        pressed = {url: rel(b.page.url()), open: /\/view\/\d+\/\d+/.test(b.page.url()) && !/login|purchase|subscriptions/.test(b.page.url()), h1: (await pageInfo(b.page)).h1, snap: s2.name};
                    }
                    return {links, snap: s.name, pressed};
                } finally {
                    await b.close();
                }
            };
            fact('C visitor before IP change', await step('vis1', () => visitor('s-C-visitor-before')));
            await step('C Local Library IP to 127.0.0.1', async () => {
                await page.goto(instUrl(app, S.C));
                await idle(page);
                const dlg = await openEdit(page, 'Local Library');
                await dlg.locator('textarea').first().fill('127.0.0.1');
                fact('C Local Library IP', await savePanel(page, dlg));
            });
            fact('C visitor after IP change', await step('vis2', () => visitor('s-C-visitor-after')));
        }
        // the "Delete Institution" dialog: its text, "No", then "Yes" on Fresh Institute
        await step('C delete dialog', async () => {
            await page.goto(instUrl(app, S.C));
            await idle(page);
            const no = await pressDelete(page, 'Fresh Institute', 'No');
            fact('C delete No', no);
            await sleep(600);
            const yes = await pressDelete(page, 'Fresh Institute', 'Yes');
            const s = await snap(page, 's-C-delete-yes');
            yes.notices = s.notices;
            yes.dialog = s.text.dialog;
            const dlg = page.locator('[role="dialog"]:visible').last();
            if (await dlg.count()) {
                await dlg.getByRole('button', {name: /OK|Close/}).first().click().catch(() => {});
                await sleep(700);
            }
            await page.reload();
            await idle(page);
            yes.rowsAfterReload = await rowsText(page);
            fact('C delete Yes', yes);
        });
        // Side effects 1: no mail, notification or log from any of the above
        await sleep(3000);
        const ids1 = maxIds();
        fact('C side effects (notifications, event_log, email_log max ids before/after)', {before: ids0, after: ids1,
            newNotifications: ids1[0] > ids0[0] ? sql(app, `select notification_id, context_id, type, assoc_type, assoc_id from notifications where notification_id > ${ids0[0]} order by 1`) : '',
            newEvents: ids1[1] > ids0[1] ? sql(app, `select log_id, assoc_type, assoc_id, event_type, message from event_log where log_id > ${ids0[1]} order by 1`).slice(0, 1500) : '',
            newEmails: ids1[2] > ids0[2] ? sql(app, `select log_id, assoc_type, assoc_id, event_type, subject from email_log where log_id > ${ids0[2]} order by 1`).slice(0, 1500) : ''});
        const msgs = await app.mail._get('/api/v1/messages', {limit: '100'}).catch(() => null);
        fact('C mail', {countBefore: mail0, countAfter: await app.mail.messageCount().catch(() => null),
            sinceStart: msgs ? msgs.messages.filter((m) => m.Created > t0).map((m) => ({to: (m.To || []).map((x) => x.Address).join(','), subject: m.Subject, created: m.Created})) : null});
        // Rule 2: the other context D, its own page and Customer ID list
        await step('D page and Customer ID', async () => {
            await signIn(page, `${S.D}mgr`, {contextPath: S.D});
            const d = await land(page, instUrl(app, S.D), 's-D-page');
            await doSearch(page, 'Library');
            const srch = await rowsText(page);
            fact('D page', {page: d, searchLibrary: srch, empty: (await pageInfo(page)).empty});
            fact('D Customer ID', await customerIds(page, app, S.D, 's-D-customer-id'));
        });
        // the site keeps no list: Administration
        await step('admin Administration', async () => {
            await signIn(page, 'admin');
            const a = await land(page, app.url('/index.php/index/en/admin'), 's-admin-administration');
            const links = await page.locator('main a').evaluateAll((els) => els.map((e) => e.innerText.trim()).filter(Boolean)).catch(() => []);
            fact('Administration links', {snap: a.snap, links, anyInstitution: links.some((l) => /institution/i.test(l))});
            const idx = await land(page, app.url('/index.php/index/en/management/settings/institutions'), 's-admin-site-institutions-address');
            fact('site-level institutions address', idx);
        });
        // Cross-feature (OJS): a reader's "Purchase Institutional Subscription" adds an institution
        if (ojs) {
            await step('purchase institutional', async () => {
                const count = () => sql(app, `select count(*) from institutions where context_id=${cid} and deleted_at is null`);
                const before = count();
                await signIn(page, `${S.C}r3`, {contextPath: S.C});
                const l = await land(page, cu(app, S.C, '/user/purchaseSubscription/institutional'), 's-C-purchase-institutional');
                const f = page.locator('form').filter({has: page.locator('[name="institutionName"]')}).first();
                let after = null;
                if (await f.count()) {
                    await f.locator('[name="institutionName"]').fill('Campus Library Renamed');
                    await f.locator('[name="domain"]').fill('bought.example.org').catch(() => {});
                    await Promise.all([page.waitForLoadState('load').catch(() => {}), page.getByRole('button', {name: /Continue|Save/}).first().click()]);
                    await idle(page);
                    const s = await snap(page, 's-C-purchase-continued');
                    after = {url: rel(page.url()), text: flat(s.text.main, 300)};
                }
                await signIn(page, `${S.C}mgr`, {contextPath: S.C});
                const pg = await land(page, instUrl(app, S.C), 's-C-page-after-purchase');
                fact('purchase institutional', {page: {status: l.status, h1: l.h1}, after, countBefore: before, countAfter: count(), rows: pg.rows});
            });
        }
    } finally {
        await close();
    }
}

async function phaseCounter(app, S) {
    const initial = siteRows(app);
    fact('site rows at start', initial);
    const m = initial.match(/counterR5StartDate\|(\S+)/);
    const was = m ? m[1] : null;
    const {page, close} = await launch(app);
    try {
        fact('counterR5StartDate set', await app.api.setSite({counterR5StartDate: '2026-05-01'}));
        await signIn(page, `${S.C}mgr`, {contextPath: S.C});
        await goCounter(page, app, S.C);
        const s0 = await snap(page, 'c-C-counter-page');
        fact('counter page', {snap: s0.name, text: flat(s0.text.main, 600)});
        for (const [label, re] of [['campus', /^Campus Library/], ['local', /^Local Library/], ['world', /^The World$/]]) {
            await step(`download ${label}`, async () => {
                const dlg = await openReport(page, 'PR');
                const sel = dlg.locator('select[name="customer_id"]');
                const opts = await sel.locator('option').allInnerTexts();
                const pick = opts.find((o) => re.test(o.trim()));
                if (pick) await sel.selectOption({label: pick.trim()});
                const vals = {begin: await dlg.locator('input[name="begin_date"]').inputValue().catch(() => null), end: await dlg.locator('input[name="end_date"]').inputValue().catch(() => null)};
                const s = await snap(page, `c-C-pr-${label}-window`);
                const dl = page.waitForEvent('download', {timeout: 20_000}).catch(() => null);
                const resp = page.waitForResponse((r) => /\/stats\/sushi\/reports\//.test(r.url()), {timeout: 20_000}).catch(() => null);
                await dlg.getByRole('button', {name: 'Download', exact: true}).click();
                const r = await resp;
                const d = r && r.status() === 200 ? await dl : null;
                const out = {pick, opts, vals, windowSnap: s.name, status: r ? r.status() : null, url: r ? rel(r.url()) : null};
                if (d) {
                    const p = path.join(outDir(), `r${RUN}-c-pr-${label}-${app.name}.tsv`);
                    await d.saveAs(p);
                    const content = fs.readFileSync(p, 'utf8');
                    out.file = path.basename(p);
                    out.header = content.split('\n').slice(0, 14);
                    out.institutionId = content.split('\n').filter((x) => /^Institution_(ID|Name)/.test(x));
                } else if (r) {
                    out.body = flat(await r.text().catch(() => null), 500);
                }
                await sleep(500);
                if (await reportDialog(page).isVisible().catch(() => false)) await closeReport(page);
                fact(`PR ${label}`, out);
            });
        }
        fact('institution ids (db)', sql(app, `select institution_id, ror from institutions where context_id=${loadSeed(app).ids.C.contextId} order by 1`));
    } finally {
        const back = await app.api.setSite({counterR5StartDate: was}).catch((e) => e.message);
        fact('counterR5StartDate put back', {back, rows: siteRows(app)});
        await close();
    }
}

async function phaseHosted(app, S) {
    const noun = {ojs: 'Hosted Journals', omp: 'Hosted Presses', ops: 'Hosted Servers'}[app.name];
    const sd = loadSeed(app);
    const [tbl, idc] = CTX_TABLE[app.name];
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        // H1: one institution added on its Institutions page
        await step('H1 add institution', async () => {
            await page.goto(instUrl(app, S.H1));
            await idle(page);
            const dlg = await openAdd(page);
            await dlg.getByLabel('Name', {exact: false}).first().fill('Hosted Probe Library');
            await dlg.locator('textarea').first().fill('10.1.1.0/24');
            const r = await savePanel(page, dlg);
            await page.reload();
            await idle(page);
            fact('H1 add', {...r, rows: await rowsText(page)});
        });
        const hosted = async () => {
            await page.goto(app.url('/index.php/index/en/admin/contexts'));
            await idle(page);
            await page.locator('tr.gridRow').first().waitFor({timeout: T});
        };
        const rowOf = (name) => page.locator('tr.gridRow').filter({hasText: name}).first();
        for (const k of ['H1', 'H0']) {
            await step(`${k} delete`, async () => {
                const name = `U66 K1 ${k} ${S.t}`;
                const id = sd.ids[k].contextId;
                await hosted();
                const h = await snap(page, `h-${k}-hosted-before`);
                const r = rowOf(name);
                await r.waitFor({timeout: T});
                const ex = r.locator('a.show_extras');
                if (await ex.count()) { await ex.click(); await sleep(400); }
                const ctl = r.locator('xpath=following-sibling::tr[1]');
                const links = (await ctl.getByRole('link').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
                await ctl.getByRole('link', {name: 'Remove', exact: true}).click();
                const conf = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
                await conf.waitFor({timeout: T});
                await sleep(400);
                const c = await snap(page, `h-${k}-confirm`);
                const all = [];
                const onResp = async (x) => {
                    if (x.request().method() !== 'GET') {
                        let body = null;
                        if (x.status() >= 500) body = '(body not kept)';
                        else if (!/\.(js|css)/.test(x.url())) body = flat(await x.text().catch(() => null), 400);
                        all.push({status: x.status(), url: rel(x.url()).replace(/^.*\$\$\$call\$\$\$/, ''), body});
                    }
                };
                page.on('response', onResp);
                await conf.getByRole('button', {name: 'OK', exact: true}).click();
                await sleep(4000);
                await idle(page);
                page.off('response', onResp);
                const after = await snap(page, `h-${k}-after-ok`);
                const rowSame = await rowOf(name).count();
                const dialogs = (await pageInfo(page)).dialogs;
                await hosted();
                const s2 = await snap(page, `h-${k}-reloaded`);
                const rowReload = await rowOf(name).count();
                const res = {noun, hostedSnap: h.name, rowLinks: links, confirm: c.text.dialog, requests: all, afterSnap: after.name, notices: after.notices, dialogs, rowSamePage: rowSame, rowAfterReload: rowReload, reloadSnap: s2.name,
                    db: {context: sql(app, `select count(*) from ${tbl} where ${idc}=${id}`), institutions: sql(app, `select count(*) from institutions where context_id=${id}`),
                        userGroups: sql(app, `select count(*) from user_groups where context_id=${id}`), genres: sql(app, `select count(*) from genres where context_id=${id}`)}};
                if (rowReload) {
                    // What the context left behind shows: its Roles tab, and its Institutions page.
                    await page.goto(cu(app, S[k], '/management/settings/access'));
                    await idle(page);
                    await page.locator('#roles-button').first().click().catch(() => {});
                    await idle(page);
                    await sleep(800);
                    const rs = await snap(page, `h-${k}-roles-after-failed-delete`);
                    res.rolesAfter = {snap: rs.name, rows: await page.locator('#roleGridContainer tr.gridRow').count(), empty: flat(await page.locator('#roleGridContainer tr.empty, #roleGridContainer .empty').first().innerText().catch(() => null), 80)};
                    const ip = await land(page, instUrl(app, S[k]), `h-${k}-institutions-after-failed-delete`);
                    res.institutionsAfter = {rows: ip.rows, h1: ip.h1};
                }
                fact(`${k} delete`, res);
            });
        }
    } finally {
        await close();
    }
}

// Cross-feature (Payments & APCs A12): "Enable" saved unticked, then ticked again, on P.
async function phasePay(app, S) {
    if (!S.P) return;
    const {page, close} = await launch(app);
    try {
        await signIn(page, `${S.P}mgr`, {contextPath: S.P});
        const save = async (want, label) => {
            await page.goto(cu(app, S.P, '/management/settings/distribution'));
            await idle(page);
            await page.locator('#payments-button').first().click();
            await idle(page);
            await sleep(600);
            const panel = page.locator('#payments');
            const box = panel.getByRole('checkbox').first();
            const boxLabel = flat(await box.evaluate((i) => (i.closest('label') || {}).innerText || i.name).catch(() => null), 120);
            const before = await box.isChecked();
            if (want) await box.check(); else await box.uncheck();
            const w = page.waitForResponse((r) => /_payments|contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
            await panel.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
            await sleep(600);
            const same = navSum(await readNav(page));
            const s1 = await snap(page, `p-P-${label}-same-page`);
            await page.reload();
            await idle(page);
            const re = navSum(await readNav(page));
            await snap(page, `p-P-${label}-reloaded`);
            return {boxLabel, before, status: r ? r.status() : 'no request', saved, samePage: {institutions: same.institutions, payments: same.groups.includes('Payments'), groups: same.groups.filter((g) => !/Dashboard/.test(g))}, sameSnap: s1.name, reloaded: {institutions: re.institutions, payments: re.groups.includes('Payments')}};
        };
        fact('P Enable unticked', await save(false, 'untick'));
        fact('P Enable ticked again', await save(true, 'retick'));
    } finally {
        await close();
    }
}

// The Site Administrator on P (payments enabled, statistics boxes off).
async function phasePadmin(app, S) {
    if (!S.P) return;
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        fact('site rows', siteRows(app));
        const m = await menuAt(page, app, S.P, 'pa-P-admin-menu');
        const r = {menu: m};
        if (m.institutions) r.press = await pressInst(page, 'pa-P-admin-pressed');
        fact('P admin', r);
    } finally {
        await close();
    }
}

// A4's last clause (OJS): an institution a subscription names, deleted on C, is kept for its subscription.
async function phaseA4(app, S) {
    if (app.name !== 'ojs') return;
    const {page, close} = await launch(app);
    try {
        await signIn(page, `${S.C}mgr`, {contextPath: S.C});
        await page.goto(instUrl(app, S.C));
        await idle(page);
        const d = await pressDelete(page, 'Local Library', 'Yes');
        await page.reload();
        await idle(page);
        d.rowsAfterReload = await rowsText(page);
        d.reloadSnap = (await snap(page, 'a4-C-after-delete-reloaded')).name;
        fact('A4 delete subscribed institution', d);
        fact('A4 Customer ID after', await customerIds(page, app, S.C, 'a4-C-customer-id'));
        await page.goto(cu(app, S.C, '/payments'));
        await idle(page);
        await page.getByRole('tab', {name: 'Institutional Subscriptions', exact: true}).click();
        await idle(page);
        await sleep(600);
        const panel = page.getByRole('tabpanel', {name: 'Institutional Subscriptions'});
        const rows = await panel.locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 150)));
        fact('A4 Institutional Subscriptions rows', {rows, snap: (await snap(page, 'a4-C-subs-grid')).name});
    } finally {
        await close();
    }
}

// A context whose deletion failed (OMP/OPS H1): what its screens show afterwards.
async function phaseLeft(app, S) {
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/en/admin/contexts'));
        await idle(page);
        fact('H1 listed', await page.locator('tr.gridRow').filter({hasText: `U66 K1 H1 ${S.t}`}).count());
        await page.goto(cu(app, S.H1, '/management/settings/access'));
        await idle(page);
        await page.locator('#roles-button').first().click().catch(() => {});
        await idle(page);
        await sleep(800);
        const rs = await snap(page, 'l-H1-roles');
        fact('H1 roles tab', {snap: rs.name, rows: await page.locator('#roleGridContainer tr.gridRow').count(), text: flat(await page.locator('#roleGridContainer').innerText().catch(() => null), 300)});
        const ip = await land(page, instUrl(app, S.H1), 'l-H1-institutions');
        fact('H1 institutions page', {rows: ip.rows, h1: ip.h1, denied: ip.denied});
        const home = await land(page, cu(app, S.H1, ''), 'l-H1-home');
        fact('H1 home', {status: home.status, url: home.url, h1: home.h1});
    } finally {
        await close();
    }
}

// ---------------------------------------------------------------- main
forEachApp(async (app) => {
    facts = {};
    const phases = [['seed', null], ['menu', phaseMenu], ['roles', phaseRoles], ['admin', phaseAdmin], ['sidefx', phaseSidefx], ['counter', phaseCounter], ['hosted', phaseHosted], ['left', phaseLeft], ['pay', phasePay], ['padmin', phasePadmin], ['a4', phaseA4]];
    for (const [p, fn] of phases) {
        if (!on(p)) continue;
        phaseName = p;
        const t0 = Date.now();
        try {
            if (p === 'seed') await seed(app);
            else await fn(app, loadSeed(app));
        } catch (e) {
            fact('PHASE FAILED', String((e && e.stack) || e).split('\n').slice(0, 6).join(' | '));
        }
        fact('seconds', Math.round((Date.now() - t0) / 1000));
        record(`facts-r${RUN}`, facts, {merge: true});
        facts = {};
    }
});
