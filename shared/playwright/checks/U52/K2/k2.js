// U52 claim check, chunk K2: the "Payments" page ("Payment Types" and the list of payments), the APC in
// force, the reader fees and the fees nobody sees in advance.
// Spec: docs/specs/U52-payments-and-apcs.md lines 152–184 (Rules 4–7), 269–287 (Rule 17), 340–349
// (Settings 6–8), register A1, A4, A7. Chunk plan: .reports/U52/claimcheck-chunks.md.
//
// OJS (the one app with the surface):
//   Z  a fresh journal (no payment settings): the tab's defaults, its validation at both ends, the empty
//      list, a save with payments off; then payments set up on screen with no currency (td2 e).
//   J  payments set up through the `payments` key (USD, "Manual Fee Payment", APC 50): every role level
//      at the page's address; the APC in force and each way out of it (td2 a–f; Rule 5), with S at the
//      Submission stage, R in review, P in Production never requested and Q requested; the list after
//      "Paid" and "Waived" on two submissions (td15), a merged payer.
//   R  a subscription journal with APC 50, "Purchase Article" 5, "Association Membership" 20: what a reader
//      and an Author see of any fee (td4; A1), the locked galleys at each reader-fee setting (Rule 6),
//      the membership's reach and user/payMembership (td13; A7).
//   publicknowledge: the roster accounts at the page's address, read only.
// OMP, OPS: publicknowledge read only as the roster's manager: /payments, user/payMembership, About
//   (the {OJS} controls).
//
//   PROBE_FEATURE=U52 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U52/K2/k2.js
//   PHASES=seed,types,roles,pk,force,off,list,reader,fees,member,ctl (default all; state in
//   .reports/U52/ccK2/k2-state-<app>.json: delete it to drive a later build afresh). Each phase stays
//   under the Bash tool's 600 s cap when run alone (PHASES=<one> ONLY=<app>).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const ALL = ['seed', 'types', 'unsaved', 'roles', 'pk', 'force', 'off', 'list', 'merged', 'merge2', 'reader', 'fees', 'member', 'ctl'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k2]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const T = 30_000;
const INSTR = 'Pay by bank transfer to account 222.\nQuote your reference.';
const FEE_RE = /(\d+(?:[.,]\d+)?\s*\(?(?:USD|EUR|CAD)\)?|(?:USD|EUR|CAD)\s*\d+|\bfees?\b|processing charge|membership|purchase|\bprice\b|\bcost\b|\bpay(?:ment)?s?\b)/ig;

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 2));
    const fact = (k, v) => { record('k2-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };

    // ------------------------------------------------------------------ seed (OJS)
    if (isOJS && on('seed') && !S.seeded) {
        const U = (t, k, role, g, f) => ({username: `${t}${k}`, roles: [role], givenName: g, familyName: f});
        // Z: fresh, nothing set
        const z = tag('u52k2z');
        await app.api.createContext({tag: z, context: {name: `U52 K2 fresh ${z}`, acronym: 'KTWOZ', contactName: 'K2 Principal Z', contactEmail: `${z}pc@mail.test`},
            users: [U(z, 'mg', 'manager', 'Mia', 'Zmanager'), U(z, 'se', 'sectionEditor', 'Sol', 'Zeditor'), U(z, 'au', 'author', 'Ada', 'Zauthor')]});
        const sz = await app.api.createSubmission({tag: `${z}s`, context: z, submitter: `${z}au`, title: `K2 ZS ${z}`, participants: [{username: `${z}se`, role: 'sectionEditor'}]});
        S.Z = {t: z, S: sz.submissionId};
        save();
        // J: payments set up by the key
        const t = tag('u52k2j');
        const roster = [
            U(t, 'mg', 'manager', 'Maya', 'Jmanager'), U(t, 'ed', 'editor', 'Edda', 'Jeditor'), U(t, 'pe', 'productionEditor', 'Pete', 'Jproduction'),
            U(t, 'se', 'sectionEditor', 'Sena', 'Jsection'), U(t, 'sm', 'subscriptionManager', 'Sami', 'Jsubscriptions'), U(t, 'ce', 'copyeditor', 'Cora', 'Jcopyeditor'),
            U(t, 'au', 'author', 'Alex', 'Jauthor'), U(t, 'au3', 'author', 'Ursula', 'Jpayer'), U(t, 'rv', 'externalReviewer', 'Rhea', 'Jreviewer'), U(t, 'rd', 'reader', 'Rosa', 'Jreader'),
        ];
        const r = await app.api.createContext({tag: t, context: {name: `U52 K2 journal ${t}`, acronym: 'KTWOJ', contactName: 'K2 Principal J', contactEmail: `${t}pc@mail.test`},
            users: roster, payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: INSTR, publicationFee: 50},
            issues: [{volume: 1, number: 1, year: 2026, published: false}]});
        S.J = {t, issues: r.issues};
        save();
        const P = (k, role) => ({username: `${t}${k}`, role});
        const sub = async (key, body, submitter = 'au') => {
            try {
                const s = await app.api.createSubmission({tag: `${t}${key.toLowerCase()}`, context: t, submitter: `${t}${submitter}`, title: `K2 ${key} ${t}`, ...body});
                S.J[key] = {id: s.submissionId, pub: s.publicationId, title: `K2 ${key} ${t}`};
            } catch (e) { S.J[key] = {error: flat(e.message, 600)}; log('seed FAILED', key, flat(e.message, 600)); }
            save();
        };
        await sub('S', {participants: [P('se', 'sectionEditor')]});
        await sub('R', {participants: [P('se', 'sectionEditor')], decisions: ['sendExternalReview'], reviewRounds: [{reviewers: []}]});
        await sub('P', {participants: [P('se', 'sectionEditor')], decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'PDF', file: 'article.pdf'}]});
        await sub('P2', {participants: [P('se', 'sectionEditor')], decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'PDF', file: 'article.pdf'}]});
        await sub('Q', {participants: [P('se', 'sectionEditor')], galleys: [{label: 'PDF', file: 'article.pdf'}]});
        await sub('L1', {participants: [P('se', 'sectionEditor')]}, 'au3');
        await sub('L2', {participants: [P('se', 'sectionEditor')]});
        S.seeded = true;
        save();
        fact('seed', S);
    }
    // R: a subscription journal with every fee the reader and the Author could meet. The APC is typed on
    // screen after the seed (the `published` seed key is refused while the APC is in force).
    if (isOJS && on('seed') && (!S.R || !S.R.A)) {
        const U = (t, k, role, g, f) => ({username: `${t}${k}`, roles: [role], givenName: g, familyName: f});
        const rr = tag('u52k2r');
        const r2 = await app.api.createContext({tag: rr, context: {name: `U52 K2 subscriptions ${rr}`, acronym: 'KTWOR', contactName: 'K2 Principal R', contactEmail: `${rr}pc@mail.test`},
            publishingMode: 'subscription',
            users: [U(rr, 'mg', 'manager', 'Mo', 'Rmanager'), U(rr, 'au', 'author', 'Abe', 'Rauthor'), U(rr, 'rd', 'reader', 'Rae', 'Rreader')],
            payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: INSTR, purchaseArticleFee: 5, membershipFee: 20},
            subscriptionName: 'K2 Subscriptions Desk', subscriptionEmail: `${rr}desk@mail.test`, subscriptionMailingAddress: '2 Desk Road',
            subscriptionTypes: [{name: 'K2 Individual', cost: 10, currency: 'USD', duration: 12}],
            issues: [{volume: 1, number: 1, year: 2026, published: true}]});
        S.R = {t: rr, issues: r2.issues};
        try {
            const a = await app.api.createSubmission({tag: `${rr}a`, context: rr, submitter: `${rr}au`, title: `K2 RA ${rr}`, published: true, issue: {volume: 1, number: 1, year: 2026},
                galleys: [{label: 'PDF', file: 'article.pdf'}, {label: 'HTML', file: 'article.html'}]});
            S.R.A = a.submissionId;
        } catch (e) { S.R.Aerr = flat(e.message, 600); log('seed RA FAILED', S.R.Aerr); }
        try {
            const d = await app.api.createSubmission({tag: `${rr}d`, context: rr, submitter: `${rr}au`, title: `K2 RD draft ${rr}`, submitted: false});
            S.R.D = d.submissionId;
        } catch (e) { S.R.Derr = flat(e.message, 600); log('seed RD FAILED', S.R.Derr); }
        save();
        fact('seedR', S.R);
    }
    if (isOJS && !S.seeded) { log('not seeded'); return; }

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: page.url(), at: new Date().toISOString()});
        if (d.type() === 'beforeunload' || (acceptConfirm && d.type() === 'confirm')) await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    let who = 'visitor';
    let acceptConfirm = false;
    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);

    async function snap(name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 300)}; }
        Object.assign(s, extra, {who});
        // long server messages are kept out of the snapshot (and its picture is not taken)
        const BAD = /\.php on line|Argument #\d|Uncaught |Stack trace/;
        let withheld = false;
        const walk = (v) => {
            if (typeof v === 'string') { if (BAD.test(v)) { withheld = true; return '[server error text withheld]'; } return v; }
            if (Array.isArray(v)) return v.map(walk);
            if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
            return v;
        };
        s = walk(s);
        record(name, s);
        if (!withheld) await shot(page, name).catch(() => {});
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
    const as = async (user, ctx) => {
        await signIn(page, user, {contextPath: ctx}).catch((e) => log('signIn slow', user, flat(e.message, 160)));
        await idle(page).catch(() => {});
        who = user;
    };
    const visitor = async () => { await signOut(page).catch(() => {}); who = 'visitor'; };

    /** The side menu's entries. */
    const readNav = () => page.evaluate(() => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const nav = document.querySelector('nav[aria-label="Site Navigation"], .app__nav');
        if (!nav) return null;
        return [...nav.querySelectorAll('a')].map((a) => t(a.innerText)).filter(Boolean);
    }).catch(() => null);
    /** A page as data: heading, text, tables, links, fee-like snippets. */
    async function front() {
        return page.evaluate((reSrc) => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            const main = document.querySelector('.pkp_structure_main') || document.querySelector('main') || document.body;
            const text = t(main.innerText);
            const re = new RegExp(reSrc, 'ig');
            const hits = [];
            let m;
            while ((m = re.exec(text)) && hits.length < 40) hits.push(text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60));
            const nav = [...document.querySelectorAll('header a, .pkp_navigation_primary a, .pkp_navigation_user a, nav a')].filter(vis).map((a) => t(a.innerText)).filter(Boolean);
            return {
                url: location.pathname + location.search,
                title: document.title,
                h1: [...main.querySelectorAll('h1')].filter(vis).map((e) => t(e.innerText)),
                heads: [...main.querySelectorAll('h2, h3')].filter(vis).map((e) => t(e.innerText)).slice(0, 40),
                tables: [...main.querySelectorAll('table')].filter(vis).map((tb) => [...tb.querySelectorAll('tr')].slice(0, 12).map((tr) => [...tr.children].map((c) => t(c.innerText)))),
                links: [...main.querySelectorAll('a')].filter(vis).map((a) => ({text: t(a.innerText), href: (a.getAttribute('href') || '').replace(location.origin, '')})).filter((l) => l.text).slice(0, 60),
                buttons: [...main.querySelectorAll('button, input[type=submit]')].filter(vis).map((b) => t(b.innerText || b.value)).filter(Boolean),
                nav: [...new Set(nav)].slice(0, 60),
                feeHits: hits,
                text: text.slice(0, 4000),
            };
        }, FEE_RE.source).catch((e) => ({err: flat(e.message, 200)}));
    }
    async function land(url, name, extra = {}) {
        let status = null;
        const chain = [];
        const onResp = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${r.request().method()} ${r.url().replace(app.baseURL, '')}`); } catch (e) { /* none */ } };
        page.on('response', onResp);
        try {
            const r = await page.goto(url.startsWith('http') ? url : app.url(url)).catch((e) => ({err: flat(e.message, 200)}));
            status = r && r.status ? r.status() : (r && r.err) || null;
            await idle(page).catch(() => {});
        } finally { page.off('response', onResp); }
        await snap(name, extra);
        const f = await front();
        f.chain = chain; f.status = status;
        record(name, {front: f}, {merge: true});
        return f;
    }

    // ------------------------------------------------------------------ the "Payments" page
    async function paymentsPage(ctx, name) {
        const f = await land(`/index.php/${ctx}/payments`, name);
        const tabs = await page.locator('#subscriptionsTabs > ul a, #subscriptionsTabs [role="tab"]').allInnerTexts().then((a) => a.map((x) => x.trim()).filter(Boolean)).catch(() => []);
        const nav = await readNav();
        record(name, {tabs, nav}, {merge: true});
        return {status: f.status, url: f.url, h1: f.h1, text: flat(f.text, 400), tabs, nav, chain: f.chain};
    }
    async function openTab(tabName) {
        const a = page.locator(`#subscriptionsTabs a[name="${tabName}"]`).first();
        if (!(await a.count())) return false;
        await a.click(); await idle(page).catch(() => {}); await sleep(800); await idle(page).catch(() => {});
        return true;
    }
    const form = () => page.locator('#paymentTypesForm').first();
    /** The Payment Types form as data: its text in order, its boxes in order, its errors and where they sit. */
    const readTypes = () => form().evaluate((f) => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const vis = (e) => e.getClientRects().length > 0;
        const labelOf = (i) => { const l = i.id && f.querySelector(`label[for="${i.id}"]`); return t(l ? l.innerText : (i.closest('label') || {}).innerText); };
        const inputs = [...f.querySelectorAll('input:not([type=hidden]), select, textarea')].map((i) => ({
            name: i.name, type: i.type, label: labelOf(i), value: i.type === 'checkbox' ? i.checked : i.value, visible: vis(i),
            required: i.required || i.getAttribute('aria-required') === 'true' || i.getAttribute('required') !== null,
            invalid: i.getAttribute('aria-invalid') || null, cls: i.className}));
        const errors = [...f.querySelectorAll('*')].filter((e) => vis(e) && /error/i.test(e.className && e.className.baseVal === undefined ? e.className : '') && t(e.innerText))
            .map((e) => ({tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 80), text: t(e.innerText).slice(0, 300)})).slice(0, 12);
        const blocks = [...f.querySelectorAll('h1,h2,h3,h4,legend,p,label,span.label,div.description,.description,button,a')].filter(vis).map((e) => `${e.tagName.toLowerCase()}: ${t(e.innerText)}`).filter((x) => !/: $/.test(x));
        const saveBtn = [...f.querySelectorAll('button')].find((b) => t(b.innerText) === 'Save');
        let afterSave = null;
        if (saveBtn) {
            const all = [...f.querySelectorAll('*')].filter(vis);
            const idx = all.indexOf(saveBtn);
            afterSave = t(all.slice(idx + 1).map((e) => (e.children.length ? '' : e.innerText)).join(' '));
        }
        const asterisks = [...f.querySelectorAll('*')].filter((e) => vis(e) && !e.children.length && /\*/.test(e.innerText)).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)}: ${t(e.innerText)}`);
        return {text: t(f.innerText).slice(0, 3000), inputs, errors, blocks: blocks.slice(0, 60), afterSave, asterisks};
    }).catch((e) => ({err: flat(e.message, 200)}));
    const noticesNow = () => page.evaluate(() => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        return [...document.querySelectorAll('.ui-pnotify, .pkp_notification, [role=status], [role=alert], .pnotify, .notifyMessage')].filter((e) => e.getClientRects().length)
            .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 50)}: ${t(e.innerText).slice(0, 200)}`).filter((x) => !/: $/.test(x));
    }).catch(() => []);
    /** Open the Payment Types tab (a fresh page load: the "reload" read). */
    async function typesTab(ctx, name) {
        await page.goto(cUrl(ctx, '/payments')).catch(() => {}); await idle(page).catch(() => {});
        await openTab('paymentTypes');
        await form().waitFor({timeout: 15_000}).catch(() => {});
        const r = await readTypes();
        await snap(name, {types: r});
        return r;
    }
    const val = (r, n) => ((r && r.inputs) || []).find((i) => i.name === n);
    /** Type the given boxes, press "Save", read the same page, then reload the tab and read again. */
    async function saveTypes(ctx, values, name, {reload = true} = {}) {
        for (const [k, v] of Object.entries(values)) {
            const box = form().locator(`[name="${k}"]`).first();
            if (typeof v === 'boolean') { if (v) await box.check(); else await box.uncheck(); } else await box.fill(String(v));
        }
        const notices = [];
        const poll = setInterval(async () => { const n = await noticesNow(); for (const x of n) if (!notices.includes(x)) notices.push(x); }, 250);
        const rs = page.waitForResponse((r) => /savePaymentTypes/.test(r.url()), {timeout: T}).then(async (r) => ({status: r.status(), body: flat(await r.text().catch(() => ''), 300)})).catch(() => null);
        await form().getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await rs;
        await idle(page).catch(() => {});
        await page.waitForFunction(() => /Your changes have been saved|must be positive|Errors occurred/i.test(document.body.innerText), null, {timeout: 6000}).catch(() => {});
        await sleep(1500);
        clearInterval(poll);
        for (const x of await noticesNow()) if (!notices.includes(x)) notices.push(x);
        const bodyHasSaved = await page.evaluate(() => /Your changes have been saved\./.test(document.body.innerText)).catch(() => null);
        const same = await readTypes();
        await snap(`${name}-same`, {typed: values, resp, notices, bodyHasSaved, types: same});
        let after = null;
        if (reload) after = await typesTab(ctx, `${name}-reload`);
        const pick = (r) => r && Object.fromEntries(((r.inputs) || []).map((i) => [i.name, i.value]));
        const out = {typed: values, status: resp && resp.status, body: resp && resp.body, notices, bodyHasSaved, sameErrors: same.errors, sameValues: pick(same), reloadValues: pick(after)};
        log(`[${name}]`, JSON.stringify(out).slice(0, 900));
        return out;
    }
    /** The list of payments (the page's "Payments" tab). */
    async function readList(ctx, name, {pressRow = false} = {}) {
        await page.goto(cUrl(ctx, '/payments')).catch(() => {}); await idle(page).catch(() => {});
        const ok = await openTab('payments');
        const grid = page.locator('#subscriptionsTabs .pkp_controllers_grid:visible').last();
        const data = await grid.evaluate((g) => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            return {cols: [...g.querySelectorAll('thead th')].filter(vis).map((th) => t(th.innerText)),
                rows: [...g.querySelectorAll('tbody tr')].filter(vis).map((r) => [...r.children].map((c) => t(c.innerText))),
                rowLinks: [...g.querySelectorAll('tbody a, tbody button')].filter(vis).map((a) => t(a.innerText || a.className)),
                header: [...g.querySelectorAll('.header a, .header h4, .header span')].filter(vis).map((a) => t(a.innerText)).filter(Boolean),
                paging: t((g.querySelector('.gridPaging') || {}).innerText), text: t(g.innerText).slice(0, 1500)};
        }).catch((e) => ({err: flat(e.message, 200)}));
        let press = null;
        if (pressRow) {
            const row = grid.locator('tbody tr.gridRow').first();
            if (await row.count()) {
                const before = page.url();
                const nd = dialogs.length;
                const reqs = [];
                const onReq = (r) => reqs.push(`${r.method()} ${r.url().replace(app.baseURL, '')}`);
                page.on('request', onReq);
                await row.locator('td').first().click().catch(() => {});
                await row.locator('td').nth(2).click().catch(() => {});
                await sleep(1500); await idle(page).catch(() => {});
                page.off('request', onReq);
                press = {urlBefore: before, urlAfter: page.url(), dialogsOpen: await page.locator('[role=dialog]:visible').count(), newBrowserDialogs: dialogs.length - nd, requests: reqs.slice(0, 10),
                    cursor: await row.evaluate((r) => getComputedStyle(r).cursor).catch(() => null)};
            }
        }
        await snap(name, {tabOpened: ok, list: data, press});
        log(`[${name}]`, JSON.stringify({cols: data.cols, rows: data.rows, press}).slice(0, 900));
        return {...data, press};
    }

    // ------------------------------------------------------------------ Settings › Distribution › "Payments"
    const pane = () => page.locator('#payments').first();
    async function setPay(ctx, name, {enabled, currency, plugin, instructions, account}) {
        await page.goto(cUrl(ctx, '/management/settings/distribution')); await idle(page);
        await page.locator('#payments-button').click(); await idle(page); await sleep(600);
        const box = pane().locator('input[name="paymentsEnabled"]').first();
        if (enabled !== undefined) { if (enabled) await box.check(); else await box.uncheck(); await sleep(300); }
        if (currency) await pane().locator('select[name="currency"]').selectOption(currency).catch((e) => log('currency', flat(e.message, 120)));
        if (plugin) await pane().locator('select[name="paymentPluginName"]').selectOption(plugin).catch((e) => log('plugin', flat(e.message, 120)));
        await sleep(300);
        if (instructions !== undefined) await pane().locator('textarea[name^="manualInstructions"]').first().fill(instructions).catch((e) => log('instr', flat(e.message, 120)));
        if (account !== undefined) await pane().locator('input[name="accountName"]').fill(account).catch((e) => log('acct', flat(e.message, 120)));
        const rs = page.waitForResponse((r) => /\/_payments/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).then((r) => r.status()).catch(() => null);
        await pane().getByRole('button', {name: 'Save', exact: true}).click();
        const status = await rs;
        const saved = await pane().locator('[role=status]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        const st = await pane().evaluate((p) => ({
            enabled: (p.querySelector('input[name=paymentsEnabled]') || {}).checked,
            currency: (p.querySelector('select[name=currency]') || {}).value,
            method: (p.querySelector('select[name=paymentPluginName]') || {}).value,
            instructions: (p.querySelector('textarea[name^=manualInstructions]') || {}).value,
            accountName: (p.querySelector('input[name=accountName]') || {}).value,
        })).catch((e) => ({err: flat(e.message)}));
        await snap(name, {status, saved, st});
        log(`[${name}]`, status, saved, JSON.stringify(st));
        return {status, saved, st};
    }

    // ------------------------------------------------------------------ the workflow
    const wfUrl = (ctx, id, key) => cUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const wfDlg = () => page.locator('[role="dialog"]:visible').first();
    async function openWf(ctx, id, name, key) {
        await page.goto(wfUrl(ctx, id, key)); await idle(page);
        await wfDlg().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length)[0]; return d && !/Loading/.test(d.innerText) && d.innerText.length > 80; }, null, {timeout: 20_000}).catch(() => {});
        await idle(page); await sleep(700);
        const h = await page.evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            const d = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0];
            if (!d) return {dialog: false};
            const btns = [...d.querySelectorAll('button, a')].filter(vis).map((b) => t(b.innerText || b.getAttribute('aria-label'))).filter(Boolean);
            return {dialog: true, payments: !!d.querySelector('.pkpWorkflow__submissionPayments'), buttons: btns.slice(0, 40), text: t(d.innerText).slice(0, 1200)};
        }).catch((e) => ({err: flat(e.message)}));
        await snap(name, {header: h});
        log(`[${name}]`, who, 'payments', h.payments, JSON.stringify((h.buttons || []).slice(0, 12)));
        return h;
    }
    /** Press a decision button and read the decision's first page; leave it unrecorded. */
    async function firstPage(ctx, id, button, name) {
        await openWf(ctx, id, `${name}-wf`);
        const btn = wfDlg().getByRole('button', {name: button, exact: true}).first();
        if (!(await btn.count())) { await snap(name, {absent: true, button}); return {absent: true}; }
        await loc(page, `workflow: "${button}"`, btn);
        await btn.click();
        await page.waitForURL(/\/decision\//, {timeout: T}).catch(() => {});
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(900);
        const d = await page.evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            const main = document.querySelector('main') || document.body;
            const labelOf = (i) => { const l = i.id && document.querySelector(`label[for="${i.id}"]`); return t(l ? l.innerText : (i.closest('label') || i.parentElement || {}).innerText).slice(0, 200); };
            return {url: location.pathname, h1: [...main.querySelectorAll('h1')].filter(vis).map((e) => t(e.innerText)),
                radios: [...main.querySelectorAll('input[type=radio]')].filter(vis).map((i) => ({label: labelOf(i), checked: i.checked, name: i.name, value: i.value}))};
        }).catch((e) => ({err: flat(e.message, 200)}));
        d.requestPayment = (d.h1 || []).some((h) => /Request Payment/.test(h));
        await snap(name, {decision: d});
        log(`[${name}]`, JSON.stringify(d).slice(0, 400));
        await page.goto(cUrl(ctx, '/submissions')).catch(() => {}); await idle(page).catch(() => {});
        return d;
    }
    /** Record a decision from the workflow, choosing a payment option on its first page when offered. */
    async function decide(ctx, id, button, choice, name) {
        await openWf(ctx, id, `${name}-wf`);
        const btn = wfDlg().getByRole('button', {name: button, exact: true}).first();
        if (!(await btn.count())) { await snap(name, {absent: true, button}); return {absent: true}; }
        await btn.click();
        await page.waitForURL(/\/decision\//, {timeout: T}).catch(() => {});
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
        const h1 = await page.locator('main h1').allInnerTexts().catch(() => []);
        await snap(`${name}-page1`, {h1});
        if (choice) {
            const r = page.getByRole('radio', {name: choice, exact: true});
            if (await r.count()) await r.first().check({force: true});
        }
        const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
        for (let i = 0; i < 6 && !(await rec.isVisible().catch(() => false)); i++) {
            await page.getByRole('button', {name: 'Continue', exact: true}).first().click(); await idle(page); await sleep(700);
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        }
        await rec.click(); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: T}).catch(() => {});
        await sleep(1000);
        await snap(`${name}-recorded`);
        return {h1};
    }
    // "Payments" menu
    const payBtn = () => page.locator('.pkpWorkflow__submissionPayments > button').first();
    const payContent = () => page.locator('.pkpWorkflow__submissionPayments .pkpDropdown__content');
    async function saveMenu(ctx, id, option, name) {
        await openWf(ctx, id, `${name}-wf`);
        if (!(await payBtn().count())) { await snap(name, {absent: true}); return {absent: true}; }
        await payBtn().click();
        await page.locator('.pkpWorkflow__submissionPayments input[type=radio]').first().waitFor({timeout: 15_000}).catch(() => {});
        await payContent().getByRole('radio', {name: option, exact: true}).check({force: true});
        const rs = page.waitForResponse((r) => /\/payment(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).then((r) => r.status()).catch(() => null);
        await payContent().getByRole('button', {name: 'Save', exact: true}).click();
        const status = await rs;
        const saved = await payContent().locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 5000}).then(() => true).catch(() => false);
        await snap(name, {option, status, saved, at: new Date().toISOString()});
        log(`[${name}]`, option, status, saved);
        return {status, saved, at: new Date().toISOString()};
    }
    // publishing: open the publish window and read what it lists; never confirm the final step
    async function tryPublish(ctx, id, pub, name) {
        await openWf(ctx, id, `${name}-wf`, `publication_${pub}_titleAbstract`);
        const errWin = page.getByRole('dialog').filter({hasText: /^\s*Error/}).last();
        const errorWindow = await errWin.count();
        if (errorWindow) { await errWin.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {}); await sleep(800); }
        const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
        if (!(await btn.count())) { await snap(`${name}-no-button`, {absent: true}); return {noButton: true, errorWindow}; }
        await btn.click(); await idle(page); await sleep(1500);
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        if (!(await panel.locator('select[name="versionStage"]').count())) { await btn.click().catch(() => {}); await idle(page); await sleep(1500); }
        if (await panel.locator('select[name="versionStage"]').count()) {
            await panel.locator('select[name="versionStage"]').selectOption('VoR').catch(() => {});
            await panel.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
            const radio = panel.getByRole('radio', {name: 'Assign To Future Issue and Schedule Only', exact: true});
            if (await radio.count()) await radio.check().catch(() => {});
            const sel = panel.locator('select[name="issueId"]');
            await sel.locator('option').filter({hasText: 'Vol. 1 No. 1'}).first().waitFor({state: 'attached', timeout: 15_000}).catch(() => {});
            const v = await sel.locator('option').filter({hasText: 'Vol. 1 No. 1'}).first().getAttribute('value').catch(() => null);
            if (v) await sel.selectOption(v).catch(() => {});
            await snap(`${name}-panel`);
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            await idle(page); await sleep(2000);
        }
        const dlgs = await page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((d) => ({text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 900), buttons: [...d.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean)}))).catch(() => []);
        const top = dlgs[dlgs.length - 1] || {};
        const out = {errorWindow, feeLine: /Publication Fee not paid/.test(top.text || ''), allMet: /All publication requirements have been met/.test(top.text || ''), text: flat(top.text, 600), buttons: top.buttons};
        await snap(`${name}-window`, {publish: out});
        log(`[${name}]`, JSON.stringify(out).slice(0, 500));
        const c = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Cancel|Close)$/}).last();
        if (await c.count()) { await c.click().catch(() => {}); await sleep(900); }
        return out;
    }

    try {
        if (isOJS) {
            const Z = S.Z.t, J = S.J.t, R = S.R.t;
            const zu = (k) => `${Z}${k}`, ju = (k) => `${J}${k}`, ru = (k) => `${R}${k}`;

            // ============================================================ types: Rule 4, Fields, A4, Settings 6–8 defaults (Z, payments off)
            if (on('types')) await sect('types', async () => {
                const out = {};
                await as(zu('mg'), Z);
                out.page = await paymentsPage(Z, 'types-01-z-mgr-payments-page');
                out.nav = out.page.nav;
                out.defaults = await typesTab(Z, 'types-02-z-mgr-payment-types-default');
                await loc(page, 'Payments page: the "Payment Types" tab', page.locator('#subscriptionsTabs a[name="paymentTypes"]'));
                await loc(page, 'Payment Types: the form', form());
                await loc(page, 'Payment Types: "Article Processing Charge" box', form().locator('input[name="publicationFee"]'));
                await loc(page, 'Payment Types: "Purchase Issue" box', form().locator('input[name="purchaseIssueFee"]'));
                await loc(page, 'Payment Types: "Purchase Article" box', form().locator('input[name="purchaseArticleFee"]'));
                await loc(page, 'Payment Types: "Only Restrict Access to PDF…" box', form().locator('input[name="restrictOnlyPdf"]'));
                await loc(page, 'Payment Types: "Association Membership" box', form().locator('input[name="membershipFee"]'));
                await loc(page, 'Payment Types: "Save"', form().getByRole('button', {name: 'Save', exact: true}));
                out.emptySave = await saveTypes(Z, {}, 'types-03-z-empty-save');
                out.abc = await saveTypes(Z, {publicationFee: 'abc'}, 'types-04-z-abc');
                out.neg = await saveTypes(Z, {publicationFee: '-5'}, 'types-05-z-minus5');
                out.comma = await saveTypes(Z, {publicationFee: '10,50'}, 'types-06-z-comma');
                out.dec = await saveTypes(Z, {publicationFee: '12.50'}, 'types-07-z-12-50');
                out.zero = await saveTypes(Z, {publicationFee: '0'}, 'types-08-z-zero');
                out.exp = await saveTypes(Z, {publicationFee: '1e3'}, 'types-09-z-1e3');
                out.other = await saveTypes(Z, {publicationFee: '', membershipFee: 'abc'}, 'types-10-z-membership-abc');
                // every box at once, then a refusal mixed with a valid change (nothing stored?)
                out.all = await saveTypes(Z, {publicationFee: '12.5', purchaseIssueFee: '7', purchaseArticleFee: '5', restrictOnlyPdf: true, membershipFee: '20'}, 'types-11-z-every-box');
                out.mixed = await saveTypes(Z, {purchaseArticleFee: '6', restrictOnlyPdf: false, publicationFee: 'abc'}, 'types-12-z-mixed-refused');
                out.allZero = await saveTypes(Z, {publicationFee: '0', purchaseIssueFee: '0', purchaseArticleFee: '0', restrictOnlyPdf: false, membershipFee: '0'}, 'types-13-z-all-zero');
                // the tab left with an unsaved change: another tab, then back; then another page
                await typesTab(Z, 'types-14-z-before-unsaved');
                await form().locator('input[name="publicationFee"]').fill('33');
                await form().locator('input[name="publicationFee"]').blur();
                const nd = dialogs.length;
                await openTab('payments');
                await snap('types-15-z-unsaved-to-payments-tab');
                out.unsavedTabSwitch = {dialogs: dialogs.slice(nd)};
                await openTab('paymentTypes');
                await form().waitFor({timeout: 10_000}).catch(() => {});
                out.unsavedBack = val(await readTypes(), 'publicationFee');
                await snap('types-16-z-back-to-payment-types', {value: out.unsavedBack});
                await form().locator('input[name="publicationFee"]').fill('44');
                await form().locator('input[name="publicationFee"]').blur();
                const nd2 = dialogs.length;
                await page.goto(cUrl(Z, '/submissions')).catch((e) => log('leave', flat(e.message, 100)));
                await idle(page).catch(() => {});
                out.unsavedLeave = {dialogs: dialogs.slice(nd2), url: page.url()};
                out.afterLeave = val(await typesTab(Z, 'types-17-z-after-leaving'), 'publicationFee');
                // the empty list on a fresh journal
                out.emptyList = await readList(Z, 'types-18-z-empty-list');
                fact('types', out);
            });

            // ============================================================ unsaved: the tab switch's question answered "OK" (Z)
            if (on('unsaved')) await sect('unsaved', async () => {
                const out = {};
                await as(zu('mg'), Z);
                out.before = val(await typesTab(Z, 'unsaved-01-z-before'), 'publicationFee');
                await form().locator('input[name="publicationFee"]').fill('55');
                await form().locator('input[name="publicationFee"]').blur();
                acceptConfirm = true;
                const nd = dialogs.length;
                await openTab('payments');
                await snap('unsaved-02-z-ok-to-payments-tab');
                out.dialogs = dialogs.slice(nd);
                out.onPayments = await page.locator('#subscriptionsTabs a[name="payments"]').evaluate((a) => a.closest('li').getAttribute('aria-selected') || a.closest('li').className).catch(() => null);
                acceptConfirm = false;
                await openTab('paymentTypes');
                await form().waitFor({timeout: 10_000}).catch(() => {});
                out.back = val(await readTypes(), 'publicationFee');
                await snap('unsaved-03-z-back', {value: out.back});
                out.reload = val(await typesTab(Z, 'unsaved-04-z-reload'), 'publicationFee');
                fact('unsaved', out);
            });

            // ============================================================ roles: every level at the page's address (J), the Subscription Manager's save (td2)
            if (on('roles')) await sect('roles', async () => {
                const out = {};
                const levels = [['admin', 'admin'], ['mg', ju('mg')], ['ed', ju('ed')], ['pe', ju('pe')], ['sm', ju('sm')], ['se', ju('se')], ['ce', ju('ce')], ['au', ju('au')], ['rv', ju('rv')], ['rd', ju('rd')]];
                for (const [k, user] of levels) {
                    await as(user, J);
                    const p = await paymentsPage(J, `roles-${k}-payments`);
                    const allowed = p.tabs && p.tabs.length > 0;
                    const o = {status: p.status, url: p.url, h1: p.h1, text: p.text, tabs: p.tabs, navPayments: (p.nav || []).filter((x) => /Payments|Subscriptions|Institutions/.test(x))};
                    if (allowed) {
                        await openTab('paymentTypes');
                        await form().waitFor({timeout: 10_000}).catch(() => {});
                        const ty = await readTypes();
                        o.typesOpened = !ty.err; o.apc = val(ty, 'publicationFee');
                        await snap(`roles-${k}-payment-types`, {types: ty});
                        const l = await readList(J, `roles-${k}-list`);
                        o.list = {cols: l.cols, rows: l.rows};
                    }
                    out[k] = o;
                    log('[roles]', k, JSON.stringify(o).slice(0, 400));
                }
                // the Subscription Manager saves the tab (nothing changed), then a change and back
                await as(ju('sm'), J);
                await typesTab(J, 'roles-sm-types-before-save');
                out.smSave = await saveTypes(J, {}, 'roles-sm-save');
                out.smSave75 = await saveTypes(J, {publicationFee: '75'}, 'roles-sm-save-75');
                out.smSave50 = await saveTypes(J, {publicationFee: '50'}, 'roles-sm-save-50');
                await visitor();
                out.visitor = await paymentsPage(J, 'roles-visitor-payments');
                fact('roles', out);
            });

            // ============================================================ pk: the roster at publicknowledge's page address (read only)
            if (on('pk')) await sect('pk', async () => {
                const out = {};
                for (const user of ['admin', 'manager.maya', 'editor.diana', 'sectioneditor.ana', 'copyeditor.carla', 'author.alex', 'reviewer.julia', 'reader.rosa']) {
                    await as(user, app.contextPath);
                    const p = await paymentsPage(app.contextPath, `pk-${user.replace('.', '-')}-payments`);
                    const o = {status: p.status, h1: p.h1, text: flat(p.text, 200), tabs: p.tabs, navPayments: (p.nav || []).filter((x) => /Payments|Subscriptions|Institutions/.test(x))};
                    if (p.tabs && p.tabs.length) {
                        await openTab('paymentTypes');
                        await form().waitFor({timeout: 10_000}).catch(() => {});
                        const ty = await readTypes();
                        await snap(`pk-${user.replace('.', '-')}-payment-types`, {types: ty});
                        o.types = (ty.inputs || []).map((i) => `${i.name}=${i.value}`);
                    }
                    out[user] = o;
                }
                fact('pk', out);
            });

            // ============================================================ force: the APC in force and each way out (td2; Rule 5; Settings 6)
            if (on('force')) await sect('force', async () => {
                const out = S.forceOut || {};
                const st = async (key, {accept = true, review = false, publish = [], seHeader = true} = {}) => {
                    const o = {};
                    if (seHeader) { await as(ju('se'), J); o.header = (await openWf(J, S.J.S.id, `force-${key}-se-S-header`)).payments; }
                    if (accept) { const d = await firstPage(J, S.J.S.id, 'Accept and Skip Review', `force-${key}-se-S-accept-skip`); o.acceptSkip = {h1: d.h1, requestPayment: d.requestPayment, radios: (d.radios || []).map((r) => `${r.label}${r.checked ? '*' : ''}`)}; }
                    if (review) { const d = await firstPage(J, S.J.R.id, 'Accept Submission', `force-${key}-se-R-accept`); o.accept = {h1: d.h1, requestPayment: d.requestPayment, radios: (d.radios || []).map((r) => `${r.label}${r.checked ? '*' : ''}`)}; }
                    if (publish.length) {
                        await as(ju('mg'), J);
                        for (const k of publish) { const p = await tryPublish(J, S.J[k].id, S.J[k].pub, `force-${key}-mg-${k}-publish`); o[`publish${k}`] = {feeLine: p.feeLine, allMet: p.allMet, noButton: p.noButton, text: p.text}; }
                    }
                    out[key] = o;
                    S.forceOut = out; save();
                    fact(`force.${key}`, o);
                    return o;
                };
                const ph = (process.env.FORCE || 'b0,req,f,b1,e0,a,b,c,d,g').split(',');
                // b0: in force as seeded (manual, instructions, USD, APC 50)
                if (ph.includes('b0')) await st('b0-in-force', {review: true, publish: ['P']});
                // Q: requested on an accept decision, then to Production
                if (ph.includes('req') && !S.qRequested) {
                    await as(ju('se'), J);
                    out.qReq = await decide(J, S.J.Q.id, 'Accept and Skip Review', 'Request publication fee (50 USD)', 'force-req-se-Q-accept-skip');
                    S.qRequested = true; save();
                    await as(ju('mg'), J);
                    const p = await tryPublish(J, S.J.Q.id, S.J.Q.pub, 'force-req-mg-Q-publish-copyediting');
                    out.qPublishCopyediting = p;
                    if (p.noButton) { await as(ju('se'), J); out.qProd = await decide(J, S.J.Q.id, 'Send To Production', null, 'force-req-se-Q-send-to-production'); }
                    await as(ju('mg'), J);
                    out.qPublish = await tryPublish(J, S.J.Q.id, S.J.Q.pub, 'force-req-mg-Q-publish');
                    S.forceOut = out; save();
                    fact('force.req', {qReq: out.qReq, qPublishCopyediting: out.qPublishCopyediting, qPublish: out.qPublish});
                }
                // f: "Article Processing Charge" emptied
                if (ph.includes('f')) {
                    await as(ju('mg'), J);
                    await typesTab(J, 'force-f-mg-types-before');
                    out.fSave = await saveTypes(J, {publicationFee: ''}, 'force-f-mg-apc-emptied');
                    await st('f-apc-emptied', {review: true, publish: ['P', 'Q']});
                }
                // b1: the APC back at 50: Q's earlier request unpaid again?
                if (ph.includes('b1')) {
                    await as(ju('mg'), J);
                    await typesTab(J, 'force-b1-mg-types-before');
                    out.b1Save = await saveTypes(J, {publicationFee: '50'}, 'force-b1-mg-apc-50');
                    await st('b1-apc-back', {accept: false, publish: ['Q']});
                }
                // e0: "Enable" unticked (the method still set up)
                if (ph.includes('e0')) {
                    await as(ju('mg'), J);
                    out.e0Set = await setPay(J, 'force-e0-mg-enable-unticked', {enabled: false});
                    await st('e0-enable-off', {publish: ['P', 'Q']});
                    await as(ju('mg'), J);
                    out.e0Page = await paymentsPage(J, 'force-e0-mg-payments-page-enable-off');
                    await openTab('paymentTypes');
                    out.e0Save = await saveTypes(J, {}, 'force-e0-mg-types-save-enable-off');
                }
                // a: "Enable" ticked, "Manual Fee Payment", instructions emptied
                if (ph.includes('a')) {
                    await as(ju('mg'), J);
                    out.aSet = await setPay(J, 'force-a-mg-instructions-empty', {enabled: true, plugin: 'ManualPayment', instructions: ''});
                    await st('a-no-instructions', {publish: ['P']});
                }
                // b: instructions filled
                if (ph.includes('b')) {
                    await as(ju('mg'), J);
                    out.bSet = await setPay(J, 'force-b-mg-instructions-filled', {enabled: true, plugin: 'ManualPayment', instructions: INSTR});
                    await st('b-instructions', {publish: ['P']});
                }
                // c: "Paypal Fee Payment", "Account Name" empty
                if (ph.includes('c')) {
                    await as(ju('mg'), J);
                    out.cSet = await setPay(J, 'force-c-mg-paypal-no-account', {enabled: true, plugin: 'PaypalPayment', account: ''});
                    await st('c-paypal-no-account', {publish: ['P']});
                }
                // d: "Account Name" "test"
                if (ph.includes('d')) {
                    await as(ju('mg'), J);
                    out.dSet = await setPay(J, 'force-d-mg-paypal-account', {enabled: true, plugin: 'PaypalPayment', account: 'test'});
                    await st('d-paypal-account', {publish: ['P']});
                    await as(ju('mg'), J);
                    out.backToManual = await setPay(J, 'force-d-mg-back-to-manual', {enabled: true, plugin: 'ManualPayment', instructions: INSTR});
                }
                // g: a fee already recorded ("Waived" on L2, list phase) when the amount is removed, then back
                if (ph.includes('g')) {
                    await as(ju('mg'), J);
                    const o = {};
                    o.before = (await openWf(J, S.J.L2.id, 'force-g-mg-L2-header-in-force')).payments;
                    await typesTab(J, 'force-g-mg-types-before');
                    o.save = await saveTypes(J, {publicationFee: ''}, 'force-g-mg-apc-emptied');
                    o.after = (await openWf(J, S.J.L2.id, 'force-g-mg-L2-header-apc-emptied')).payments;
                    o.listAfter = (await readList(J, 'force-g-mg-list-apc-emptied')).rows;
                    await typesTab(J, 'force-g-mg-types-restore');
                    o.restore = await saveTypes(J, {publicationFee: '50'}, 'force-g-mg-apc-50');
                    o.back = (await openWf(J, S.J.L2.id, 'force-g-mg-L2-header-back')).payments;
                    out.g = {before: o.before, after: o.after, back: o.back, listAfter: o.listAfter};
                    fact('force.g', out.g);
                }
                S.forceOut = out; save();
                fact('force', out);
            });

            // ============================================================ off: td2 (e), payments set up with no currency (Z)
            if (on('off')) await sect('off', async () => {
                const out = {};
                await as(zu('mg'), Z);
                out.set = await setPay(Z, 'off-01-z-mgr-enable-manual-no-currency', {enabled: true, plugin: 'ManualPayment', instructions: INSTR});
                await typesTab(Z, 'off-02-z-mgr-types');
                out.fee = await saveTypes(Z, {publicationFee: '50'}, 'off-03-z-mgr-apc-50');
                await as(zu('se'), Z);
                out.header = (await openWf(Z, S.Z.S, 'off-04-z-se-header')).payments;
                const d = await firstPage(Z, S.Z.S, 'Accept and Skip Review', 'off-05-z-se-accept-skip');
                out.acceptSkip = {h1: d.h1, requestPayment: d.requestPayment, radios: (d.radios || []).map((r) => `${r.label}${r.checked ? '*' : ''}`)};
                fact('off', out);
            });

            // ============================================================ list: Rule 17, td15 (J)
            if (on('list')) await sect('list', async () => {
                const out = {};
                await as(ju('mg'), J);
                out.before = await readList(J, 'list-01-mg-before');
                await as(ju('se'), J);
                out.l1Paid = await saveMenu(J, S.J.L1.id, 'Paid', 'list-02-se-L1-paid');
                await sleep(2500);
                await as(ju('mg'), J);
                out.l2Waived = await saveMenu(J, S.J.L2.id, 'Waived', 'list-03-mg-L2-waived');
                out.after = await readList(J, 'list-04-mg-after-two', {pressRow: true});
                await loc(page, 'Payments tab: list rows', page.locator('#subscriptionsTabs .pkp_controllers_grid:visible tbody tr.gridRow'));
                await as(ju('sm'), J);
                out.sm = await readList(J, 'list-05-sm-after-two');
                // the payer's account merged into another (admin, Users & Roles)
                await as('admin', J);
                const merged = {};
                try {
                    await page.goto(cUrl(J, '/en/management/settings/access'));
                    const table = page.getByRole('table', {name: /Current Users/});
                    await table.waitFor({timeout: T}); await idle(page);
                    const row = table.getByRole('row').filter({hasText: `${ju('au3')}@mail.test`}).first();
                    await row.getByRole('button', {name: /options/i}).click();
                    await page.getByRole('menuitem').first().waitFor({timeout: T});
                    merged.menu = (await page.getByRole('menuitem').allInnerTexts()).map((x) => flat(x));
                    await page.getByRole('menuitem', {name: 'Merge user', exact: true}).click();
                    const dlg = page.getByRole('dialog').last();
                    await dlg.locator('tr.gridRow').first().waitFor({timeout: T});
                    await idle(page); await sleep(600);
                    await snap('list-06-admin-merge-window');
                    const target = dlg.locator('tr.gridRow').filter({hasText: `${ju('rd')}@mail.test`}).first();
                    await target.locator('a.show_extras').click();
                    const link = target.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Merge into this User'});
                    await link.waitFor({timeout: 5000});
                    await link.click();
                    const conf = page.locator('[data-cy="dialog"], .ui-dialog, [role="dialog"]').filter({hasText: 'will not exist afterwards'}).last();
                    await conf.waitFor({timeout: T});
                    const w = page.waitForResponse((r) => r.url().includes('merge-users') && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                    await conf.getByRole('button', {name: 'OK', exact: true}).click();
                    const resp = await w;
                    merged.status = resp ? resp.status() : null;
                    await sleep(1500); await idle(page);
                    await snap('list-07-admin-after-merge');
                } catch (e) { merged.error = flat(e.message, 300); }
                out.merged = merged;
                await as(ju('mg'), J);
                out.afterMerge = await readList(J, 'list-08-mg-after-merge');
                fact('list', out);
            });

            // ============================================================ merged: what the merged payer's record does elsewhere (J, after list)
            if (on('merged')) await sect('merged', async () => {
                const out = {};
                await as(ju('mg'), J);
                out.list = await readList(J, 'merged-01-mg-list-again');
                out.wf = await openWf(J, S.J.L1.id, 'merged-02-mg-L1-workflow');
                const errWin = page.getByRole('dialog').filter({hasText: /^\s*Error/}).last();
                out.errorWindow = await errWin.count();
                if (out.errorWindow) { await errWin.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {}); await sleep(800); }
                out.errorWindowAfterOk = await page.getByRole('dialog').filter({hasText: /^\s*Error/}).count();
                if (await payBtn().count()) {
                    await payBtn().click({timeout: 8000}).catch((e) => { out.menuClick = flat(e.message, 120); });
                    await sleep(2500); await idle(page).catch(() => {});
                    const txt = await payContent().innerText().catch((e) => `ERR ${flat(e.message, 100)}`);
                    await snap('merged-03-mg-L1-payments-menu', {menu: flat(txt, 400)});
                    out.menu = flat(txt, 400);
                }
                out.publish = await tryPublish(J, S.J.L1.id, S.J.L1.pub, 'merged-04-mg-L1-publish');
                // the other record (the waiver) still reads in its own workflow
                out.wfL2 = (await openWf(J, S.J.L2.id, 'merged-05-mg-L2-workflow')).payments;
                if (await payBtn().count()) {
                    await payBtn().click({timeout: 8000}).catch(() => {}); await sleep(2000);
                    out.menuL2 = flat(await payContent().innerText().catch(() => null), 300);
                    out.menuL2Checked = await payContent().locator('input[type=radio]:checked').getAttribute('value').catch(() => null);
                    await snap('merged-06-mg-L2-payments-menu', {menu: out.menuL2});
                }
                fact('merged', out);
            });

            // ============================================================ merge2: the same merge on a second journal (Z: its Author paid, then merged into its Section Editor)
            if (on('merge2')) await sect('merge2', async () => {
                const out = {};
                await as(zu('mg'), Z);
                out.paid = await saveMenu(Z, S.Z.S, 'Paid', 'merge2-01-z-mg-paid');
                out.before = (await readList(Z, 'merge2-02-z-mg-list-before')).rows;
                await as('admin', Z);
                try {
                    await page.goto(cUrl(Z, '/en/management/settings/access'));
                    const table = page.getByRole('table', {name: /Current Users/});
                    await table.waitFor({timeout: T}); await idle(page);
                    await table.getByRole('row').filter({hasText: `${zu('au')}@mail.test`}).first().getByRole('button', {name: /options/i}).click();
                    await page.getByRole('menuitem', {name: 'Merge user', exact: true}).click();
                    const dlg = page.getByRole('dialog').last();
                    await dlg.locator('tr.gridRow').first().waitFor({timeout: T});
                    await idle(page); await sleep(600);
                    const target = dlg.locator('tr.gridRow').filter({hasText: `${zu('se')}@mail.test`}).first();
                    await target.locator('a.show_extras').click();
                    const link = target.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Merge into this User'});
                    await link.click();
                    const conf = page.locator('[data-cy="dialog"], .ui-dialog, [role="dialog"]').filter({hasText: 'will not exist afterwards'}).last();
                    await conf.waitFor({timeout: T});
                    out.confirm = flat(await conf.innerText(), 300);
                    const w = page.waitForResponse((r) => r.url().includes('merge-users') && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                    await conf.getByRole('button', {name: 'OK', exact: true}).click();
                    const resp = await w;
                    out.status = resp ? resp.status() : null;
                    await sleep(1500); await idle(page);
                    await snap('merge2-03-z-admin-after-merge');
                } catch (e) { out.error = flat(e.message, 300); }
                await as(zu('mg'), Z);
                const l = await readList(Z, 'merge2-04-z-mg-list-after');
                out.after = l.rows || l.err;
                fact('merge2', out);
            });

            // ============================================================ reader: Rule 6 (R), each reader-fee setting at the locked galleys
            if (on('reader')) await sect('reader', async () => {
                const out = {};
                const galleys = async (key) => {
                    const o = {};
                    const a = await land(`/index.php/${R}/article/view/${S.R.A}`, `reader-${key}-article`);
                    o.article = {galleyLinks: (a.links || []).filter((l) => /galley|download|view\//.test(l.href) || /PDF|HTML|Subscription|Fee/.test(l.text)).map((l) => `${l.text} → ${l.href}`), feeHits: a.feeHits};
                    const i = await land(`/index.php/${R}/issue/current`, `reader-${key}-issue`);
                    o.issue = {galleyLinks: (i.links || []).filter((l) => /PDF|HTML|Subscription|Fee|Full Issue/.test(l.text)).map((l) => `${l.text} → ${l.href}`), feeHits: i.feeHits};
                    // press the article's PDF and HTML galleys
                    await land(`/index.php/${R}/article/view/${S.R.A}`, `reader-${key}-article-again`);
                    for (const lab of ['PDF', 'HTML']) {
                        const l = page.locator('a.obj_galley_link').filter({hasText: lab}).first();
                        if (await l.count()) {
                            await Promise.all([page.waitForNavigation({timeout: T}).catch(() => null), l.click()]);
                            await idle(page).catch(() => {});
                            const f = await front();
                            await snap(`reader-${key}-press-${lab}`, {front: f});
                            o[`press${lab}`] = {url: f.url, h1: f.h1, tables: f.tables, text: flat(f.text, 300)};
                            await page.goBack().catch(() => {}); await idle(page).catch(() => {});
                        }
                    }
                    out[key] = o;
                    fact(`reader.${key}`, o);
                };
                await as(ru('rd'), R);
                await galleys('r1-article5-member20');
                await visitor();
                await galleys('r1-visitor');
                // r2: "Purchase Article" emptied, "Purchase Issue" 7
                await as(ru('mg'), R);
                await typesTab(R, 'reader-r2-mg-types-before');
                out.r2 = await saveTypes(R, {purchaseArticleFee: '', purchaseIssueFee: '7'}, 'reader-r2-mg-save');
                await as(ru('rd'), R);
                await galleys('r2-issue7');
                // r3: "Only Restrict Access to PDF…" ticked, "Purchase Article" 5 back
                await as(ru('mg'), R);
                await typesTab(R, 'reader-r3-mg-types-before');
                out.r3 = await saveTypes(R, {purchaseArticleFee: '5', purchaseIssueFee: '', restrictOnlyPdf: true}, 'reader-r3-mg-save');
                await as(ru('rd'), R);
                await galleys('r3-only-pdf');
                // r4: no reader fee at all, membership 0
                await as(ru('mg'), R);
                await typesTab(R, 'reader-r4-mg-types-before');
                out.r4 = await saveTypes(R, {purchaseArticleFee: '', purchaseIssueFee: '', restrictOnlyPdf: false, membershipFee: ''}, 'reader-r4-mg-save');
                await as(ru('rd'), R);
                await galleys('r4-no-reader-fee');
                // back to the seed: APC 50, article 5, membership 20
                await as(ru('mg'), R);
                await typesTab(R, 'reader-r5-mg-types-before');
                out.r5 = await saveTypes(R, {publicationFee: '50', purchaseArticleFee: '5', purchaseIssueFee: '', restrictOnlyPdf: false, membershipFee: '20'}, 'reader-r5-mg-restore');
                fact('reader', out);
            });

            // ============================================================ fees: Rule 7, td4, A1 (R: APC 50, article 5, membership 20)
            if (on('fees')) await sect('fees', async () => {
                const out = {};
                const pages = [['home', ''], ['about', '/about'], ['submissions', '/about/submissions'], ['subscriptions', '/about/subscriptions'], ['contact', '/about/contact'],
                    ['editorialTeam', '/about/editorialTeam'], ['privacy', '/about/privacy'], ['issue', '/issue/current'], ['archive', '/issue/archive'], ['article', `/article/view/${S.R.A}`]];
                const readPages = async (prefix) => {
                    const o = {};
                    for (const [k, p] of pages) {
                        const f = await land(`/index.php/${R}${p}`, `${prefix}-${k}`);
                        o[k] = {status: f.status, h1: f.h1, heads: f.heads, feeHits: f.feeHits};
                    }
                    return o;
                };
                await visitor();
                out.visitor = await readPages('fees-visitor');
                await as(ru('rd'), R);
                out.reader = await readPages('fees-reader');
                for (const [k, p] of [['mySubscriptions', '/user/subscriptions'], ['profile', '/user/profile'], ['dashboard', '/dashboard/mySubmissions']]) {
                    const f = await land(`/index.php/${R}${p}`, `fees-reader-${k}`);
                    out.reader[k] = {status: f.status, url: f.url, h1: f.h1, heads: f.heads, feeHits: f.feeHits};
                }
                // the Profile page's tabs
                const tabs = page.locator('[role="tab"]');
                const tn = await tabs.allInnerTexts().catch(() => []);
                out.reader.profileTabs = {};
                for (let i = 0; i < tn.length; i++) {
                    await tabs.nth(i).click().catch(() => {}); await idle(page).catch(() => {}); await sleep(500);
                    const f = await front();
                    await snap(`fees-reader-profile-tab-${i}`, {tab: tn[i]});
                    out.reader.profileTabs[flat(tn[i], 40)] = f.feeHits;
                }
                // the Author: the wizard's start page, then a draft through every step to "Review" and the submit
                await as(ru('au'), R);
                out.author = {};
                const st = await land(`/index.php/${R}/submission`, 'fees-author-wizard-start');
                out.author.start = {h1: st.h1, heads: st.heads, feeHits: st.feeHits};
                if (S.R.D) {
                    try {
                        const {SubmissionWizardPage} = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js'));
                        const w = new SubmissionWizardPage(page, R);
                        await w.goto(S.R.D);
                        await idle(page);
                        const step = async (k) => { const f = await front(); await snap(`fees-author-wizard-${k}`, {front: f}); out.author[k] = {feeHits: f.feeHits, heads: f.heads}; };
                        await step('first');
                        await w.uploadFile().catch((e) => log('upload', flat(e.message, 200)));
                        await step('upload');
                        for (const n of ['Details', 'Contributors', 'For the Editors']) { await w.continueTo(n).catch((e) => log('continue', n, flat(e.message, 150))); await idle(page); await step(n.replace(/ /g, '')); }
                        await w.continueToReview(S.R.D).catch((e) => log('review', flat(e.message, 150)));
                        await idle(page); await sleep(800);
                        await step('Review');
                        await w.submitAndConfirm().catch((e) => log('submit', flat(e.message, 150)));
                        await idle(page); await sleep(1200);
                        await step('complete');
                    } catch (e) { out.author.error = flat(e.message, 300); }
                }
                fact('fees', out);
            });

            // ============================================================ member: td13, A7 (R; Z for payments off)
            if (on('member')) await sect('member', async () => {
                const out = {};
                await as(ru('rd'), R);
                const hdr = await land(`/index.php/${R}`, 'member-01-rd-home');
                out.homeNav = hdr.nav;
                out.homeHits = hdr.feeHits;
                const my = await land(`/index.php/${R}/user/subscriptions`, 'member-02-rd-my-subscriptions');
                out.mySubscriptions = {h1: my.h1, links: my.links.map((l) => l.text), feeHits: my.feeHits, buttons: my.buttons};
                // the Profile page's tabs (a legacy tab bar of links)
                await land(`/index.php/${R}/user/profile`, 'member-02b-rd-profile');
                const ptabs = page.locator('ul.ui-tabs-nav a, .pkp_controllers_tab > ul a');
                const pn = await ptabs.allInnerTexts().catch(() => []);
                out.profileTabs = {};
                for (let i = 0; i < pn.length; i++) {
                    await ptabs.nth(i).click().catch(() => {}); await idle(page).catch(() => {}); await sleep(700);
                    const f = await front();
                    await snap(`member-02c-rd-profile-tab-${i}`, {tab: pn[i], front: f});
                    out.profileTabs[flat(pn[i], 40)] = f.feeHits.filter((h) => /USD|fee|membership|purchase|price/i.test(h));
                }
                const sp = await land(`/index.php/${R}/about/subscriptions`, 'member-03-rd-subscriptions-page');
                out.subscriptionsPage = {h1: sp.h1, heads: sp.heads, links: sp.links.map((l) => l.text), feeHits: sp.feeHits};
                // the address itself
                const c0 = await app.mail.count({to: `${R}pc@mail.test`, subject: 'Manual Payment Notification'}).catch(() => null);
                const pm = await land(`/index.php/${R}/user/payMembership`, 'member-04-rd-pay-membership');
                out.payMembership = {status: pm.status, chain: pm.chain, url: pm.url, h1: pm.h1, tables: pm.tables, text: flat(pm.text, 500), links: pm.links.map((l) => `${l.text} → ${l.href}`)};
                const notify = page.getByRole('link', {name: 'Send notification of payment'});
                if (await notify.count()) {
                    await Promise.all([page.waitForNavigation({timeout: T}).catch(() => null), notify.click()]);
                    await idle(page).catch(() => {});
                    const f = await front();
                    await snap('member-05-rd-notify', {front: f});
                    out.notify = {url: f.url, h1: f.h1, text: flat(f.text, 300), links: f.links.map((l) => `${l.text} → ${l.href}`)};
                    const cont = page.getByRole('link', {name: 'Continue', exact: true});
                    if (await cont.count()) {
                        await Promise.all([page.waitForNavigation({timeout: T}).catch(() => null), cont.click()]);
                        await idle(page).catch(() => {});
                        const f2 = await front();
                        await snap('member-06-rd-continue', {front: f2});
                        out.continue = {url: f2.url, h1: f2.h1, status: null};
                    }
                    await sleep(3000);
                    try {
                        const m = await app.mail.find({to: `${R}pc@mail.test`, subject: 'Manual Payment Notification', timeoutMs: 15_000});
                        const full = await app.mail.fullMessage(m.ID);
                        out.mail = {count: {before: c0, after: await app.mail.count({to: `${R}pc@mail.test`, subject: 'Manual Payment Notification'}).catch(() => null)}, from: m.From, text: flat(full.Text, 800)};
                    } catch (e) { out.mail = {error: flat(e.message, 200), before: c0}; }
                }
                // the article page after: does the member now read anything?
                const art = await land(`/index.php/${R}/article/view/${S.R.A}`, 'member-07-rd-article-after');
                out.articleAfter = (art.links || []).filter((l) => /PDF|HTML/.test(l.text)).map((l) => `${l.text} → ${l.href}`);
                await as(ru('mg'), R);
                out.listAfter = await readList(R, 'member-08-mg-list-after');
                // signed out, and on a journal whose payments are off (Z after the off phase has set it up; the seed Z otherwise)
                await visitor();
                const pv = await land(`/index.php/${R}/user/payMembership`, 'member-09-visitor-pay-membership');
                out.visitor = {status: pv.status, chain: pv.chain, url: pv.url, h1: pv.h1, text: flat(pv.text, 300)};
                const pkr = await land(`/index.php/${app.contextPath}/user/payMembership`, 'member-10-visitor-pk-pay-membership');
                out.visitorPk = {status: pkr.status, chain: pkr.chain, url: pkr.url, h1: pkr.h1, text: flat(pkr.text, 300)};
                // a journal whose payments are off, signed in (a scratch journal: the address queues a payment request before it answers)
                if (!S.O) {
                    const o = tag('u52k2o');
                    await app.api.createContext({tag: o, context: {name: `U52 K2 off ${o}`, contactName: 'K2 Principal O', contactEmail: `${o}pc@mail.test`},
                        users: [{username: `${o}rd`, roles: ['reader'], givenName: 'Ola', familyName: 'Oreader'}]});
                    S.O = o; save();
                }
                await as(`${S.O}rd`, S.O);
                const po = await land(`/index.php/${S.O}/user/payMembership`, 'member-11-reader-off-pay-membership');
                out.readerOff = {status: po.status, chain: po.chain, url: po.url, h1: po.h1, text: flat(po.text, 300)};
                fact('member', out);
            });
        }

        // ================================================================ ctl: the {OJS} controls on OMP and OPS (read only, publicknowledge)
        if (!isOJS && on('ctl')) await sect('ctl', async () => {
            const out = {};
            await as('manager.maya', app.contextPath);
            const p = await paymentsPage(app.contextPath, 'ctl-01-maya-payments');
            out.payments = {status: p.status, h1: p.h1, text: flat(p.text, 200), tabs: p.tabs, navPayments: (p.nav || []).filter((x) => /Payments|Subscriptions|Institutions/.test(x))};
            const pm = await land(`/index.php/${app.contextPath}/user/payMembership`, 'ctl-02-maya-pay-membership');
            out.payMembership = {status: pm.status, h1: pm.h1, text: flat(pm.text, 200)};
            for (const [k, pth] of [['about', '/about'], ['submissions', '/about/submissions']]) {
                const f = await land(`/index.php/${app.contextPath}${pth}`, `ctl-03-maya-${k}`);
                out[k] = {status: f.status, h1: f.h1, feeHits: f.feeHits};
            }
            await as('reader.rosa', app.contextPath);
            const pr = await land(`/index.php/${app.contextPath}/user/payMembership`, 'ctl-04-rosa-pay-membership');
            out.rosaPayMembership = {status: pr.status, h1: pr.h1, text: flat(pr.text, 200)};
            fact('ctl', out);
        });
    } finally {
        record('k2-dialogs', dialogs);
        await close();
    }
});
