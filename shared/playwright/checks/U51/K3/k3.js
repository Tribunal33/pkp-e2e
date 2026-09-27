const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U51 claim check, chunk K3 — the reader's pages: the "Subscriptions" page, "My Subscriptions", the purchase
// pages, the "Subscription" block, Rules 26–33, the manual method, Settings bullets 4, 12, 13, register A6,
// A9–A13 (docs/specs/U51-subscriptions.md; chunk plan .reports/U51/claimcheck-chunks.md).
//
//   PROBE_FEATURE=U51 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U51/K3/k3.js
//   PHASES=seed,pages,… narrows. State in .reports/U51/ccK3/k3-state-<app>.json: the seed runs once per state
//   file and the buying phases mutate it, so delete the state file to drive a later build afresh. A full run
//   outlasts the Bash tool's 600 s cap: run it detached (patterns.md "Probe kit").
//
// OJS scratch journals (tag prefix u51k3), each through `POST scenarios/context`, the "Subscription Block" placed
// on all but X:
//   F  subscriptions required, payments OFF, contact + information; types K3 Individual, K3 Institutional;
//      rd (no subscription), sb (active), am (awaiting manual payment), iu (institutional, needs approval).
//   O  OPEN ACCESS, payments set up, no contact; K3 Individual, K3 Hidden, K3 Institutional; rd, sb (active).
//   X  NOT ONLINE, payments set up, contact; K3 Individual, K3 Institutional; mg, rd. No block.
//   N  subscriptions, payments set up, contact, NO type; rd.
//   Q  subscriptions, "Manual Fee Payment" with NO instructions; K3 Individual; mg, rd.
//   D  subscriptions, payments NOT ENABLED (instructions saved); K3 Individual; rd.
//   P  the main one: subscriptions, payments set up, full contact + information; types K3 Individual (desc),
//      K3 Hidden, K3 Member (membership), K3 Forever (non-expiring, Print and Online), K3 Institutional (desc),
//      K3 Inst Hidden; mg, sm (Subscription Manager), rd (buys K3 Member), rd2 (buys K3 Individual), ib (buys
//      institutional twice), ac active, ne non-expiring, ao awaiting online, am awaiting manual, na needs
//      approval, ni needs information, ot other, ex expired, fu start to come, mb member (M-42), iu three
//      institutional (needs approval / active / awaiting manual). Issue 1/1/2026 with article R (PDF).
//   I  subscriptions, payments set up, an institution at 127.0.0.1 with an active institutional subscription;
//      owner, rd, sb (active individual), ap (individual awaiting manual payment). Article R (PDF).
//   E  subscriptions, payments set up + "Purchase Article" 5; mg, rd. Article R (PDF). A6 / td26.
//   G  (seeded by the ifee phase) subscriptions, payments set up + "Purchase Issue" 20, a "Full Issue" PDF. A6's issue end.
// OMP, OPS: read-only controls on publicknowledge (the reader addresses, the Appearance "Sidebar" list).
// Database reads (psql SELECT) are evidence only. No assertions.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, users} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'pages', 'nav', 'buy', 'status', 'inst', 'block', 'fee', 'mail', 'xfeat', 'extra', 'pol', 'ifee', 'absence'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k3]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k3-state-${app.name}.json`);

function psql(sql) {
    try {
        return execFileSync('psql', [dbName('ojs'), '-At', '-F', '|', '-c', sql], {encoding: 'utf8'}).trim();
    } catch (e) {
        return `psql error: ${flat(e.message, 200)}`;
    }
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 2));
    const fact = (k, v) => { record('k3-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };

    // ------------------------------------------------------------------ seed (OJS)
    if (on('seed') && isOJS && !S.seeded) {
        const t = tag('u51k3');
        S.t = t; S.C = {}; S.s = {};
        const U = (p, k, role = 'reader') => ({username: `${p}${k}`, roles: [role], givenName: k.toUpperCase(), familyName: `Kthree${k}`});
        const base = (p, name) => ({name: `U51 K3 ${name}`, acronym: 'KTHREE', contactName: 'K3 Principal', contactEmail: `${p}pc@mail.test`});
        const PAY = {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Send a cheque to the K3 desk.'};
        const CONTACT = (p) => ({subscriptionName: 'K3 Subscriptions Desk', subscriptionEmail: `${p}desk@mail.test`, subscriptionPhone: '+1 555 0100',
            subscriptionMailingAddress: '1 Desk Road\nTide City', subscriptionAdditionalInformation: '<p>K3 information for readers.</p>'});
        const T_IND = {name: 'K3 Individual', cost: 10, currency: 'USD', duration: 12, description: '<p>One reader, one year.</p>'};
        const T_HID = {name: 'K3 Hidden', cost: 5, currency: 'USD', duration: 12, hidden: true};
        const T_MEM = {name: 'K3 Member', cost: 7, currency: 'USD', duration: 12, membership: true};
        const T_FOR = {name: 'K3 Forever', cost: 50, currency: 'USD', format: 'printOnline'};
        const T_INS = {name: 'K3 Institutional', cost: 100, currency: 'USD', duration: 12, institutional: true, description: '<p>A campus, a year.</p>'};
        const T_IHID = {name: 'K3 Inst Hidden', cost: 90, currency: 'USD', duration: 12, institutional: true, hidden: true};
        const PDF = {label: 'PDF', file: 'article.pdf'};
        const ISSUE = [{volume: 1, number: 1, year: 2026, published: true}];
        const mk = async (key, spec) => {
            const p = `${t}${key.toLowerCase()}`;
            try {
                const r = await app.api.createContext({tag: p, ...spec(p)});
                S.C[key] = {path: r.path || p, p, issues: r.issues || [], users: r.users || [], subs: r.subscriptions || [], types: r.subscriptionTypes || []};
                log('seed ctx', key, S.C[key].path);
            } catch (e) { log('seed ctx FAILED', key, String(e.message).slice(0, 900)); S.C[key] = {error: String(e.message).slice(0, 900)}; }
            save();
            return S.C[key];
        };
        const art = async (key) => {
            const C = S.C[key];
            if (!C || C.error) return;
            const title = `K3 R ${key} ${t}`;
            try {
                const r = await app.api.createSubmission({tag: `${t}${key.toLowerCase()}r`, context: C.path, submitter: `${C.p}au`, title,
                    published: true, issue: {volume: 1, number: 1, year: 2026}, galleys: [PDF]});
                S.s[key] = {id: r.submissionId, pub: r.publicationId, title};
            } catch (e) { log('seed sub FAILED', key, String(e.message).slice(0, 700)); S.s[key] = {error: String(e.message).slice(0, 700)}; }
            save();
        };
        const block = {sidebar: ['subscriptionblockplugin']};

        await mk('F', (p) => ({context: base(p, 'payments off'), publishingMode: 'subscription', ...block, ...CONTACT(p),
            users: [U(p, 'mg', 'manager'), U(p, 'rd'), U(p, 'sb'), U(p, 'am'), U(p, 'iu')],
            institutions: [{name: 'K3 Uni F', ipRanges: ['10.9.9.9']}],
            subscriptionTypes: [T_IND, T_INS],
            subscriptions: [{user: `${p}sb`, type: 'K3 Individual'}, {user: `${p}am`, type: 'K3 Individual', status: 'awaitingManualPayment'},
                {user: `${p}iu`, type: 'K3 Institutional', institution: 'K3 Uni F', status: 'needsApproval'}]}));
        await mk('O', (p) => ({context: base(p, 'open access'), publishingMode: 'open', ...block, payments: {...PAY},
            users: [U(p, 'mg', 'manager'), U(p, 'rd'), U(p, 'sb')],
            subscriptionTypes: [T_IND, T_HID, T_INS], subscriptions: [{user: `${p}sb`, type: 'K3 Individual'}]}));
        await mk('X', (p) => ({context: base(p, 'not online'), publishingMode: 'none', payments: {...PAY}, ...CONTACT(p),
            users: [U(p, 'mg', 'manager'), U(p, 'rd')], subscriptionTypes: [T_IND, T_INS]}));
        await mk('N', (p) => ({context: base(p, 'no type'), publishingMode: 'subscription', ...block, payments: {...PAY}, ...CONTACT(p),
            users: [U(p, 'rd')]}));
        await mk('Q', (p) => ({context: base(p, 'no instructions'), publishingMode: 'subscription', ...block,
            payments: {currency: 'USD', paymentPluginName: 'ManualPayment'}, ...CONTACT(p),
            users: [U(p, 'mg', 'manager'), U(p, 'rd')], subscriptionTypes: [T_IND]}));
        await mk('D', (p) => ({context: base(p, 'not enabled'), publishingMode: 'subscription', ...block, payments: {...PAY, enabled: false}, ...CONTACT(p),
            users: [U(p, 'rd')], subscriptionTypes: [T_IND]}));
        const pUsers = ['rd', 'rd2', 'ib', 'ac', 'ne', 'ao', 'am', 'na', 'ni', 'ot', 'ex', 'fu', 'mb', 'iu'];
        await mk('P', (p) => ({context: base(p, 'buying'), publishingMode: 'subscription', ...block, payments: {...PAY}, ...CONTACT(p),
            users: [U(p, 'mg', 'manager'), U(p, 'sm', 'subscriptionManager'), U(p, 'au', 'author'), ...pUsers.map((k) => U(p, k))],
            institutions: [{name: 'K3 Uni A', ipRanges: ['10.9.9.1']}, {name: 'K3 Uni B', ipRanges: ['10.9.9.2']}, {name: 'K3 Uni C', ipRanges: ['10.9.9.3']}],
            subscriptionTypes: [T_IND, T_HID, T_MEM, T_FOR, T_INS, T_IHID],
            subscriptions: [
                {user: `${p}ac`, type: 'K3 Individual'},
                {user: `${p}ne`, type: 'K3 Forever'},
                {user: `${p}ao`, type: 'K3 Individual', status: 'awaitingOnlinePayment'},
                {user: `${p}am`, type: 'K3 Individual', status: 'awaitingManualPayment'},
                {user: `${p}na`, type: 'K3 Individual', status: 'needsApproval'},
                {user: `${p}ni`, type: 'K3 Individual', status: 'needsInformation'},
                {user: `${p}ot`, type: 'K3 Individual', status: 'other'},
                {user: `${p}ex`, type: 'K3 Individual', dateStart: '2025-06-01', dateEnd: '2026-06-01'},
                {user: `${p}fu`, type: 'K3 Individual', dateStart: '2026-12-01', dateEnd: '2027-12-01'},
                {user: `${p}mb`, type: 'K3 Member', membership: 'M-42'},
                {user: `${p}iu`, type: 'K3 Institutional', institution: 'K3 Uni A', status: 'needsApproval'},
                {user: `${p}iu`, type: 'K3 Institutional', institution: 'K3 Uni B'},
                {user: `${p}iu`, type: 'K3 Institutional', institution: 'K3 Uni C', status: 'awaitingManualPayment'},
            ],
            issues: ISSUE}));
        await art('P');
        await mk('I', (p) => ({context: base(p, 'institution'), publishingMode: 'subscription', ...block, payments: {...PAY}, ...CONTACT(p),
            users: [U(p, 'owner'), U(p, 'rd'), U(p, 'sb'), U(p, 'ap'), U(p, 'au', 'author')],
            institutions: [{name: 'K3 Campus', ipRanges: ['127.0.0.1']}],
            subscriptionTypes: [T_IND, T_INS],
            subscriptions: [{user: `${p}owner`, type: 'K3 Institutional', institution: 'K3 Campus'}, {user: `${p}sb`, type: 'K3 Individual'},
                {user: `${p}ap`, type: 'K3 Individual', status: 'awaitingManualPayment'}],
            issues: ISSUE}));
        await art('I');
        await mk('E', (p) => ({context: base(p, 'article fee'), publishingMode: 'subscription', ...block, payments: {...PAY, purchaseArticleFee: 5}, ...CONTACT(p),
            users: [U(p, 'mg', 'manager'), U(p, 'rd'), U(p, 'au', 'author')], subscriptionTypes: [T_IND], issues: ISSUE}));
        await art('E');
        S.seeded = true;
        save();
    }
    if (isOJS && !S.seeded) { log('not seeded'); return; }

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: page.url()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    let who = 'visitor';

    async function snap(name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 300)}; }
        Object.assign(s, extra, {who});
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        log(`--- ${name}`);
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            fact(`${name}.FAILED`, flat(e.stack || e.message, 1500));
            await snap(`zz-failed-${name}`).catch(() => {});
            return null;
        }
    }
    const C = S.C || {};
    const P = (key) => C[key] && !C[key].error && C[key].path;
    const u = (key, k) => `${C[key].p}${k}`;
    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const as = async (user, ctx) => {
        await signIn(page, user, {contextPath: ctx}).catch((e) => log('signIn slow', user, flat(e.message, 120)));
        await idle(page).catch(() => {});
        who = user;
    };
    const visitor = async () => { await signOut(page).catch(() => {}); who = 'visitor'; };

    /** The reader page as data (the frontend has no main landmark). */
    async function facts() {
        return page.evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            const main = document.querySelector('.pkp_structure_main') || document.body;
            const blk = document.querySelector('.pkp_structure_sidebar .block_subscription');
            const forms = [...main.querySelectorAll('form')].filter(vis).map((f) => ({
                id: f.id, action: (f.getAttribute('action') || '').replace(location.origin, ''),
                legends: [...f.querySelectorAll('legend')].map((l) => t(l.innerText)),
                errors: t((f.querySelector('#formErrors, .pkp_form_error, .cmp_notification') || {}).innerText) || null,
                fields: [...f.querySelectorAll('input:not([type=hidden]), select, textarea')].map((el) => ({
                    name: el.name, tag: el.tagName.toLowerCase(), required: el.required,
                    label: t((el.closest('label') && el.closest('label').querySelector('.label') || el.closest('label') || {}).innerText),
                    value: el.tagName === 'SELECT' ? t(el.options[el.selectedIndex] && el.options[el.selectedIndex].text) : el.value,
                    options: el.tagName === 'SELECT' ? [...el.options].map((o) => t(o.text)) : undefined,
                    help: t((document.getElementById(el.getAttribute('aria-describedby') || '') || {}).innerText) || undefined,
                })),
                buttons: [...f.querySelectorAll('button, a.cmp_button_link, a.cmp_button')].filter(vis).map((b) => ({text: t(b.innerText), href: b.getAttribute('href')})),
            }));
            return {
                url: location.pathname + location.search,
                title: document.title,
                bodyClass: document.body.className,
                breadcrumb: t((main.querySelector('.cmp_breadcrumbs') || {}).innerText) || null,
                h1: [...main.querySelectorAll('h1')].filter(vis).map((e) => t(e.innerText)),
                heads: [...main.querySelectorAll('h2, h3')].filter(vis).map((e) => t(e.innerText)),
                paras: [...main.querySelectorAll('p')].filter(vis).map((e) => t(e.innerText)).filter(Boolean).slice(0, 30),
                tables: [...main.querySelectorAll('table')].filter(vis).map((tb) => [...tb.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => t(c.innerText)))),
                links: [...main.querySelectorAll('a')].filter(vis).map((a) => ({text: t(a.innerText), href: (a.getAttribute('href') || '').replace(location.origin, '')})).filter((l) => l.text),
                contact: t((main.querySelector('.cmp_subscription_contact') || {}).innerText) || null,
                contactParts: main.querySelector('.cmp_subscription_contact') ? [...main.querySelectorAll('.cmp_subscription_contact > div, .cmp_subscription_contact .contact > *')].map((d) => ({cls: d.className, text: t(d.innerText), href: d.querySelector('a') ? d.querySelector('a').getAttribute('href') : undefined})) : null,
                forms,
                notices: [...document.querySelectorAll('.cmp_notification, .pkp_notification, [role=alert], #formErrors')].filter(vis).map((e) => t(e.innerText)).filter(Boolean),
                block: blk ? {text: t(blk.innerText), lines: [...blk.querySelectorAll('h2, p')].map((e) => ({cls: e.className, text: t(e.innerText)})), links: [...blk.querySelectorAll('a')].map((a) => ({text: t(a.innerText), href: a.getAttribute('href')}))} : null,
                blocks: [...document.querySelectorAll('.pkp_structure_sidebar .pkp_block')].map((b) => t((b.querySelector('.title') || b).innerText).slice(0, 60)),
                nav: [...document.querySelectorAll('#navigationPrimary a')].map((a) => t(a.innerText)).filter(Boolean),
                userNav: [...document.querySelectorAll('#navigationUser a')].map((a) => t(a.innerText)).filter(Boolean),
                galleys: [...document.querySelectorAll('a.obj_galley_link')].filter(vis).map((a) => ({text: t(a.innerText), cls: a.className})),
                galleyView: !!document.querySelector('header.header_view'),
                loginForm: !!document.querySelector('form.cmp_form.login'),
                text: t(main.innerText).slice(0, 2500),
            };
        }).catch((e) => ({err: flat(e.message, 200)}));
    }
    function chainWatch() {
        const chain = [];
        const onResp = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${r.request().method()} ${r.url().replace(app.baseURL, '')}`); } catch (e) { /* none */ } };
        page.on('response', onResp);
        return {chain, stop: () => page.off('response', onResp)};
    }
    const isHome = (f, ctx) => !!f && new RegExp(`/index\\.php/${ctx}(/index)?/?$`).test(f.url || '');
    /** Land on a typed address; the screen first, then the facts. */
    async function land(p, name, extra = {}) {
        const w = chainWatch();
        const d0 = dialogs.length;
        await page.goto(p.startsWith('http') ? p : app.url(p)).catch((e) => w.chain.push(`goto error ${flat(e.message, 120)}`));
        await idle(page).catch(() => {});
        w.stop();
        await snap(name, extra);
        const f = await facts();
        f.chain = w.chain; f.dialogs = dialogs.slice(d0);
        record(name, {facts: f}, {merge: true});
        return f;
    }
    /** Press something that navigates (a link, a submit button); the screen first, then the facts. */
    async function press(locator, name, extra = {}) {
        const w = chainWatch();
        const d0 = dialogs.length;
        const n = await locator.count().catch(() => 0);
        if (!n) { w.stop(); const f = {missing: true}; record(name, {facts: f, ...extra}); return f; }
        const info = await locator.first().evaluate((e) => ({text: e.innerText.replace(/\s+/g, ' ').trim(), href: e.getAttribute('href')})).catch(() => null);
        const navP = page.waitForNavigation({timeout: 15_000, waitUntil: 'load'}).catch(() => null);
        await locator.first().click().catch((e) => w.chain.push(`click error ${flat(e.message, 100)}`));
        await navP;
        await idle(page).catch(() => {});
        await sleep(200);
        w.stop();
        await snap(name, extra);
        const f = await facts();
        f.chain = w.chain; f.pressed = info; f.dialogs = dialogs.slice(d0);
        record(name, {facts: f}, {merge: true});
        return f;
    }
    const brief = (f) => f && ({url: f.url, chain: f.chain, title: f.title, h1: f.h1, heads: f.heads, tables: f.tables, notices: f.notices && f.notices.length ? f.notices : undefined,
        forms: f.forms && f.forms.length ? f.forms : undefined, block: f.block, galleyView: f.galleyView, login: f.loginForm, dialogs: f.dialogs && f.dialogs.length ? f.dialogs : undefined});
    const mainLink = (text) => page.locator('.pkp_structure_main a').filter({hasText: text});
    const W = () => page.locator('[role="dialog"]:visible').last();

    // ---- manager screens (the "Payments" page; legacy grids) — K1's helpers
    async function paymentsTab(ctx, name) {
        await page.goto(cUrl(ctx, '/payments')); await idle(page);
        if (name) { await page.getByRole('tab', {name, exact: true}).click(); await idle(page); await sleep(300); }
        const panel = page.getByRole('tabpanel', {name: name || 'Individual Subscriptions'});
        await panel.locator('table, form').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(300);
        return panel;
    }
    async function readGrid(scope) {
        return scope.evaluate((root) => [...root.querySelectorAll('table')].filter((t) => t.getClientRects().length).map((t) => ({
            columns: [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
            rows: [...t.querySelectorAll('tbody tr')].filter((tr) => tr.getClientRects().length && !tr.classList.contains('row_controls') && !/control-row/.test(tr.id))
                .map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()).join(' | ')),
        }))).catch((e) => [{err: String(e.message).slice(0, 200)}]);
    }
    const gridRow = (scope, re) => scope.locator('tr.gridRow').filter({hasText: re}).first();
    async function rowActions(row) {
        const id = await row.getAttribute('id');
        const arrow = row.locator('a.show_extras').first();
        if (await arrow.count()) { await arrow.click(); await sleep(400); }
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const links = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim())).catch(() => []);
        return {id, links, ctl};
    }
    async function notices() {
        return page.evaluate(() => [...document.querySelectorAll('.pkp_notification, [role="alert"], [role="status"], .pkp_form_error, label.error, #formErrors')]
            .filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
    }
    async function collectNotices(ms = 5000) {
        const seen = new Set();
        const end = Date.now() + ms;
        while (Date.now() < end) { for (const x of await notices()) seen.add(x); await sleep(150); }
        return [...seen];
    }
    async function closeWindow() {
        const w = W();
        if (!(await w.count())) return;
        const c = w.getByRole('button', {name: 'Close', exact: true}).first();
        if (await c.count()) await c.click().catch(() => {}); else await page.keyboard.press('Escape');
        await sleep(700);
        const yes = page.locator('[role="dialog"]:visible').filter({hasText: /changed|unsaved/i}).getByRole('button', {name: /^(Yes|OK)$/});
        if (await yes.count()) { await yes.first().click().catch(() => {}); await sleep(500); }
        await idle(page).catch(() => {});
    }
    async function setDate(w, which, value) {
        const box = w.locator(`[name="${which}-removed"]`).first();
        if (await box.count()) { await box.fill(value); await page.keyboard.press('Escape').catch(() => {}); }
        else await w.locator(`[name="${which}"]`).first().fill(value);
        await sleep(150);
    }
    /** Edit a subscription row in the grid and save; spec {status, start, end, notify}. */
    async function editSub(ctx, tabName, rowRe, spec, name) {
        const panel = await paymentsTab(ctx, tabName);
        const ra = await rowActions(gridRow(panel, rowRe));
        await ra.ctl.getByRole('link', {name: 'Edit', exact: true}).click();
        const w = W();
        await w.locator('form').first().waitFor({timeout: T}); await idle(page); await sleep(900);
        if (spec.status) await w.locator('[name="status"]').selectOption({label: spec.status});
        if (spec.start !== undefined) await setDate(w, 'dateStart', spec.start);
        if (spec.end !== undefined) await setDate(w, 'dateEnd', spec.end);
        if (spec.notify) await w.locator('[name="notifyEmail"]').check();
        await w.getByRole('button', {name: 'Save'}).first().click();
        const seen = await collectNotices(4500);
        await idle(page).catch(() => {});
        const open = await W().count() > 0 && await W().locator('form').count() > 0;
        const r = {rowLinks: ra.links, windowOpen: open, notices: seen, windowText: open ? flat(await W().innerText().catch(() => ''), 1200) : null};
        await snap(name, {save: r});
        if (open) await closeWindow();
        return r;
    }
    const today = new Date().toISOString().slice(0, 10);
    const inAYear = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); })();
    const dbSub = (ctxKey, username) => psql(`select s.status, s.date_start, s.date_end, s.membership, st.type_id from subscriptions s join users us on us.user_id=s.user_id join subscription_types st on st.type_id=s.type_id join journals j on j.journal_id=s.journal_id where j.path='${C[ctxKey].path}' and us.username='${username}' order by s.subscription_id`);

    try {
        // ================================================================== pages: Rules 26, 27 (the gates), 32 (home-page ends), Settings 4, 12
        if (isOJS && on('pages')) await sect('pages', async () => {
            const out = {};
            // Rule 26 across the payment axis (signed out) and the publishing-mode axis
            for (const key of ['F', 'Q', 'D', 'P', 'O', 'X', 'N']) {
                if (!P(key)) continue;
                await visitor();
                const f = await land(`/index.php/${P(key)}/about/subscriptions`, `pg-${key}-visitor-01-subscriptions`);
                out[`${key}.visitor.subscriptions`] = {home: isHome(f, P(key)), ...brief(f), contact: f.contact, contactParts: f.contactParts, paras: f.paras, links: f.links};
            }
            // signed in: the purchase links, My Subscriptions, the purchase addresses
            for (const key of ['F', 'Q', 'D', 'O', 'X', 'N']) {
                if (!P(key)) continue;
                await as(u(key, 'rd'), P(key));
                const o = {};
                let f = await land(`/index.php/${P(key)}/about/subscriptions`, `pg-${key}-rd-02-subscriptions`);
                o.subscriptions = {home: isHome(f, P(key)), h1: f.h1, links: f.links};
                f = await land(`/index.php/${P(key)}/user/subscriptions`, `pg-${key}-rd-03-my-subscriptions`);
                o.mySubscriptions = {home: isHome(f, P(key)), ...brief(f), paras: f.paras, links: f.links, contact: f.contact};
                if (key === 'F' && !o.mySubscriptions.home) {
                    // the sweep: what "View Available Subscription Types" does while payments are off
                    const v = await press(mainLink('View Available Subscription Types'), `pg-F-rd-03b-view-types`);
                    o.viewTypes = {home: isHome(v, P(key)), url: v.url, chain: v.chain};
                }
                for (const kind of ['individual', 'institutional']) {
                    f = await land(`/index.php/${P(key)}/user/purchaseSubscription/${kind}`, `pg-${key}-rd-04-purchase-${kind}`);
                    o[`purchase.${kind}`] = {home: isHome(f, P(key)), url: f.url, chain: f.chain, h1: f.h1};
                }
                if (key === 'O') {
                    await land(`/index.php/${P(key)}/about/subscriptions`, `pg-O-rd-05-subscriptions`);
                    const pr = await press(mainLink('Purchase New Subscription'), `pg-O-rd-06-press-purchase`);
                    o.pressPurchase = {home: isHome(pr, P(key)), url: pr.url, chain: pr.chain};
                }
                out[`${key}.rd`] = o;
            }
            // payments off: the subscriber and the awaiting ones on My Subscriptions (Rule 27 statuses without payments)
            for (const k of ['sb', 'am', 'iu']) {
                await as(u('F', k), P('F'));
                const f = await land(`/index.php/${P('F')}/user/subscriptions`, `pg-F-${k}-07-my-subscriptions`);
                out[`F.${k}.mySubscriptions`] = {home: isHome(f, P('F')), tables: f.tables, heads: f.heads, links: f.links};
            }
            // signed out: My Subscriptions and the purchase addresses on a journal with payments off (Rules 27, 32)
            await visitor();
            for (const [key, p2] of [['F', 'user/subscriptions'], ['F', 'user/purchaseSubscription/individual'], ['F', 'user/purchaseSubscription/institutional'],
                ['O', 'user/purchaseSubscription/individual'], ['P', 'user/subscriptions']]) {
                if (!P(key)) continue;
                const f = await land(`/index.php/${P(key)}/${p2}`, `pg-${key}-visitor-08-${p2.replace(/\//g, '-')}`);
                out[`${key}.visitor.${p2}`] = {home: isHome(f, P(key)), url: f.url, chain: f.chain, h1: f.h1, login: f.loginForm, text: flat(f.text, 400)};
            }
            fact('pages', out);
        });

        // ================================================================== nav: the header's "Subscriptions" / "My Subscriptions" (Rule 26; U08 Settings 6)
        if (isOJS && on('nav')) await sect('nav', async () => {
            const H = require('../../U08/K2/lib');
            const out = {};
            for (const key of ['F', 'P', 'O']) {
                if (!P(key)) continue;
                await as(u(key, 'mg'), P(key));
                const o = {};
                try {
                    await H.openNav(page, app, P(key));
                    o.addSubs = await H.addItem(page, 'Subscriptions', 'Subscriptions');
                    o.addMySubs = await H.addItem(page, 'My Subscriptions', 'My Subscriptions');
                    await H.openNav(page, app, P(key));
                    await H.openMenu(page, 'Primary Navigation Menu');
                    o.a1 = await H.assignTop(page, 'Subscriptions');
                    o.a2 = await H.assignTop(page, 'My Subscriptions');
                    o.arranged = H.brief(await H.panels(page));
                    o.saved = await H.saveMenu(page);
                } catch (e) { o.err = flat(e.message, 400); }
                await snap(`nv-${key}-01-menu-saved`);
                for (const k of ['visitor', 'rd']) {
                    if (k === 'visitor') await visitor(); else await as(u(key, 'rd'), P(key));
                    const h = await H.header(page, app, P(key));
                    await snap(`nv-${key}-${k}-02-header`);
                    o[k] = H.hflat(h);
                    o[`${k}.hrefs`] = (h.servedHrefs || []).filter((x) => /Subscriptions/.test(x.text));
                }
                out[key] = o;
            }
            fact('nav', out);
        });

        // ================================================================== buy: Rules 26 (fields), 28, 29, 30, 31, 32 (signed out), A9–A12
        if (isOJS && on('buy') && P('P')) await sect('buy', async () => {
            const ctx = P('P');
            const out = S.buy || {};
            // Rule 26 fields: signed out and signed in (td27)
            await visitor();
            let f = await land(`/index.php/${ctx}/about/subscriptions`, 'by-01-visitor-subscriptions');
            out.pageVisitor = {...brief(f), breadcrumb: f.breadcrumb, contact: f.contact, contactParts: f.contactParts, paras: f.paras, links: f.links};
            // Rule 32 / A12: the purchase addresses signed out (td19)
            for (const kind of ['individual', 'institutional']) {
                f = await land(`/index.php/${ctx}/user/purchaseSubscription/${kind}`, `by-02-visitor-purchase-${kind}`);
                out[`visitorPurchase.${kind}`] = {url: f.url, chain: f.chain, title: f.title, h1: f.h1, login: f.loginForm, home: isHome(f, ctx), text: flat(f.text, 600)};
            }
            // rd: the signed-in page, the individual purchase (td16, A9), the manual page (Rule 30)
            await as(u('P', 'rd'), ctx);
            f = await land(`/index.php/${ctx}/about/subscriptions`, 'by-03-rd-subscriptions');
            out.pageReader = {links: f.links, tables: f.tables, block: f.block};
            f = await land(`/index.php/${ctx}/user/subscriptions`, 'by-04-rd-my-subscriptions');
            out.myBefore = {...brief(f), paras: f.paras, links: f.links, contact: f.contact};
            f = await press(page.locator('.pkp_structure_main .my_subscription_individual a').filter({hasText: 'Purchase New Subscription'}), 'by-05-rd-purchase-individual');
            out.indPage = {url: f.url, title: f.title, h1: f.h1, heads: f.heads, breadcrumb: f.breadcrumb, forms: f.forms, text: flat(f.text, 800)};
            await loc(page, 'Purchase Individual Subscription: the type list', page.locator('form#subscriptionForm select[name="typeId"]'));
            await loc(page, 'Purchase Individual Subscription: Save', page.locator('form#subscriptionForm button.submit'));
            // leave once with something typed (the sweep)
            await page.locator('form#subscriptionForm input[name="membership"]').fill('unsaved');
            await page.locator('form#subscriptionForm input[name="membership"]').blur();
            f = await press(page.locator('.pkp_site_name a, .pkp_site_name_wrapper a').first(), 'by-05b-rd-leave-with-typing');
            out.leaveTyped = {url: f.url, dialogs: f.dialogs, home: isHome(f, ctx)};
            // Save with K3 Member and no membership (A9)
            await land(`/index.php/${ctx}/user/purchaseSubscription/individual`, 'by-06-rd-purchase-again');
            const memberOpt = (await page.locator('form#subscriptionForm select[name="typeId"] option').allInnerTexts()).find((o) => o.startsWith('K3 Member'));
            await page.locator('form#subscriptionForm select[name="typeId"]').selectOption({label: memberOpt});
            f = await press(page.locator('form#subscriptionForm button.submit'), 'by-07-rd-save-no-membership');
            out.saveNoMembership = {url: f.url, chain: f.chain, title: f.title, notices: f.notices, forms: f.forms, text: flat(f.text, 600)};
            out.dbAfterNoMembership = dbSub('P', u('P', 'rd'));
            // ACME: the manual page
            await page.locator('form#subscriptionForm select[name="typeId"]').selectOption({label: memberOpt}).catch(() => {});
            await page.locator('form#subscriptionForm input[name="membership"]').fill('ACME');
            f = await press(page.locator('form#subscriptionForm button.submit'), 'by-08-rd-save-acme');
            out.paymentPage = {url: f.url, chain: f.chain, title: f.title, h1: f.h1, tables: f.tables, paras: f.paras, links: f.links};
            await loc(page, 'Manual Fee Payment: Send notification of payment', page.getByRole('link', {name: 'Send notification of payment'}));
            out.dbAfterAcme = dbSub('P', u('P', 'rd'));
            f = await land(`/index.php/${ctx}/user/subscriptions`, 'by-09-rd-my-subscriptions-after');
            out.myAfter = {tables: f.tables, links: f.links, block: f.block};
            // "Send notification of payment" from a fresh payment page: the payment stays unrecorded (Rule 30)
            f = await land(`/index.php/${ctx}/user/purchaseSubscription/individual`, 'by-10-rd-purchase-address-with-one');
            out.purchaseWithOne = {home: isHome(f, ctx), url: f.url, chain: f.chain};
            // rd2: a plain K3 Individual, then "Send notification of payment"
            await as(u('P', 'rd2'), ctx);
            await land(`/index.php/${ctx}/about/subscriptions`, 'by-11-rd2-subscriptions');
            f = await press(page.locator('.pkp_structure_main .subscriptions_individual_purchase a'), 'by-12-rd2-purchase-from-subscriptions-page');
            out.rd2Page = {url: f.url, forms: f.forms};
            f = await press(page.locator('form#subscriptionForm button.submit'), 'by-13-rd2-save');
            out.rd2Payment = {url: f.url, title: f.title, h1: f.h1, tables: f.tables, paras: f.paras};
            f = await press(page.getByRole('link', {name: 'Send notification of payment'}), 'by-14-rd2-notify');
            out.rd2Notify = {url: f.url, chain: f.chain, title: f.title, h1: f.h1, paras: f.paras, text: flat(f.text, 500)};
            f = await land(`/index.php/${ctx}/user/subscriptions`, 'by-15-rd2-my-subscriptions');
            out.rd2My = {tables: f.tables};
            out.dbRd2 = dbSub('P', u('P', 'rd2'));
            try {
                const m = await app.mail.find({to: `${C.P.p}pc@mail.test`, timeoutMs: 15000});
                out.notifyMail = {subject: m.Subject, from: m.From, to: (m.To || []).map((x) => x.Address)};
            } catch (e) { out.notifyMail = flat(e.message, 200); }
            // Rule 30 positive end: a Subscription Manager edits rd2 to Active with its dates
            await as(u('P', 'sm'), ctx);
            let panel = await paymentsTab(ctx, 'Individual Subscriptions');
            out.gridBefore = await readGrid(panel);
            await snap('by-16-sm-individual-list');
            out.smEdit = await editSub(ctx, 'Individual Subscriptions', /Kthreerd2\b|RD2/, {status: 'Active', start: today, end: inAYear}, 'by-17-sm-edit-rd2-active');
            panel = await paymentsTab(ctx, 'Individual Subscriptions');
            out.gridAfter = await readGrid(panel);
            out.dbRd2After = dbSub('P', u('P', 'rd2'));
            await as(u('P', 'rd2'), ctx);
            f = await land(`/index.php/${ctx}/user/subscriptions`, 'by-18-rd2-my-subscriptions-active');
            out.rd2MyActive = {tables: f.tables, block: f.block};
            f = await land(`/index.php/${ctx}/article/view/${S.s.P.id}`, 'by-19-rd2-article');
            f = await press(page.locator('.item.galleys a.obj_galley_link').first(), 'by-20-rd2-pdf');
            out.rd2Pdf = {url: f.url, chain: f.chain, galleyView: f.galleyView, title: f.title};

            // ib: the institutional purchase (td17, A11)
            await as(u('P', 'ib'), ctx);
            f = await land(`/index.php/${ctx}/user/subscriptions`, 'by-21-ib-my-subscriptions');
            out.ibMy = {heads: f.heads, paras: f.paras, links: f.links};
            f = await press(page.locator('.pkp_structure_main .my_subscriptions_institutional a').filter({hasText: 'Purchase New Subscription'}), 'by-22-ib-purchase-institutional');
            out.instPage = {url: f.url, title: f.title, h1: f.h1, forms: f.forms, text: flat(f.text, 1500)};
            for (const [sel, d] of [['select[name="typeId"]', 'type list'], ['input[name="institutionName"]', 'Institution name'], ['textarea[name="ipRanges"]', 'IP ranges'], ['input[name="domain"]', 'Domain'], ['button.submit', 'Continue']]) {
                await loc(page, `Purchase Institutional Subscription: ${d}`, page.locator(`form#subscriptionForm ${sel}`));
            }
            await loc(page, 'Purchase Institutional Subscription: Cancel', page.locator('form#subscriptionForm').getByRole('link', {name: 'Cancel'}));
            const cont = () => page.locator('form#subscriptionForm button.submit');
            const refuse = async (name, fill) => {
                await land(`/index.php/${ctx}/user/purchaseSubscription/institutional`, `${name}-a`);
                await fill();
                const r = await press(cont(), name);
                return {url: r.url, notices: r.notices, errors: (r.forms || []).map((x) => x.errors), title: r.title};
            };
            out.contEmpty = await refuse('by-23-ib-continue-empty', async () => {});
            out.contNoName = await refuse('by-24-ib-continue-no-name', async () => { await page.locator('textarea[name="ipRanges"]').fill('127.0.0.1'); });
            out.contNoNet = await refuse('by-25-ib-continue-no-network', async () => { await page.locator('input[name="institutionName"]').fill('Tide University'); });
            out.contBadDomain = await refuse('by-26-ib-continue-bad-domain', async () => { await page.locator('input[name="institutionName"]').fill('Tide University'); await page.locator('input[name="domain"]').fill('not a domain'); });
            out.contBadIp = await refuse('by-27-ib-continue-bad-ip', async () => { await page.locator('input[name="institutionName"]').fill('Tide University'); await page.locator('textarea[name="ipRanges"]').fill('999.1.1.1'); });
            out.contRequiredAttr = await page.locator('form#subscriptionForm select[name="typeId"]').evaluate((e) => ({required: e.required, options: e.options.length, selected: e.value})).catch(() => null);
            // the ranges its help describes, one per line
            await land(`/index.php/${ctx}/user/purchaseSubscription/institutional`, 'by-28-ib-purchase-4-ranges');
            await page.locator('input[name="institutionName"]').fill('Tide University');
            await page.locator('textarea[name="ipRanges"]').fill('127.0.0.1\n142.58.103.1 - 142.58.103.4\n142.58.*.*\n142.58.100.0/24');
            f = await press(cont(), 'by-29-ib-continue-accepted');
            out.instAccepted = {url: f.url, title: f.title, h1: f.h1, tables: f.tables, notices: f.notices, text: flat(f.text, 500)};
            // the same name again
            await land(`/index.php/${ctx}/user/purchaseSubscription/institutional`, 'by-30-ib-purchase-again');
            await page.locator('input[name="institutionName"]').fill('Tide University');
            await page.locator('textarea[name="ipRanges"]').fill('127.0.0.1');
            f = await press(cont(), 'by-31-ib-continue-again');
            out.instAgain = {url: f.url, h1: f.h1, tables: f.tables};
            f = await land(`/index.php/${ctx}/user/subscriptions`, 'by-32-ib-my-subscriptions-after');
            out.ibMyAfter = {tables: f.tables, links: f.links};
            // Cancel with something typed (the sweep)
            await land(`/index.php/${ctx}/user/purchaseSubscription/institutional`, 'by-33-ib-cancel-a');
            await page.locator('input[name="institutionName"]').fill('Unsaved Uni');
            await page.locator('input[name="institutionName"]').blur();
            f = await press(page.locator('form#subscriptionForm').getByRole('link', {name: 'Cancel'}), 'by-34-ib-cancel');
            out.cancel = {url: f.url, h1: f.h1, dialogs: f.dialogs};
            out.dbIb = psql(`select s.status, s.date_start, s.date_end, i.institution_id, (select string_agg(ip_string, ',') from institution_ip ip where ip.institution_id=i.institution_id) from subscriptions s join institutional_subscriptions x on x.subscription_id=s.subscription_id join institutions i on i.institution_id=x.institution_id join users us on us.user_id=s.user_id where us.username='${u('P', 'ib')}'`);
            // the manager's view of the institutions (td17)
            await as(u('P', 'mg'), ctx);
            f = await land(`/index.php/${ctx}/management/settings/institutions`, 'by-35-mg-institutions');
            const instText = await page.locator('body').innerText().catch(() => '');
            out.institutionsPage = {url: f.url, tideRows: (instText.match(/Tide University/g) || []).length, text: flat(instText, 900)};
            out.dbTide = psql(`select count(*) from institution_settings s join institutions i on i.institution_id=s.institution_id join journals j on j.journal_id=i.context_id where j.path='${ctx}' and s.setting_name='name' and s.setting_value='Tide University'`);
            panel = await paymentsTab(ctx, 'Institutional Subscriptions');
            out.instGrid = await readGrid(panel);
            await snap('by-36-mg-institutional-list');
            // an institutional type asking for membership: the type window (Rule 29's membership refusal)
            panel = await paymentsTab(ctx, 'Subscription Types');
            await page.getByRole('link', {name: 'Create New Subscription Type', exact: true}).first().click();
            await W().locator('form').first().waitFor({timeout: T}).catch(() => {}); await idle(page); await sleep(700);
            await W().locator('input[name="membership"]').check().catch(() => {});
            await W().locator('input[name="institutional"][value="1"]').check().catch(() => {});
            out.instTypeMembership = await W().locator('input[name="membership"]').evaluate((e) => ({checked: e.checked, disabled: e.disabled})).catch((e) => flat(e.message, 100));
            await snap('by-37-mg-type-window-institutional-membership');
            await closeWindow();
            S.buy = out; save();
            fact('buy', out);
        });

        // ================================================================== status: Rule 27 statuses and Rule 31 buttons (td18, A10), Renew
        if (isOJS && on('status') && P('P')) await sect('status', async () => {
            const ctx = P('P');
            const out = {};
            await as(u('P', 'rd'), ctx);
            let f = await land(`/index.php/${ctx}/user/subscriptions`, 'st-00-rd-status-table');
            out.statusTable = {heads: f.heads, paras: f.paras, tables: f.tables};
            for (const k of ['ac', 'ne', 'ao', 'am', 'na', 'ni', 'ot', 'ex', 'fu', 'mb', 'iu']) {
                await as(u('P', k), ctx);
                f = await land(`/index.php/${ctx}/user/subscriptions`, `st-01-${k}-my-subscriptions`);
                out[k] = {tables: f.tables, links: f.links.filter((l) => /Purchase|Renew|View Available/.test(l.text)), block: f.block};
            }
            // Awaiting Online Payment: "Purchase"
            await as(u('P', 'ao'), ctx);
            await land(`/index.php/${ctx}/user/subscriptions`, 'st-02-ao-my');
            f = await press(page.locator('.my_subscription_individual a.cmp_button').filter({hasText: 'Purchase'}), 'st-03-ao-purchase');
            out.aoPurchase = {url: f.url, chain: f.chain, title: f.title, h1: f.h1, tables: f.tables};
            out.dbAo = dbSub('P', u('P', 'ao'));
            // Active non-expiring: only "Purchase"
            await as(u('P', 'ne'), ctx);
            await land(`/index.php/${ctx}/user/subscriptions`, 'st-04-ne-my');
            out.neButtons = await page.locator('.my_subscription_individual a.cmp_button').allInnerTexts();
            // Active: "Renew" first, then "Purchase" → "Save" (A10)
            await as(u('P', 'ac'), ctx);
            f = await land(`/index.php/${ctx}/article/view/${S.s.P.id}`, 'st-05-ac-article');
            f = await press(page.locator('.item.galleys a.obj_galley_link').first(), 'st-06-ac-pdf-before');
            out.acPdfBefore = {url: f.url, galleyView: f.galleyView, chain: f.chain};
            await land(`/index.php/${ctx}/user/subscriptions`, 'st-07-ac-my');
            out.acButtons = await page.locator('.my_subscription_individual a.cmp_button').allInnerTexts();
            f = await press(page.locator('.my_subscription_individual a.cmp_button').filter({hasText: 'Renew'}), 'st-08-ac-renew');
            out.acRenew = {url: f.url, chain: f.chain, title: f.title, h1: f.h1, tables: f.tables};
            out.dbAcAfterRenew = dbSub('P', u('P', 'ac'));
            await land(`/index.php/${ctx}/user/subscriptions`, 'st-09-ac-my-after-renew');
            f = await press(page.locator('.my_subscription_individual a.cmp_button').filter({hasText: /^\s*Purchase\s*$/}), 'st-10-ac-purchase');
            out.acPurchasePage = {url: f.url, title: f.title, forms: f.forms};
            f = await press(page.locator('form#subscriptionForm button.submit'), 'st-11-ac-purchase-save');
            out.acPurchaseSaved = {url: f.url, chain: f.chain, title: f.title, h1: f.h1, tables: f.tables, forms: f.forms};
            out.dbAcAfterPurchase = dbSub('P', u('P', 'ac'));
            f = await land(`/index.php/${ctx}/user/subscriptions`, 'st-12-ac-my-after-purchase');
            out.acMyAfter = {tables: f.tables, block: f.block};
            f = await land(`/index.php/${ctx}/article/view/${S.s.P.id}`, 'st-13-ac-article-after');
            f = await press(page.locator('.item.galleys a.obj_galley_link').first(), 'st-14-ac-pdf-after');
            out.acPdfAfter = {url: f.url, galleyView: f.galleyView, chain: f.chain, h1: f.h1};
            // iu: the institutional rows' buttons; "Purchase" on the active one (A11: changing an existing purchase)
            await as(u('P', 'iu'), ctx);
            await land(`/index.php/${ctx}/user/subscriptions`, 'st-15-iu-my');
            out.iuRows = await page.locator('.my_subscriptions_institutional tr').evaluateAll((trs) => trs.map((tr) => ({text: tr.innerText.replace(/\s+/g, ' ').trim(), buttons: [...tr.querySelectorAll('a.cmp_button')].map((a) => a.innerText.trim())})));
            f = await press(page.locator('.my_subscriptions_institutional tr').filter({hasText: 'K3 Uni B'}).locator('a.cmp_button').filter({hasText: /^\s*Purchase\s*$/}), 'st-16-iu-purchase-active');
            out.iuPurchasePage = {url: f.url, forms: f.forms};
            f = await press(page.locator('form#subscriptionForm button.submit'), 'st-17-iu-continue-as-arrived');
            out.iuContinueAsArrived = {url: f.url, title: f.title, h1: f.h1, notices: f.notices, forms: f.forms && f.forms.map((x) => ({errors: x.errors, fields: x.fields.filter((y) => /ipRanges|institutionName|domain/.test(y.name))}))};
            if (await page.locator('form#subscriptionForm textarea[name="ipRanges"]').count()) {
                await page.locator('form#subscriptionForm textarea[name="ipRanges"]').fill('10.9.9.2');
                f = await press(page.locator('form#subscriptionForm button.submit'), 'st-18-iu-continue-fixed');
                out.iuContinueFixed = {url: f.url, title: f.title, h1: f.h1, tables: f.tables, notices: f.notices};
            }
            out.dbUniB = psql(`select count(*) from institution_settings s join institutions i on i.institution_id=s.institution_id join journals j on j.journal_id=i.context_id where j.path='${ctx}' and s.setting_name='name' and s.setting_value='K3 Uni B'`);
            f = await land(`/index.php/${ctx}/user/subscriptions`, 'st-19-iu-my-after');
            out.iuAfter = {tables: f.tables};
            fact('status', out);
        });

        // ================================================================== block: Rule 33 (td20, A13), Settings 13
        if (isOJS && on('block')) await sect('block', async () => {
            const out = {};
            const readBlock = async (key, k, name) => {
                if (k === 'visitor') await visitor(); else await as(u(key, k), P(key));
                const f = await land(`/index.php/${P(key)}`, name);
                return {block: f.block, blocks: f.blocks};
            };
            for (const [key, k] of [['F', 'visitor'], ['F', 'rd'], ['F', 'sb'], ['F', 'am'], ['P', 'visitor'], ['P', 'rd'], ['P', 'rd2'], ['P', 'ac'], ['P', 'ne'], ['P', 'ex'], ['P', 'fu'], ['P', 'mb'], ['P', 'ao'], ['P', 'am'], ['P', 'ni'],
                ['I', 'visitor'], ['I', 'rd'], ['I', 'sb'], ['I', 'ap'], ['I', 'owner'], ['O', 'visitor'], ['O', 'sb'], ['N', 'rd'], ['X', 'rd']]) {
                if (!P(key)) continue;
                out[`${key}.${k}`] = await readBlock(key, k, `bl-${key}-${k}`);
            }
            // an inactive subscription (Needs Approval) whose block reads "Expires": can the reader open the PDF?
            await as(u('P', 'na'), P('P'));
            await land(`/index.php/${P('P')}/article/view/${S.s.P.id}`, 'bl-na-article');
            const naPdf = await press(page.locator('.item.galleys a.obj_galley_link').first(), 'bl-na-pdf');
            out.naPdf = {url: naPdf.url, chain: naPdf.chain, galleyView: naPdf.galleyView, h1: naPdf.h1, block: naPdf.block};
            // the block's links, pressed
            await as(u('P', 'rd2'), P('P'));
            await land(`/index.php/${P('P')}`, 'bl-press-00');
            let f = await press(page.locator('.block_subscription a').first(), 'bl-press-01-P-rd2-my-subscriptions');
            out.pressMy = {url: f.url, h1: f.h1};
            await as(u('F', 'rd'), P('F'));
            await land(`/index.php/${P('F')}`, 'bl-press-02');
            f = await press(page.locator('.block_subscription a').filter({hasText: 'Learn More'}), 'bl-press-03-F-rd-learn-more');
            out.pressLearnMoreOff = {url: f.url, home: isHome(f, P('F')), chain: f.chain};
            await as(u('N', 'rd'), P('N'));
            await land(`/index.php/${P('N')}`, 'bl-press-04');
            f = await press(page.locator('.block_subscription a').filter({hasText: 'Learn More'}), 'bl-press-05-N-rd-learn-more');
            out.pressLearnMoreOn = {url: f.url, h1: f.h1, chain: f.chain};
            // Settings 13: the Appearance "Sidebar" on a journal where nothing was placed (X)
            await as(u('X', 'mg'), P('X'));
            await page.goto(cUrl(P('X'), '/management/settings/website')); await idle(page);
            await page.locator('#appearance-button').click().catch(() => {}); await idle(page); await sleep(500);
            const sb = await page.evaluate(() => {
                const fs2 = [...document.querySelectorAll('fieldset, .pkpFormGroup')].find((x) => /Sidebar/.test(x.innerText));
                return fs2 ? [...fs2.querySelectorAll('input[type=checkbox]')].map((c) => ({label: (c.closest('label') || c.parentElement).innerText.trim(), checked: c.checked})) : null;
            }).catch(() => null);
            out.sidebarDefault = sb;
            await snap('bl-06-X-mg-appearance-setup');
            fact('block', out);
        });

        // ================================================================== fee: A6 / td26 (a bought article with the manual method)
        if (isOJS && on('fee') && P('E')) await sect('fee', async () => {
            const ctx = P('E');
            const out = {};
            await as(u('E', 'rd'), ctx);
            await land(`/index.php/${ctx}/article/view/${S.s.E.id}`, 'fe-01-rd-article');
            out.link = await page.locator('.item.galleys a.obj_galley_link').first().innerText().catch(() => null);
            let f = await press(page.locator('.item.galleys a.obj_galley_link').first(), 'fe-02-rd-pdf');
            out.payment = {url: f.url, title: f.title, h1: f.h1, tables: f.tables, paras: f.paras, links: f.links};
            f = await press(page.getByRole('link', {name: 'Send notification of payment'}), 'fe-03-rd-notify');
            out.notify = {url: f.url, chain: f.chain, title: f.title, h1: f.h1, paras: f.paras, text: flat(f.text, 500)};
            try {
                const m = await app.mail.find({to: `${C.E.p}pc@mail.test`, timeoutMs: 15000});
                out.notifyMail = {subject: m.Subject, from: m.From, to: (m.To || []).map((x) => x.Address)};
            } catch (e) { out.notifyMail = flat(e.message, 200); }
            // the manager looks through the "Payments" page
            await as(u('E', 'mg'), ctx);
            out.tabs = {};
            await paymentsTab(ctx);
            const tabNames = await page.getByRole('tab').allInnerTexts();
            out.tabNames = tabNames.map((x) => x.trim());
            for (const name of out.tabNames) {
                const panel = await paymentsTab(ctx, name);
                const txt = flat(await panel.innerText().catch(() => ''), 1200);
                out.tabs[name] = {text: txt, grids: await readGrid(panel), mentionsArticle: /Purchase Article|K3 R E/.test(txt)};
                await snap(`fe-04-mg-tab-${name.replace(/\W+/g, '-')}`);
            }
            out.dbCompleted = psql(`select count(*) from completed_payments cp join journals j on j.journal_id=cp.context_id where j.path='${ctx}'`);
            out.dbQueued = psql(`select count(*) from queued_payments`);
            // the reader again
            await as(u('E', 'rd'), ctx);
            await land(`/index.php/${ctx}/article/view/${S.s.E.id}`, 'fe-05-rd-article-again');
            f = await press(page.locator('.item.galleys a.obj_galley_link').first(), 'fe-06-rd-pdf-again');
            out.again = {url: f.url, h1: f.h1, tables: f.tables, galleyView: f.galleyView};
            fact('fee', out);
        });

        // ================================================================== mail: Settings 12 (the notification's sender), Side effects (silence)
        if (isOJS && on('mail')) await sect('mail', async () => {
            const out = {};
            const ctx = P('P');
            // the control: the Subscription Notification from the subscription contact (P)
            await as(u('P', 'mg'), ctx);
            out.editNotify = await editSub(ctx, 'Individual Subscriptions', /Kthreeni\b/, {notify: true}, 'ml-01-mg-edit-ni-notify');
            try {
                const m = await app.mail.find({to: `${u('P', 'ni')}@mail.test`, timeoutMs: 20000});
                out.control = {subject: m.Subject, from: m.From, replyTo: m.ReplyTo};
            } catch (e) { out.control = flat(e.message, 200); }
            // O has no subscription contact: the same save
            if (P('O')) {
                await as(u('O', 'mg'), P('O'));
                out.editNotifyNoContact = await editSub(P('O'), 'Individual Subscriptions', /Kthreesb\b/, {notify: true}, 'ml-02-mg-O-edit-sb-notify-no-contact');
                out.noContactMail = await app.mail.count({to: `${u('O', 'sb')}@mail.test`});
            }
            // silence: plain edit, Renew, Delete, a new type, the policies, the publishing mode
            await as(u('P', 'mg'), ctx);
            out.plainEdit = await editSub(ctx, 'Individual Subscriptions', /Kthreefu\b/, {}, 'ml-03-mg-edit-fu-plain');
            let panel = await paymentsTab(ctx, 'Individual Subscriptions');
            let ra = await rowActions(gridRow(panel, /Kthreeex\b/));
            await ra.ctl.getByRole('link', {name: 'Renew', exact: true}).click(); await sleep(800);
            await W().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {}); await sleep(1500); await idle(page).catch(() => {});
            await snap('ml-04-mg-renew-ex');
            panel = await paymentsTab(ctx, 'Individual Subscriptions');
            ra = await rowActions(gridRow(panel, /Kthreeot\b/));
            await ra.ctl.getByRole('link', {name: 'Delete', exact: true}).click(); await sleep(800);
            await W().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {}); await sleep(1500); await idle(page).catch(() => {});
            await snap('ml-05-mg-delete-ot');
            panel = await paymentsTab(ctx, 'Individual Subscriptions');
            out.gridAfterSilence = await readGrid(panel);
            // a new type
            await paymentsTab(ctx, 'Subscription Types');
            await page.getByRole('link', {name: 'Create New Subscription Type', exact: true}).first().click();
            const w = W();
            await w.locator('form').first().waitFor({timeout: T}); await idle(page); await sleep(700);
            await w.locator('[name="name[en]"]').fill('K3 Extra');
            await w.locator('[name="currency"]').selectOption('USD');
            await w.locator('[name="cost"]').fill('3');
            await w.locator('[name="duration"]').fill('6');
            await w.getByRole('button', {name: 'Save'}).first().click();
            out.typeSave = await collectNotices(4000);
            await snap('ml-06-mg-type-saved');
            if (await W().count()) await closeWindow();
            // the policies, saved as they arrive
            const pol = await paymentsTab(ctx, 'Subscription Policies');
            await pol.getByRole('button', {name: 'Save'}).first().click();
            out.policySave = await collectNotices(4000);
            await snap('ml-07-mg-policies-saved');
            // the publishing mode (Q) switched to open access and back
            if (P('Q')) {
                await as(u('Q', 'mg'), P('Q'));
                for (const [label, name] of [[/will provide open access/, 'ml-08-Q-open'], [/will require subscriptions/, 'ml-09-Q-subscriptions']]) {
                    await page.goto(cUrl(P('Q'), '/management/settings/distribution')); await idle(page);
                    await page.getByRole('tab', {name: 'Access', exact: true}).click(); await idle(page); await sleep(400);
                    await page.locator('#access').getByRole('radio', {name: label}).check();
                    await page.locator('#access').getByRole('button', {name: 'Save'}).click();
                    await page.locator('#access [role=status]').filter({hasText: 'Saved'}).waitFor({timeout: 10000}).catch(() => {});
                    await snap(name);
                }
            }
            await sleep(4000);
            // counts, bounded by the control
            const addrs = {sm: u('P', 'sm'), mg: u('P', 'mg'), fu: u('P', 'fu'), ex: u('P', 'ex'), ot: u('P', 'ot'), rd: u('P', 'rd'), rd2: u('P', 'rd2'), ib: u('P', 'ib'), ac: u('P', 'ac'), iu: u('P', 'iu'), ao: u('P', 'ao')};
            out.counts = {};
            for (const [k, v] of Object.entries(addrs)) out.counts[k] = await app.mail.count({to: `${v}@mail.test`});
            out.counts.desk = await app.mail.count({to: `${C.P.p}desk@mail.test`});
            out.counts.principalP = await app.mail.count({to: `${C.P.p}pc@mail.test`});
            out.counts.principalQ = await app.mail.count({to: `${C.Q.p}pc@mail.test`});
            out.counts.mgQ = await app.mail.count({to: `${u('Q', 'mg')}@mail.test`});
            out.counts.rdQ = await app.mail.count({to: `${u('Q', 'rd')}@mail.test`});
            out.counts.niSubjects = ((await app.mail._search({to: `${u('P', 'ni')}@mail.test`})).messages || []).map((m) => m.Subject);
            fact('mail', out);
        });

        // ================================================================== xfeat: the cross-feature strings (Roles "Site Access Options", the Notifications row)
        if (isOJS && on('xfeat') && P('P')) await sect('xfeat', async () => {
            const out = {};
            await as(u('P', 'mg'), P('P'));
            await page.goto(cUrl(P('P'), '/management/settings/access')); await idle(page);
            out.usersRolesTabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => x.trim());
            await snap('xf-01-mg-users-roles');
            await as(u('P', 'rd'), P('P'));
            await page.goto(cUrl(P('P'), '/user/profile')); await idle(page);
            await page.getByRole('tab', {name: 'Notifications'}).click().catch(() => {}); await idle(page); await sleep(400);
            out.notifRow = flat(await page.locator('ul').filter({has: page.locator('#notificationOpenAccess')}).first().innerText().catch(() => null), 200);
            await snap('xf-02-rd-profile-notifications');
            // the Subscription Manager signing in: where they land
            await as(u('P', 'sm'), P('P'));
            out.smLanding = page.url().replace(app.baseURL, '');
            await snap('xf-03-sm-landing');
            fact('xfeat', out);
        });

        // ================================================================== inst (reader side, nothing else): the Subscriptions page is the same for an institution-covered visitor
        if (isOJS && on('inst') && P('I')) await sect('inst', async () => {
            const out = {};
            await visitor();
            const f = await land(`/index.php/${P('I')}/about/subscriptions`, 'in-01-visitor-subscriptions');
            out.page = {h1: f.h1, heads: f.heads, links: f.links, block: f.block};
            await as(u('I', 'owner'), P('I'));
            const g = await land(`/index.php/${P('I')}/user/subscriptions`, 'in-02-owner-my');
            out.owner = {tables: g.tables, links: g.links};
            fact('inst', out);
        });

        // ================================================================== extra: a non-expiring purchase (the duration axis of Rule 28); "Continue" after the notification
        if (isOJS && on('extra') && P('P')) await sect('extra', async () => {
            const ctx = P('P');
            const out = {};
            await as(u('P', 'ib'), ctx);
            await land(`/index.php/${ctx}/user/purchaseSubscription/individual`, 'ex-01-ib-purchase-individual');
            const forOpt = (await page.locator('form#subscriptionForm select[name="typeId"] option').allInnerTexts()).find((o) => o.startsWith('K3 Forever'));
            await page.locator('form#subscriptionForm select[name="typeId"]').selectOption({label: forOpt});
            let f = await press(page.locator('form#subscriptionForm button.submit'), 'ex-02-ib-save-forever');
            out.payment = {url: f.url, h1: f.h1, tables: f.tables};
            out.db = dbSub('P', u('P', 'ib'));
            f = await press(page.getByRole('link', {name: 'Send notification of payment'}), 'ex-03-ib-notify');
            out.notify = {url: f.url, h1: f.h1, links: f.links};
            f = await press(page.locator('.pkp_structure_main a').filter({hasText: 'Continue'}), 'ex-04-ib-notify-continue');
            out.continue = {url: f.url, chain: f.chain, h1: f.h1, home: isHome(f, ctx)};
            f = await land(`/index.php/${ctx}/user/subscriptions`, 'ex-05-ib-my');
            out.my = {tables: f.tables, block: f.block && f.block.lines.map((x) => x.text)};
            f = await land(`/index.php/${ctx}`, 'ex-06-ib-home');
            out.homeBlock = f.block && f.block.lines.map((x) => x.text);
            await as(u('P', 'mg'), ctx);
            const panel = await paymentsTab(ctx, 'Individual Subscriptions');
            out.grid = ((await readGrid(panel))[0] || {}).rows.filter((r) => /Kthreeib/.test(r));
            await snap('ex-07-mg-list');
            fact('extra', out);
        });

        // ================================================================== pol: Settings 4's last clause — the online payment boxes on "Subscription Policies", payments off (F) and on (P)
        if (isOJS && on('pol')) await sect('pol', async () => {
            const out = {};
            for (const key of ['F', 'P', 'Q']) {
                await as(u(key, 'mg'), P(key));
                const pol = await paymentsTab(P(key), 'Subscription Policies');
                out[key] = await pol.evaluate((root) => [...root.querySelectorAll('input[type=checkbox]')].map((c) => ({
                    name: c.name, checked: c.checked, disabled: c.disabled,
                    label: ((c.closest('label') || c.parentElement || {}).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120),
                }))).catch((e) => flat(e.message, 200));
                await snap(`po-${key}-mg-policies`);
            }
            fact('pol', out);
        });

        // ================================================================== ifee: A6's other end — a bought issue ("Purchase Issue" 20, a "Full Issue" PDF) on journal G, seeded here
        if (isOJS && on('ifee')) await sect('ifee', async () => {
            const out = {};
            if (!P('G')) {
                const p = `${S.t}g`;
                const r = await app.api.createContext({tag: p, context: {name: 'U51 K3 issue fee', acronym: 'KTHREE', contactName: 'K3 Principal', contactEmail: `${p}pc@mail.test`},
                    publishingMode: 'subscription', payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Send a cheque to the K3 desk.', purchaseIssueFee: 20},
                    users: [{username: `${p}mg`, roles: ['manager'], givenName: 'MG', familyName: 'Kthreemg'}, {username: `${p}rd`, roles: ['reader'], givenName: 'RD', familyName: 'Kthreerd'}],
                    subscriptionTypes: [{name: 'K3 Individual', cost: 10, currency: 'USD', duration: 12}],
                    issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [{label: 'PDF', file: 'article.pdf'}]}]});
                S.C.G = {path: r.path || p, p, issues: r.issues || []}; save();
            }
            const ctx = P('G');
            const issueId = (C.G.issues[0] || {}).id;
            out.issueId = issueId;
            await as(u('G', 'rd'), ctx);
            const full = () => page.locator('.obj_issue_toc > .galleys a.obj_galley_link, .obj_issue_toc .galleys a.obj_galley_link').first();
            await land(`/index.php/${ctx}/issue/view/${issueId}`, 'if-01-rd-issue');
            out.link = await full().innerText().catch(() => null);
            let f = await press(full(), 'if-02-rd-full-issue');
            out.payment = {url: f.url, h1: f.h1, tables: f.tables};
            f = await press(page.getByRole('link', {name: 'Send notification of payment'}), 'if-03-rd-notify');
            out.notify = {url: f.url, h1: f.h1, text: flat(f.text, 200)};
            await as(u('G', 'mg'), ctx);
            const panel = await paymentsTab(ctx, 'Payments');
            out.paymentsTab = await readGrid(panel);
            await snap('if-04-mg-payments-tab');
            await as(u('G', 'rd'), ctx);
            await land(`/index.php/${ctx}/issue/view/${issueId}`, 'if-05-rd-issue-again');
            f = await press(full(), 'if-06-rd-full-issue-again');
            out.again = {url: f.url, h1: f.h1, tables: f.tables};
            fact('ifee', out);
        });

        // ================================================================== absence (OMP, OPS read-only controls)
        if (!isOJS && on('absence')) await sect('absence', async () => {
            const out = {};
            const ctx = app.contextPath;
            for (const k of ['visitor', 'reader.rosa', 'manager.maya']) {
                if (k === 'visitor') await visitor(); else await as(k, ctx);
                const o = {};
                for (const p2 of ['about/subscriptions', 'user/subscriptions', 'user/purchaseSubscription/individual', 'user/purchaseSubscription/institutional']) {
                    const f = await land(`/index.php/${ctx}/${p2}`, `ab-${k.replace(/\W/g, '')}-${p2.replace(/\//g, '-')}`);
                    o[p2] = {url: f.url, chain: f.chain, title: f.title, h1: f.h1, text: flat(f.text, 160)};
                }
                const home = await land(`/index.php/${ctx}`, `ab-${k.replace(/\W/g, '')}-home`);
                o.homeBlocks = home.blocks; o.nav = home.nav; o.userNav = home.userNav;
                out[k] = o;
            }
            await page.goto(cUrl(ctx, '/management/settings/website')); await idle(page);
            await page.locator('#appearance-button').click().catch(() => {}); await idle(page); await sleep(500);
            out.sidebarList = await page.evaluate(() => {
                const fs2 = [...document.querySelectorAll('fieldset, .pkpFormGroup')].find((x) => /Sidebar/.test(x.innerText));
                return fs2 ? [...fs2.querySelectorAll('input[type=checkbox]')].map((c) => (c.closest('label') || c.parentElement).innerText.trim()) : null;
            }).catch(() => null);
            await snap('ab-manager-appearance-setup');
            fact('absence', out);
        });
    } finally {
        record('k3-dialogs', {dialogs}, {merge: true});
        await close();
    }
});
