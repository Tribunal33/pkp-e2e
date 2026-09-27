// U52 claim check, chunk K1 — the Settings "Payments" tab, who reaches it, the method boxes, and what
// "set up" means on the other screens (docs/specs/U52-payments-and-apcs.md lines 12–151, 320–339,
// 354–358, Coverage 394–443, register A5, OMP1). Chunk plan: .reports/U52/claimcheck-chunks.md.
//
//   PROBE_FEATURE=U52 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U52/K1/k1.js
//   PHASES=seed,explore,…  narrows (state in .reports/U52/ccK1/k1-state-<app>.json; the seed runs once per
//   state file: delete it to drive a later build afresh). The phases run in the order of ALL and each builds on
//   the ones before it (states → request → pay → menu); each stays under the Bash tool's 600 s cap when run alone
//   (PHASES=<one> ONLY=<app>); `states` takes STATES=a,b,b2,c,d,f,off,final to split it.
//   Journals N (no currency, A5) and R (reader fees: purchase article/issue, a subscription) are seeded by
//   their phases; OPS seeds a scratch server for the workflow header in `ops`.
//
// OJS: scratch journal J (tag prefix u52k1), fresh (no payment settings), principal contact "K1 Principal",
//   one account per role level (mg ed pe se se2 ge ce le fu sm au au2 rv rd), an unpublished issue 1(1) 2026;
//   submissions A (Submission stage; se ge ce au2 assigned), B (the same, requested on screen), C (the same;
//   after the principal contact changes), E (review stage; se), D (production with a PDF galley; se ce).
//   Journal M: payments set up through the `payments` key with "Association Membership" 20 (td13).
// OMP: scratch press P (pm ed pe se ce au rd) with PA at the Submission stage (se assigned); the tab typed on
//   screen. OPS: the seeded server, read only (Distribution tabs, side menu, /payments).
// No assertions. Nothing is written to the database outside the screens and the scenario API.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const ALL = ['seed', 'explore', 'roles', 'tab', 'types', 'states', 'request', 'pay', 'menu', 'publish', 'contact', 'smgr', 'membership', 'nocur', 'extra', 'reader', 'omp', 'ops'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k1]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const T = 30_000;

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 2));
    const fact = (k, v) => { record('k1-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.seeded && !isOPS) {
        const t = tag('u52k1');
        S.t = t;
        const U = (k, role) => ({username: `${t}${k}`, roles: [role], givenName: k.toUpperCase(), familyName: `K1${k}`});
        if (isOJS) {
            const roles = [['mg', 'manager'], ['ed', 'editor'], ['pe', 'productionEditor'], ['se', 'sectionEditor'], ['se2', 'sectionEditor'],
                ['ge', 'guestEditor'], ['ce', 'copyeditor'], ['le', 'layoutEditor'], ['fu', 'funding'], ['sm', 'subscriptionManager'],
                ['au', 'author'], ['au2', 'author'], ['rv', 'externalReviewer'], ['rd', 'reader']];
            const r = await app.api.createContext({tag: t, context: {name: 'U52 K1 payments', acronym: 'KONE', contactName: 'K1 Principal', contactEmail: `${t}pc@mail.test`},
                users: roles.map(([k, role]) => U(k, role)),
                issues: [{volume: 1, number: 1, year: 2026, published: false}]});
            S.J = r.path || t;
            log('seed J', S.J, JSON.stringify(r.issues || []));
            const P = [{username: `${t}se`, role: 'sectionEditor'}, {username: `${t}ge`, role: 'guestEditor'}, {username: `${t}ce`, role: 'copyeditor'}, {username: `${t}au2`, role: 'author'}];
            S.s = {};
            const sub = async (k, spec) => {
                const title = `K1 ${k} ${t}`;
                try {
                    const s = await app.api.createSubmission({tag: `${t}${k}`, context: S.J, submitter: `${t}au`, title, ...spec});
                    S.s[k] = {id: s.submissionId, pub: s.publicationId, title};
                    log('seed sub', k, s.submissionId);
                } catch (e) { S.s[k] = {error: flat(e.message, 800)}; log('seed sub FAILED', k, flat(e.message, 800)); }
                save();
            };
            await sub('A', {participants: P});
            await sub('B', {participants: P});
            await sub('C', {participants: P});
            await sub('E', {decisions: ['sendExternalReview'], participants: [P[0]]});
            await sub('D', {decisions: ['skipExternalReview', 'sendToProduction'], participants: [P[0], P[2]], galleys: [{label: 'PDF', file: 'article.pdf'}]});
            // M — payments set up with a membership fee (td13)
            const m = `${t}m`;
            try {
                const rm = await app.api.createContext({tag: m, context: {name: 'U52 K1 membership', contactName: 'K1 Principal', contactEmail: `${m}pc@mail.test`},
                    users: [{username: `${m}mg`, roles: ['manager']}, {username: `${m}rd`, roles: ['reader']}],
                    payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay the membership by transfer.', membershipFee: 20}});
                S.M = rm.path || m; S.m = m;
            } catch (e) { S.M = null; S.Merr = flat(e.message, 800); log('seed M FAILED', S.Merr); }
        } else if (isOMP) {
            const roles = [['pm', 'manager'], ['ed', 'editor'], ['pe', 'productionEditor'], ['se', 'sectionEditor'], ['ce', 'copyeditor'], ['au', 'author'], ['rd', 'reader']];
            const r = await app.api.createContext({tag: t, context: {name: 'U52 K1 press', contactName: 'K1 Principal', contactEmail: `${t}pc@mail.test`},
                users: roles.map(([k, role]) => U(k, role))});
            S.J = r.path || t;
            S.s = {};
            try {
                const s = await app.api.createSubmission({tag: `${t}PA`, context: S.J, submitter: `${t}au`, title: `K1 PA ${t}`, participants: [{username: `${t}se`, role: 'sectionEditor'}]});
                S.s.PA = {id: s.submissionId, pub: s.publicationId, title: `K1 PA ${t}`};
            } catch (e) { S.s.PA = {error: flat(e.message, 800)}; log('seed PA FAILED', flat(e.message, 800)); }
        }
        S.seeded = true;
        save();
        fact('seed', S);
    }
    if (!isOPS && !S.seeded) { log('not seeded'); return; }
    const u = (k) => `${S.t}${k}`;

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: page.url(), at: new Date().toISOString()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    let who = 'visitor';
    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);

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
    const as = async (user, ctx) => {
        await signIn(page, user, {contextPath: ctx}).catch((e) => log('signIn slow', user, flat(e.message, 160)));
        await idle(page).catch(() => {});
        who = user;
    };
    const visitor = async () => { await signOut(page).catch(() => {}); who = 'visitor'; };

    /** The side menu's entries (the PrimeVue panel menu: every group's links are in the DOM). */
    const readNav = () => page.evaluate(() => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const nav = document.querySelector('nav[aria-label="Site Navigation"], .app__nav, nav');
        if (!nav) return null;
        return [...nav.querySelectorAll('a')].map((a) => t(a.innerText)).filter(Boolean);
    }).catch(() => null);
    /** The Settings › Distribution tab bar. */
    const distributionTabs = async (ctx) => {
        await page.goto(cUrl(ctx, '/management/settings/distribution')); await idle(page); await sleep(500);
        return page.locator('[role="tablist"]').first().locator('[role="tab"]').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
    };
    const pane = () => page.locator('#payments').first();
    /** Everything the Payments tab shows: groups, visible fields with labels/values/types, options. */
    const readTab = () => pane().evaluate((root) => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
        const groups = [...root.querySelectorAll('.pkpFormGroup, fieldset')].filter(vis).map((g) => {
            const h = g.querySelector('.pkpFormGroup__heading, legend, h2, h3');
            return {heading: t(h && h.innerText), text: t(g.innerText).slice(0, 600)};
        });
        const fields = [...root.querySelectorAll('input, select, textarea')].map((i) => {
            const lab = (i.id && root.querySelector(`label[for="${i.id}"]`)) || i.closest('label');
            const fs = i.closest('.pkpFormField, fieldset');
            const fl = fs && fs.querySelector('.pkpFormFieldLabel, legend');
            // the "Secret" box: presence, label and visibility
            if (i.name === 'secret') return {tag: 'input', name: 'secret', visible: vis(i), label: t(lab && lab.innerText).slice(0, 200), fieldLabel: t(fl && fl.innerText).slice(0, 120), value: i.value ? '[set]' : ''};
            return {tag: i.tagName.toLowerCase(), type: i.type || null, name: i.name || null, id: i.id || null, visible: vis(i),
                label: t(lab && lab.innerText).slice(0, 200), fieldLabel: t(fl && fl.innerText).slice(0, 120),
                value: i.type === 'checkbox' || i.type === 'radio' ? i.checked : (i.tagName === 'SELECT' ? (i.selectedOptions[0] ? t(i.selectedOptions[0].innerText) + ' [' + i.value + ']' : '') : i.value),
                options: i.tagName === 'SELECT' ? [...i.options].slice(0, 8).map((o) => `${t(o.innerText)} [${o.value}]`) : undefined,
                optionCount: i.tagName === 'SELECT' ? i.options.length : undefined};
        });
        const buttons = [...root.querySelectorAll('button')].filter(vis).map((b) => ({text: t(b.innerText), disabled: b.disabled}));
        const status = [...root.querySelectorAll('[role=status], [role=alert], .pkpFormPage__status, .pkpFieldError, .pkpFormPage__error')].filter(vis).map((e) => t(e.innerText)).filter(Boolean);
        return {groups, fields, buttons, status, text: t(root.innerText).slice(0, 3000)};
    }).catch((e) => ({err: flat(e.message, 200)}));
    const openTab = async (ctx) => {
        const tabs = await distributionTabs(ctx);
        const tb = page.locator('#payments-button');
        if (await tb.count()) { await tb.click(); await idle(page); await sleep(600); }
        return tabs;
    };
    const enableBox = () => pane().locator('input[name="paymentsEnabled"]').first();
    const currencySel = () => pane().locator('select[name="currency"]').first();
    const pluginSel = () => pane().locator('select[name="paymentPluginName"]').first();
    const instrBox = () => pane().locator('textarea[name^="manualInstructions"], input[name^="manualInstructions"]').first();
    const acctBox = () => pane().locator('input[name="accountName"]').first();
    /** Press the tab's "Save", wait for the answer, read the status on the page. */
    async function saveTab(name) {
        const rs = page.waitForResponse((r) => /\/_payments/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await pane().getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await rs;
        const saved = await pane().locator('[role=status]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        await sleep(300);
        const out = {status: resp ? resp.status() : null, method: resp ? `${resp.request().method()} ${resp.request().headers()['x-http-method-override'] || ''}` : null, savedShown: saved,
            statuses: await page.locator('[role=status], [role=alert], .pkpFormPage__status, .pkpFieldError').allInnerTexts().then((a) => a.map((x) => flat(x, 200)).filter(Boolean)).catch(() => []),
            nav: await readNav(), tab: await readTab()};
        await snap(name, {save: out});
        return out;
    }


    // ------------------------------------------------------------------ OJS helpers: the workflow, the decision page, Payment Types, the list
    /** Open a submission's workflow and read its header buttons (text, position) and the whole dialog. */
    async function openWf(subId, name, {author = false, ctx = S.J} = {}) {
        const dash = author ? 'mySubmissions' : 'editorial';
        await page.goto(cUrl(ctx, `/dashboard/${dash}?workflowSubmissionId=${subId}`)).catch(() => {});
        await idle(page).catch(() => {});
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 20_000}).catch(() => {});
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length)[0]; return d && !/Loading/.test(d.innerText) && d.innerText.length > 80; }, null, {timeout: 20_000}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(800);
        const info = await page.evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
            const d = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0];
            if (!d) return {dialog: false, url: location.href, body: t(document.body.innerText).slice(0, 600)};
            const buttons = [...d.querySelectorAll('button, a')].filter(vis).map((b) => { const r = b.getBoundingClientRect(); return {text: t(b.innerText || b.getAttribute('aria-label')), x: Math.round(r.x), y: Math.round(r.y)}; }).filter((b) => b.text);
            const anchor = buttons.find((b) => b.text === 'Library' || b.text === 'Activity Log');
            const header = anchor ? buttons.filter((b) => Math.abs(b.y - anchor.y) <= 12).sort((a, b) => a.x - b.x).map((b) => b.text) : null;
            return {dialog: true, url: location.href, header, hasPayments: buttons.some((b) => b.text === 'Payments'), buttons: buttons.slice(0, 50).map((b) => `${b.text}@${b.x},${b.y}`), text: t(d.innerText).slice(0, 1500)};
        }).catch((e) => ({err: flat(e.message, 200)}));
        await snap(name, {wf: info});
        return info;
    }
    /** Press a decision button on the open workflow and read the decision page's first step; then leave it unrecorded. */
    async function decisionFirstPage(label, name, {leave = true} = {}) {
        const dlg = page.locator('[role="dialog"]:visible').first();
        const btn = dlg.getByRole('button', {name: label, exact: true}).first();
        if (!(await btn.count())) { const r = {absent: true, button: label}; await snap(name, {decision: r}); return r; }
        await btn.click();
        await page.waitForURL(/\/decision\//, {timeout: 20_000}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(1000);
        const d = await page.evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            const main = document.querySelector('main') || document.body;
            const labelOf = (i) => { const l = i.id && document.querySelector(`label[for="${i.id}"]`); return t(l ? l.innerText : (i.closest('label') || i.parentElement || {}).innerText).slice(0, 200); };
            return {url: location.href, h1: [...main.querySelectorAll('h1')].filter(vis).map((e) => t(e.innerText)),
                steps: [...main.querySelectorAll('.pkpSteps__step, [class*="steps__step"], nav li, ol li')].filter(vis).map((e) => t(e.innerText)).filter(Boolean).slice(0, 12),
                radios: [...main.querySelectorAll('input[type=radio]')].map((i) => ({label: labelOf(i), checked: i.checked, visible: vis(i), value: i.value})),
                headings: [...main.querySelectorAll('h2,h3,legend')].filter(vis).map((e) => t(e.innerText)).filter(Boolean).slice(0, 20)};
        }).catch((e) => ({err: flat(e.message, 200)}));
        d.firstIsRequestPayment = !!(d.h1 || []).some((h) => /Request Payment/.test(h));
        await snap(name, {decision: d});
        if (leave) { await page.goto(cUrl(S.J, '/submissions')).catch(() => {}); await idle(page).catch(() => {}); }
        return d;
    }
    const openPaymentsPage = async (tabName, ctx = S.J) => {
        await page.goto(cUrl(ctx, '/payments')).catch(() => {}); await idle(page).catch(() => {}); await sleep(500);
        const tabs = await page.locator('[role="tab"], #subscriptionsTabs a, .ui-tabs-nav a').allInnerTexts().then((a) => a.map((x) => x.trim()).filter(Boolean)).catch(() => []);
        if (tabName) {
            const a = page.locator(`a[name="${tabName}"]`).first();
            if (await a.count()) { await a.click(); await idle(page).catch(() => {}); await sleep(1200); await idle(page).catch(() => {}); }
        }
        return tabs;
    };
    /** The Payment Types form as data. */
    const readTypes = () => page.locator('#paymentTypesForm').first().evaluate((f) => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        return {text: t(f.innerText).slice(0, 2500),
            inputs: [...f.querySelectorAll('input:not([type=hidden])')].map((i) => ({name: i.name, type: i.type, value: i.type === 'checkbox' ? i.checked : i.value, required: i.required || i.getAttribute('aria-required') === 'true'})),
            errors: [...f.querySelectorAll('.error, .pkp_form_error, label.error, .fbvError, [class*=rror]')].filter((e) => e.getClientRects().length).map((e) => t(e.innerText)).filter(Boolean),
            asterisks: [...f.querySelectorAll('label, span.req, .req')].filter((e) => /\*/.test(e.innerText)).map((e) => t(e.innerText)).slice(0, 10)};
    }).catch((e) => ({err: flat(e.message, 200)}));
    /** Type a value in "Article Processing Charge", press Save, read the answer on the page, then reload the tab. */
    async function saveFee(value, name, box = 'publicationFee') {
        const form = page.locator('#paymentTypesForm').first();
        await form.locator(`input[name="${box}"]`).fill(String(value));
        const rs = page.waitForResponse((r) => /savePaymentTypes/.test(r.url()), {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await rs;
        await idle(page).catch(() => {}); await sleep(1200);
        const notices = await page.locator('.pkp_notification, [role=status], [role=alert], .ui-pnotify, .pkpNotification').allInnerTexts().then((a) => a.map((x) => flat(x, 200)).filter(Boolean)).catch(() => []);
        const same = await readTypes();
        await snap(`${name}-same`, {typed: value, status: resp ? resp.status() : null, notices, types: same});
        await openPaymentsPage('paymentTypes');
        const reload = await readTypes();
        await snap(`${name}-reload`, {types: reload});
        return {typed: value, status: resp ? resp.status() : null, notices, sameErrors: same.errors, sameValue: (same.inputs || []).find((i) => i.name === box), reloadValue: (reload.inputs || []).find((i) => i.name === box)};
    }
    /** The list of payments ("Payments" tab of the Payments page). */
    async function readList(name, {pressRow = false} = {}) {
        await openPaymentsPage('payments');
        const grid = page.locator('.pkp_controllers_grid:visible').filter({has: page.locator('th', {hasText: 'Payment Type'})}).last();
        const data = await grid.evaluate((g) => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            return {cols: [...g.querySelectorAll('thead th')].map((th) => t(th.innerText)),
                rows: [...g.querySelectorAll('tbody tr')].filter((r) => r.getClientRects().length).map((r) => t(r.innerText)),
                links: [...g.querySelectorAll('tbody a, tbody button')].filter((r) => r.getClientRects().length).map((a) => t(a.innerText || a.className)),
                paging: t((g.querySelector('.gridPaging, .pkp_linkActions') || {}).innerText), text: t(g.innerText).slice(0, 1500)};
        }).catch((e) => ({err: flat(e.message, 200)}));
        let press = null;
        if (pressRow) {
            const row = grid.locator('tbody tr.gridRow').first();
            if (await row.count()) {
                const before = page.url();
                const nd = dialogs.length;
                await row.click().catch(() => {}); await sleep(1500); await idle(page).catch(() => {});
                press = {urlBefore: before, urlAfter: page.url(), dialogsOpen: await page.locator('[role=dialog]:visible').count(), newBrowserDialogs: dialogs.length - nd};
            }
        }
        await snap(name, {list: data, press});
        return {...data, press};
    }
    /** Set the tab's fields (only those given) and save; returns the save facts, the reload read and the side menu. */
    async function setTab(ctx, name, {enabled, currency, plugin, instructions, account, testMode, clientId, secret}) {
        await openTab(ctx);
        if (enabled !== undefined) { if (enabled) await enableBox().check(); else await enableBox().uncheck(); await sleep(300); }
        if (currency && await currencySel().isVisible().catch(() => false)) await currencySel().selectOption({label: currency}).catch((e) => log('currency', flat(e.message, 120)));
        if (plugin !== undefined && await pluginSel().isVisible().catch(() => false)) await pluginSel().selectOption({label: plugin}).catch((e) => log('plugin', flat(e.message, 120)));
        await sleep(300);
        if (instructions !== undefined && await instrBox().isVisible().catch(() => false)) await instrBox().fill(instructions);
        if (account !== undefined && await acctBox().isVisible().catch(() => false)) await acctBox().fill(account);
        if (clientId !== undefined) await pane().locator('input[name="clientId"]').fill(clientId).catch(() => {});
        if (secret !== undefined) await pane().locator('input[name="secret"]').fill(secret).catch(() => {});
        if (testMode !== undefined) { const b = pane().locator('input[name="testMode"]').first(); if (testMode) await b.check().catch(() => {}); else await b.uncheck().catch(() => {}); }
        const sv = await saveTab(`${name}-saved`);
        await openTab(ctx);
        const reload = await readTab();
        const nav = await readNav();
        await snap(`${name}-reloaded`, {tab: reload, nav});
        const val = (n) => ((reload.fields || []).find((f) => f.name === n) || {}).value;
        return {save: {status: sv.status, savedShown: sv.savedShown, statuses: sv.statuses, navSame: sv.nav}, reload: {enabled: val('paymentsEnabled'), currency: val('currency'), plugin: val('paymentPluginName'), instructions: val('manualInstructions'), account: val('accountName'), testMode: val('testMode'), clientId: val('clientId'), secret: val('secret'), visible: (reload.fields || []).filter((f) => f.visible && f.name).map((f) => f.name)}, nav};
    }
    const navPay = (nav) => (nav || []).filter((x) => /Payments|Institutions|Subscriptions/.test(x));
    const tasksOf = async (name) => {
        await page.goto(cUrl(S.J, '/dashboard/mySubmissions')).catch(() => {}); await idle(page).catch(() => {});
        const b = page.getByRole('button', {name: /^Tasks/}).first();
        if (await b.count()) { await b.click().catch(() => {}); await idle(page).catch(() => {}); await sleep(1200); await idle(page).catch(() => {}); }
        const rows = await page.locator('[role="dialog"]:visible').last().locator('tr').allInnerTexts().then((r) => r.map((x) => flat(x, 300)).filter(Boolean)).catch(() => []);
        const links = await page.locator('[role="dialog"]:visible').last().locator('a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} → ${a.getAttribute('href')}`)).catch(() => []);
        await snap(name, {tasks: rows, links});
        return {rows, links};
    };
    const mailOf = (k) => `${u(k)}@mail.test`;
    async function mailRead(to, subject, contains) {
        try {
            const m = await app.mail.find({to, subject, contains, timeoutMs: 25_000});
            const full = await app.mail.fullMessage(m.ID);
            return {n: await app.mail.count({to, subject, contains}), From: m.From, To: m.To, Cc: m.Cc, Subject: m.Subject, text: flat(full.Text, 2500), links: (full.HTML || '').match(/href="[^"]+"/g)};
        } catch (e) { return {error: flat(e.message, 200)}; }
    }

    try {
        // ================================================================== explore (DOM of the tab, fresh)
        if (on('explore') && !isOPS) await sect('explore', async () => {
            const ctx = S.J;
            await as(isOJS ? u('mg') : u('pm'), ctx);
            const tabs = await openTab(ctx);
            const f0 = await readTab();
            await snap('ex-01-tab-fresh', {tabs, tab: f0, nav: await readNav()});
            await loc(page, 'Distribution: the Payments tab', page.locator('#payments-button'));
            await loc(page, 'Payments tab: the Enable box', enableBox());
            fact('explore.fresh', {tabs, tab: f0});
            if (await enableBox().count()) {
                await enableBox().check(); await sleep(500);
                const f1 = await readTab();
                await snap('ex-02-tab-enable-ticked', {tab: f1});
                fact('explore.ticked', f1);
            }
            await visitor();
        });

        // ================================================================== roles: the tab's address and the Payments page by role (Actors rows 1, 2)
        if (on('roles') && !isOPS) await sect('roles', async () => {
            const out = {};
            const accounts = isOJS ? ['mg', 'ed', 'pe', 'admin', 'sm', 'se', 'ge', 'ce', 'le', 'fu', 'au', 'rv', 'rd', 'visitor'] : ['pm', 'ed', 'pe', 'admin', 'se', 'ce', 'au', 'rd', 'visitor'];
            const round = process.env.ROUND || 'r1';
            for (const k of accounts) {
                if (k === 'visitor') await visitor(); else await as(k === 'admin' ? 'admin' : u(k), S.J);
                const rec = {};
                const chain = [];
                const onResp = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${r.url().replace(app.baseURL, '')}`); } catch (e) { /* none */ } };
                page.on('response', onResp);
                const tabs = await openTab(S.J);
                page.off('response', onResp);
                rec.tab = {chain, url: page.url().replace(app.baseURL, ''), tabs, hasPaymentsTab: tabs.includes('Payments'), enable: await enableBox().count(),
                    body: flat(await page.locator('main, body').first().innerText().catch(() => ''), 300), nav: navPay(await readNav())};
                await snap(`ro-${round}-${k}-tab`, {rec: rec.tab});
                if (isOJS || round === 'r1') {
                    const chain2 = [];
                    const onR2 = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain2.push(`${r.status()} ${r.url().replace(app.baseURL, '')}`); } catch (e) { /* none */ } };
                    page.on('response', onR2);
                    const ptabs = await openPaymentsPage(null);
                    page.off('response', onR2);
                    rec.page = {chain: chain2, url: page.url().replace(app.baseURL, ''), title: await page.title(), tabs: ptabs.slice(0, 12), body: flat(await page.locator('main, body').first().innerText().catch(() => ''), 300)};
                    await snap(`ro-${round}-${k}-payments-page`, {rec: rec.page});
                }
                out[k] = rec;
                log(k, JSON.stringify(rec).slice(0, 600));
            }
            fact(`roles.${round}`, out);
            await visitor();
        });

        // ================================================================== tab: td1 (OJS on J before the td2 states; OMP on P)
        if (on('tab') && !isOPS) await sect('tab', async () => {
            const ctx = S.J;
            const out = {};
            await as(isOJS ? u('mg') : u('pm'), ctx);
            await page.goto(cUrl(ctx, '/submissions')); await idle(page);
            out.navFresh = await readNav();
            // an unsaved change, left three ways: another tab of the page, a reload, the side menu
            await openTab(ctx);
            await enableBox().check(); await sleep(300);
            await pluginSel().selectOption({label: 'Manual Fee Payment'}).catch(() => {});
            await instrBox().fill('Unsaved K1 text.');
            await instrBox().blur().catch(() => {});
            const nd0 = dialogs.length;
            await page.locator('#license-button').click().catch(() => {}); await idle(page); await sleep(500);
            await page.locator('#payments-button').click().catch(() => {}); await idle(page); await sleep(500);
            out.unsavedAfterTabSwitch = {enabled: await enableBox().isChecked().catch(() => null), instructions: await instrBox().inputValue().catch(() => null), browserDialogs: dialogs.slice(nd0)};
            await snap('tb-01-unsaved-after-tab-switch', {read: out.unsavedAfterTabSwitch});
            // the side menu's link to another page
            const nd1 = dialogs.length;
            const navLink = page.locator('nav a').filter({hasText: /^\s*Website\s*$/}).first();
            await loc(page, 'side menu: "Website"', navLink);
            await navLink.click().catch(() => {}); await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(800);
            out.leaveBySideMenu = {url: page.url().replace(app.baseURL, ''), browserDialogs: dialogs.slice(nd1), vueDialogs: await page.locator('[role=dialog]:visible').allInnerTexts().then((a) => a.map((x) => flat(x, 300))).catch(() => [])};
            await snap('tb-02-left-by-side-menu', {read: out.leaveBySideMenu});
            await openTab(ctx);
            out.afterLeave = await readTab();
            await snap('tb-03-back-after-leave', {tab: out.afterLeave});
            // a reload with an unsaved change
            await enableBox().check(); await sleep(300);
            await instrBox().fill('Unsaved K1 text 2.'); await instrBox().blur().catch(() => {});
            const nd2 = dialogs.length;
            await page.reload().catch(() => {}); await idle(page).catch(() => {});
            await page.locator('#payments-button').click().catch(() => {}); await idle(page); await sleep(500);
            out.afterReload = {browserDialogs: dialogs.slice(nd2), enabled: await enableBox().isChecked().catch(() => null)};
            await snap('tb-04-after-reload-unsaved', {read: out.afterReload});
            // save 1: Enable, Manual, "Pay by transfer." (no currency)
            out.save1 = await setTab(ctx, 'tb-05-save1', {enabled: true, plugin: 'Manual Fee Payment', instructions: 'Pay by transfer.'});
            await page.goto(cUrl(ctx, '/submissions')); await idle(page);
            out.save1.navOtherPage = await readNav();
            // untick, Save, reload, tick again
            out.save2 = await setTab(ctx, 'tb-06-save-unticked', {enabled: false});
            await page.goto(cUrl(ctx, '/submissions')); await idle(page);
            out.save2.navOtherPage = await readNav();
            await openTab(ctx);
            await enableBox().check(); await sleep(400);
            out.retick = await readTab();
            await snap('tb-07-reticked', {tab: out.retick});
            // hidden fields are stored too: change the instructions, untick (hidden), Save; reload, tick
            await instrBox().fill('Pay by transfer, v2.');
            await enableBox().uncheck(); await sleep(300);
            const svh = await saveTab('tb-08-save-hidden-change');
            await openTab(ctx);
            await enableBox().check(); await sleep(400);
            out.hidden = {save: {status: svh.status, savedShown: svh.savedShown}, instructionsAfter: await instrBox().inputValue().catch(() => null)};
            await snap('tb-09-hidden-change-reloaded', {read: out.hidden});
            // both methods' groups with each method chosen
            out.groupsBy = {};
            for (const m of ['Paypal Fee Payment', 'Manual Fee Payment']) {
                await pluginSel().selectOption({label: m}); await sleep(400);
                const r = await readTab();
                out.groupsBy[m] = {groups: r.groups.map((g) => g.heading), visible: r.fields.filter((f) => f.visible && f.name).map((f) => (f.name === 'secret' ? f.name : `${f.name}:${f.type}`))};
            }
            await snap('tb-10-groups-by-method', {groupsBy: out.groupsBy});
            await loc(page, 'Payments tab: "Currency" select', currencySel());
            await loc(page, 'Payments tab: "Payment Plugins" select', pluginSel());
            await loc(page, 'Payments tab: "Manual Payment Instructions"', instrBox());
            await loc(page, 'Payments tab: "Account Name"', acctBox());
            await loc(page, 'Payments tab: "Secret"', pane().locator('input[name="secret"]'));
            await loc(page, 'Payments tab: "Test Mode" box', pane().locator('input[name="testMode"]'));
            await loc(page, 'Payments tab: "Save"', pane().getByRole('button', {name: 'Save', exact: true}));
            fact('tab', out);
            await visitor();
        });

        // ================================================================== types: td3 on J (state (a) saved first), the empty list
        if (on('types') && isOJS) await sect('types', async () => {
            const out = {};
            await as(u('mg'), S.J);
            out.stateA = await setTab(S.J, 'ty-00-state-a', {enabled: true, plugin: 'Manual Fee Payment', instructions: '', currency: ''});
            out.tabs = await openPaymentsPage('paymentTypes');
            out.fresh = await readTypes();
            await snap('ty-01-payment-types-fresh', {tabs: out.tabs, types: out.fresh});
            await loc(page, 'Payments page: the "Payment Types" tab', page.locator('a[name="paymentTypes"]'));
            await loc(page, 'Payment Types: "Article Processing Charge" box', page.locator('#paymentTypesForm input[name="publicationFee"]'));
            await loc(page, 'Payment Types: "Save"', page.locator('#paymentTypesForm').getByRole('button', {name: 'Save', exact: true}));
            out.saves = [];
            for (const [v, n] of [['abc', 'abc'], ['-5', 'neg'], ['10,50', 'comma'], ['12.50', 'dec'], ['0', 'zero'], ['50', 'fifty']]) {
                const r = await saveFee(v, `ty-02-fee-${n}`);
                out.saves.push(r);
                log('fee', v, JSON.stringify(r).slice(0, 500));
            }
            out.emptyList = await readList('ty-03-list-empty');
            fact('types', out);
            await visitor();
        });

        // ================================================================== states: td2 (a)–(f), payments off, on submission A (and E)
        if (on('states') && isOJS) await sect('states', async () => {
            const out = S.statesOut || {};
            const only = (process.env.STATES || 'a,b,b2,c,d,f,off,final').split(',');
            const probe = async (st, {more = false} = {}) => {
                const r = {};
                await as(u('mg'), S.J);
                r.mgHeader = (await openWf(S.s.A.id, `st-${st}-mg-wf-A`)).header;
                await openPaymentsPage('subscriptionPolicies');
                r.policiesNote = flat(await page.locator('#subscriptionPolicies, form[id*="subscriptionPolicies"], #subscriptionPoliciesForm').first().innerText().catch(() => null), 3000);
                r.policiesNote = r.policiesNote && (r.policiesNote.match(/Note: To enable these options[^.]*\./) || ['(no note)'])[0];
                r.policiesDisabled = await page.locator('#subscriptionPoliciesForm input[disabled], form input[name*="Payment"][disabled], input[name="enableRenewalNotification"][disabled]').count().catch(() => null);
                await snap(`st-${st}-mg-policies`, {note: r.policiesNote});
                await as(u('se'), S.J);
                r.seHeader = (await openWf(S.s.A.id, `st-${st}-se-wf-A`)).header;
                const d = await decisionFirstPage('Accept and Skip Review', `st-${st}-se-skip-A`);
                r.skip = {h1: d.h1, firstIsRequestPayment: d.firstIsRequestPayment, radios: (d.radios || []).map((x) => `${x.label}${x.checked ? ' (checked)' : ''}`), steps: d.steps};
                if (more) {
                    await openWf(S.s.E.id, `st-${st}-se-wf-E`);
                    const e = await decisionFirstPage('Accept Submission', `st-${st}-se-accept-E`);
                    r.acceptE = {h1: e.h1, firstIsRequestPayment: e.firstIsRequestPayment, radios: (e.radios || []).map((x) => x.label)};
                    await openWf(S.s.A.id, `st-${st}-se-wf-A2`);
                    const sr = await decisionFirstPage('Send for Review', `st-${st}-se-sendreview-A`);
                    r.sendForReview = {h1: sr.h1, firstIsRequestPayment: sr.firstIsRequestPayment};
                }
                out[st] = r;
                S.statesOut = out; save();
                log(`state ${st}`, JSON.stringify(r).slice(0, 900));
                return r;
            };
            const mg = async () => as(u('mg'), S.J);
            const fee = async (v, n) => { await mg(); await openPaymentsPage('paymentTypes'); return saveFee(v, n); };
            if (only.includes('a')) { await mg(); out.aTab = (await setTab(S.J, 'st-a-tab', {enabled: true, plugin: 'Manual Fee Payment', instructions: '', currency: ''})).reload; await probe('a', {more: true}); }
            if (only.includes('b')) { await mg(); out.bTab = (await setTab(S.J, 'st-b-tab', {instructions: 'Pay by transfer.\nSecond line: IBAN K1.'})).reload; await probe('b'); }
            if (only.includes('b2')) { await mg(); out.b2Tab = (await setTab(S.J, 'st-b2-tab', {currency: 'US Dollar'})).reload; await probe('b2', {more: true}); }
            if (only.includes('c')) { await mg(); out.cTab = (await setTab(S.J, 'st-c-tab', {plugin: 'Paypal Fee Payment', account: ''})).reload; await probe('c'); }
            if (only.includes('d')) { await mg(); out.dTab = (await setTab(S.J, 'st-d-tab', {account: 'test'})).reload; await probe('d'); }
            if (only.includes('f')) {
                await mg(); out.fTab = (await setTab(S.J, 'st-f-tab', {plugin: 'Manual Fee Payment'})).reload;
                out.fFee = await fee('', 'st-f-fee-empty');
                await probe('f');
                out.fFeeBack = await fee('50', 'st-f-fee-back');
            }
            if (only.includes('off')) { await mg(); out.offTab = (await setTab(S.J, 'st-off-tab', {enabled: false})).reload; await probe('off'); }
            if (only.includes('final')) { await mg(); out.finalTab = (await setTab(S.J, 'st-final-tab', {enabled: true})).reload; await probe('final'); }
            fact('states', out);
            await visitor();
        });

        // ------------------------------------------------------------------ shared: record an accept with the fee requested
        async function requestOn(sub, label, {ctx = S.J, editor = u('se')} = {}) {
            await as(editor, ctx);
            await openWf(sub.id, `${label}-wf`, {ctx});
            const d = await decisionFirstPage('Accept and Skip Review', `${label}-page1`, {leave: false});
            const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
            const cont = page.getByRole('button', {name: 'Continue', exact: true});
            const pages = [];
            for (let i = 2; i < 8 && !(await rec.isVisible().catch(() => false)); i++) {
                await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
                await cont.first().click(); await idle(page).catch(() => {}); await sleep(1200);
                await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
                pages.push(await page.locator('main h1').first().innerText().catch(() => null));
            }
            await sleep(800);
            await rec.click().catch((e) => log('record', flat(e.message, 120)));
            await idle(page).catch(() => {}); await sleep(1500);
            const after = {url: page.url().replace(app.baseURL, ''), dialogs: await page.locator('[role=dialog]:visible').allInnerTexts().then((a) => a.map((x) => flat(x, 400))).catch(() => [])};
            await snap(`${label}-recorded`, {after, pages});
            return {page1: {h1: d.h1, radios: (d.radios || []).map((x) => `${x.label}${x.checked ? ' (checked)' : ''}`)}, pages, after};
        }
        /** Open a payment address and read the page (the frontend has no main landmark). */
        async function payPage(url, name) {
            const chain = [];
            const onResp = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${r.url().replace(app.baseURL, '')}`); } catch (e) { /* none */ } };
            page.on('response', onResp);
            await page.goto(url).catch((e) => chain.push(`goto error ${flat(e.message, 120)}`));
            await idle(page).catch(() => {}); await sleep(500);
            page.off('response', onResp);
            const f = await page.evaluate(() => {
                const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
                const main = document.querySelector('.page, .pkp_structure_main, main') || document.body;
                return {title: document.title, h1: [...document.querySelectorAll('h1, h2')].map((e) => t(e.innerText)).filter(Boolean).slice(0, 6),
                    text: t(main.innerText).slice(0, 1500), html: (main.innerHTML || '').replace(/\s+/g, ' ').slice(0, 3000),
                    buttons: [...main.querySelectorAll('button, a.cmp_button, input[type=submit], a')].map((b) => `${t(b.innerText || b.value)} → ${b.getAttribute('href') || ''}`).filter((x) => !/^ →/.test(x)).slice(0, 20),
                    loginForm: !!document.querySelector('form.cmp_form.login, form#login, .page_login form')};
            }).catch((e) => ({err: flat(e.message, 200)}));
            f.url = page.url().replace(app.baseURL, ''); f.chain = chain;
            await snap(name, {pay: f});
            return f;
        }
        const payLinkFrom = (m) => { const l = (m.links || []).map((x) => x.slice(6, -1).replace(/&amp;/g, '&')).find((x) => /payment\/pay\//.test(x)); return l || null; };

        // ================================================================== request: the APC requested on B (Actors rows 3, 7; line 22–23)
        if (on('request') && isOJS) await sect('request', async () => {
            const out = {};
            out.req = await requestOn(S.s.B, 'rq-B');
            out.mailAu = await mailRead(mailOf('au'), 'Payment Request Notification', S.s.B.title);
            out.mailAu2 = await mailRead(mailOf('au2'), 'Payment Request Notification', S.s.B.title);
            out.mailAuAny = await mailRead(mailOf('au'), 'Payment Request Notification');
            S.payLink = payLinkFrom(out.mailAuAny.error ? out.mailAu : out.mailAuAny); save();
            out.payLink = S.payLink;
            await as(u('au'), S.J); out.tasksAu = await tasksOf('rq-au-tasks');
            await as(u('au2'), S.J); out.tasksAu2 = await tasksOf('rq-au2-tasks');
            fact('request', out);
            await visitor();
        });

        // ================================================================== pay: the payment page (Actors row 5; Fields; Rule 3; Setting 10)
        if (on('pay') && isOJS) await sect('pay', async () => {
            const out = {};
            const link = S.payLink;
            if (!link) throw new Error('no pay link');
            // signed out
            await visitor();
            out.signedOut = await payPage(link, 'py-01-signed-out');
            // sign in on that login page
            if (out.signedOut.loginForm) {
                await page.locator('input[name=username]').fill(u('au'));
                await page.evaluate(() => document.querySelectorAll('input[name=password]').forEach((i) => i.removeAttribute('maxlength')));
                await page.locator('input[name=password]').fill(`${u('au')}${u('au')}`);
                await page.locator('form.cmp_form.login button[type=submit], .page_login form button').first().click().catch(() => {});
                await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
                out.afterLogin = {url: page.url().replace(app.baseURL, '')};
                who = u('au');
                await snap('py-02-after-login', {after: out.afterLogin});
            }
            out.au = await payPage(link, 'py-03-au');
            await loc(page, 'payment page: "Send notification of payment"', page.getByRole('link', {name: 'Send notification of payment'}).or(page.getByRole('button', {name: 'Send notification of payment'})));
            await as(u('au2'), S.J); out.au2 = await payPage(link, 'py-04-au2');
            // send the notification as the Author
            await as(u('au'), S.J);
            await payPage(link, 'py-06-au-before-send');
            const btn = page.getByRole('link', {name: 'Send notification of payment'}).or(page.getByRole('button', {name: 'Send notification of payment'})).first();
            await btn.click().catch((e) => log('send', flat(e.message, 120)));
            await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
            out.sent = await page.evaluate(() => ({title: document.title, text: (document.querySelector('.page, main') || document.body).innerText.replace(/\s+/g, ' ').trim().slice(0, 600),
                links: [...document.querySelectorAll('.page a, main a')].map((a) => `${a.innerText.trim()} → ${a.getAttribute('href')}`).slice(0, 10)})).catch(() => null);
            out.sent.url = page.url().replace(app.baseURL, '');
            await snap('py-07-sent', {sent: out.sent});
            const cont = page.getByRole('link', {name: 'Continue', exact: true}).first();
            if (await cont.count()) { await cont.click().catch(() => {}); await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); out.continueTo = page.url().replace(app.baseURL, ''); await snap('py-08-continue'); }
            out.notifyMail = await mailRead(`${S.t}pc@mail.test`, 'Manual Payment Notification');
            // Rule 3: the method changed after the request
            await as(u('mg'), S.J);
            out.toPaypal = (await setTab(S.J, 'py-09-tab-paypal', {plugin: 'Paypal Fee Payment', account: 'test'})).reload;
            await as(u('au'), S.J); out.auPaypal = await payPage(link, 'py-10-au-paypal');
            await as(u('mg'), S.J);
            out.toPaypalTest = (await setTab(S.J, 'py-11-tab-paypal-test', {testMode: true, clientId: 'k1-client', secret: 'k1-probe'})).reload;
            await as(u('au'), S.J); out.auPaypalTest = await payPage(link, 'py-12-au-paypal-test');
            await as(u('mg'), S.J);
            out.backManual = (await setTab(S.J, 'py-13-tab-manual', {plugin: 'Manual Fee Payment', testMode: false})).reload;
            await as(u('au'), S.J); out.auManualAgain = await payPage(link, 'py-14-au-manual-again');
            fact('pay', out);
            await visitor();
        });

        // ================================================================== menu: the workflow's "Payments" menu on B (Actors row 4; lines 104–107; the list)
        if (on('menu') && isOJS) await sect('menu', async () => {
            const out = {headers: {}};
            for (const k of ['mg', 'ed', 'pe', 'admin', 'se', 'se2', 'ge', 'ce', 'le', 'au']) {
                await as(k === 'admin' ? 'admin' : u(k), S.J);
                const w = await openWf(S.s.B.id, `mn-01-${k}-wf-B`, {author: k === 'au'});
                out.headers[k] = {dialog: w.dialog, header: w.header, hasPayments: w.hasPayments, url: (w.url || '').replace(app.baseURL, ''), body: w.dialog ? undefined : w.body};
                if (k === 'au') { const w2 = await openWf(S.s.B.id, 'mn-01-au-wf-B-editorial'); out.headers.auEditorial = {dialog: w2.dialog, header: w2.header, hasPayments: w2.hasPayments, url: (w2.url || '').replace(app.baseURL, ''), body: w2.body}; }
            }
            const menuSet = async (k, choice, name) => {
                await as(k === 'admin' ? 'admin' : u(k), S.J);
                await openWf(S.s.B.id, `${name}-wf`);
                const dlg = page.locator('[role="dialog"]:visible').first();
                const b = dlg.getByRole('button', {name: 'Payments', exact: true}).first();
                if (!(await b.count())) return {absent: true};
                await b.click(); await idle(page).catch(() => {}); await sleep(1200);
                const panel = await page.evaluate(() => {
                    const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
                    const radios = [...document.querySelectorAll('input[type=radio]')].filter((i) => i.getClientRects().length || (i.closest('label') && i.closest('label').getClientRects().length));
                    const box = radios.length ? radios[0].closest('form, [role=menu], [role=dialog], .pkpDropdown, div[class*=opover], div[class*=ropdown]') : null;
                    return {radios: radios.map((i) => { const l = i.id && document.querySelector(`label[for="${i.id}"]`); return {label: t(l ? l.innerText : (i.closest('label') || {}).innerText), checked: i.checked, name: i.name}; }),
                        text: box ? t(box.innerText).slice(0, 600) : null};
                }).catch((e) => ({err: flat(e.message, 200)}));
                await snap(`${name}-open`, {panel});
                let saved = null;
                if (choice) {
                    await page.getByRole('radio', {name: choice, exact: true}).first().check({force: true}).catch((e) => log('radio', flat(e.message, 100)));
                    const rs = page.waitForResponse((r) => /\/payment/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    const saveBtn = page.locator('form').filter({has: page.getByRole('radio', {name: choice, exact: true})}).getByRole('button', {name: 'Save', exact: true}).first();
                    await saveBtn.click().catch((e) => log('menu save', flat(e.message, 100)));
                    const resp = await rs;
                    await sleep(1500);
                    saved = {status: resp ? resp.status() : null, url: resp ? resp.url().replace(app.baseURL, '') : null,
                        statuses: await page.locator('[role=status], [role=alert], .pkpFormPage__status').allInnerTexts().then((a) => a.map((x) => flat(x, 120)).filter(Boolean)).catch(() => []),
                        panelStillOpen: await page.getByRole('radio', {name: choice, exact: true}).first().isVisible().catch(() => false)};
                    await snap(`${name}-saved`, {saved});
                    // reopen to read the stored choice
                    await openWf(S.s.B.id, `${name}-wf-again`);
                    const b2 = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Payments', exact: true}).first();
                    await b2.click().catch(() => {}); await idle(page).catch(() => {}); await sleep(1200);
                    saved.after = await page.locator('input[type=radio]').evaluateAll((rs) => rs.map((i) => `${i.value}:${i.checked}`)).catch(() => null);
                    await snap(`${name}-reopened`, {after: saved.after});
                }
                return {panel, saved};
            };
            await loc(page, 'workflow header: "Payments"', page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Payments', exact: true}));
            out.mgOpen = await menuSet('mg', null, 'mn-02-mg');
            out.cePaid = await menuSet('ce', 'Paid', 'mn-03-ce-paid');
            await as(u('mg'), S.J); out.list1 = await readList('mn-04-list-after-ce-paid', {pressRow: true});
            out.mgWaived = await menuSet('mg', 'Waived', 'mn-05-mg-waived');
            await as(u('mg'), S.J); out.list2 = await readList('mn-06-list-after-waived');
            out.mgUnpaid = await menuSet('mg', 'Unpaid', 'mn-07-mg-unpaid');
            await as(u('mg'), S.J); out.list3 = await readList('mn-08-list-after-unpaid');
            out.mgPaid = await menuSet('mg', 'Paid', 'mn-09-mg-paid');
            await as(u('mg'), S.J); out.list4 = await readList('mn-10-list-after-mg-paid', {pressRow: true});
            // the Author's task after the record
            await as(u('au'), S.J); out.tasksAfter = await tasksOf('mn-11-au-tasks-after');
            fact('menu', out);
            await visitor();
        });

        // ================================================================== publish: the unpaid fee and publishing on D (line 25)
        if (on('publish') && isOJS) await sect('publish', async () => {
            const out = {};
            const tryPublish = async (name) => {
                await openWf(S.s.D.id, `${name}-wf`);
                const dlg = page.locator('[role="dialog"]:visible').first();
                const btn = dlg.getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
                if (!(await btn.count())) return {absent: true};
                const label = await btn.innerText();
                const n0 = await page.locator('[role=dialog]:visible').count();
                await btn.click(); await idle(page).catch(() => {}); await sleep(2000); await idle(page).catch(() => {});
                if ((await page.locator('[role=dialog]:visible').count()) <= n0) {
                    // the header button lands on the publication page; its own "Schedule For Publication" opens the window
                    await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).last().click().catch(() => {});
                    await page.waitForFunction((n) => [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).length > n, n0, {timeout: 15_000}).catch(() => {});
                    await idle(page).catch(() => {}); await sleep(2000);
                }
                const tops = await page.locator('[role=dialog]:visible').allInnerTexts().then((a) => a.map((x) => flat(x, 1200))).catch(() => []);
                const top = page.locator('[role=dialog]:visible').last();
                const buttons = await top.locator('button').allInnerTexts().then((a) => a.map((x) => x.trim()).filter(Boolean)).catch(() => []);
                await snap(`${name}-window`, {pressed: label, tops, buttons});
                // fill the version details, keep the preselected issue choice, and Confirm: what answers
                await top.locator('select[name="versionStage"]').selectOption('VoR').catch(() => {});
                await top.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
                await top.locator('input[name="assignment"]:checked').first().waitFor({timeout: 20_000}).catch(() => {});
                const assignment = await top.locator('input[name="assignment"]').evaluateAll((rs) => rs.map((r) => `${r.value}:${r.checked}`)).catch(() => null);
                const rs = page.waitForResponse((r) => /\/publish|\/publications\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 20_000}).catch(() => null);
                await top.getByRole('button', {name: 'Confirm', exact: true}).click().catch(() => {});
                const resp = await rs;
                await idle(page).catch(() => {}); await sleep(2500);
                const after = {status: resp ? resp.status() : null, url: resp ? resp.url().replace(app.baseURL, '') : null,
                    dialogs: await page.locator('[role=dialog]:visible').allInnerTexts().then((a) => a.map((x) => flat(x, 900))).catch(() => []),
                    errors: await page.locator('.pkpFormPage__error, .pkpFieldError, [role=alert], .pkpNotification').allInnerTexts().then((a) => a.map((x) => flat(x, 300)).filter(Boolean)).catch(() => [])};
                await snap(`${name}-confirmed`, {after, assignment});
                const c = page.locator('[role=dialog]:visible').last().getByRole('button', {name: /^(Cancel|Close|OK)$/}).last();
                if (await c.count()) await c.click().catch(() => {});
                await sleep(800);
                return {pressed: label, last: tops[tops.length - 1].slice(0, 200), buttons, assignment, after};
            };
            const choose = async (choice, name) => {
                await openWf(S.s.D.id, `${name}-wf`);
                const dlg = page.locator('[role="dialog"]:visible').first();
                await dlg.getByRole('button', {name: 'Payments', exact: true}).first().click().catch(() => {});
                await sleep(1200);
                await page.getByRole('radio', {name: choice, exact: true}).first().check({force: true}).catch(() => {});
                const rs = page.waitForResponse((r) => /\/payment/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await page.locator('form').filter({has: page.getByRole('radio', {name: choice, exact: true})}).getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
                const resp = await rs;
                await snap(`${name}-saved`);
                return resp ? resp.status() : null;
            };
            await as(u('mg'), S.J);
            out.unpaidSave = await choose('Unpaid', 'pb-00-unpaid');
            out.unpaid = await tryPublish('pb-01-unpaid');
            // record the fee as paid, then try again
            out.paidSave = await choose('Paid', 'pb-03-paid');
            out.paid = await tryPublish('pb-04-paid');
            fact('publish', out);
            await visitor();
        });

        // ================================================================== contact: Setting 10 (the principal contact) on C
        if (on('contact') && isOJS) await sect('contact', async () => {
            const out = {};
            await as(u('mg'), S.J);
            await page.goto(cUrl(S.J, '/management/settings/context')); await idle(page);
            await page.locator('#contact-button').first().click().catch(() => {}); await idle(page); await sleep(600);
            const nm = page.locator('#contact-contactName-control');
            const em = page.locator('#contact-contactEmail-control');
            await loc(page, 'Settings › Journal › Contact: principal contact name', nm);
            out.before = {name: await nm.inputValue().catch(() => null), email: await em.inputValue().catch(() => null)};
            await nm.fill('K1 Second Contact'); await em.fill(`${S.t}pc2@mail.test`);
            await page.locator('#contact-supportName-control').fill('K1 Support').catch(() => {});
            await page.locator('#contact-supportEmail-control').fill(`${S.t}sup@mail.test`).catch(() => {});
            await page.locator('form').filter({has: nm}).getByRole('button', {name: 'Save', exact: true}).click().catch(() => {});
            out.saved = await page.locator('[role=status]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
            await snap('ct-01-contact-saved', {out});
            const ck = `C${Date.now() % 100000}`;
            const cs = await app.api.createSubmission({tag: `${S.t}${ck}`, context: S.J, submitter: u('au'), title: `K1 ${ck} ${S.t}`, participants: [{username: u('se'), role: 'sectionEditor'}]});
            S.s[ck] = {id: cs.submissionId, title: `K1 ${ck} ${S.t}`}; save();
            out.req = await requestOn(S.s[ck], 'ct-02-C');
            out.mailAu = await mailRead(mailOf('au'), 'Payment Request Notification', S.s[ck].title);
            const link = payLinkFrom(out.mailAu);
            out.link = link;
            if (link) {
                await as(u('au'), S.J);
                const f = await payPage(link, 'ct-03-au-pay-C');
                out.page = {h1: f.h1, text: f.text && f.text.slice(0, 300)};
                const btn = page.getByRole('link', {name: 'Send notification of payment'}).or(page.getByRole('button', {name: 'Send notification of payment'})).first();
                await btn.click().catch(() => {}); await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
                await snap('ct-04-sent');
                out.notifyNew = await mailRead(`${S.t}pc2@mail.test`, 'Manual Payment Notification');
                out.notifyOldCount = await app.mail.count({to: `${S.t}pc@mail.test`, subject: 'Manual Payment Notification'}).catch(() => null);
            }
            fact('contact', out);
            await visitor();
        });

        // ================================================================== smgr: the Subscription Manager on the Payments page (td2 end; Actors row 2)
        if (on('smgr') && isOJS) await sect('smgr', async () => {
            const out = {};
            await as(u('sm'), S.J);
            await page.goto(cUrl(S.J, '/submissions')).catch(() => {}); await idle(page).catch(() => {});
            out.nav = await readNav();
            out.tabs = await openPaymentsPage('paymentTypes');
            out.types = await readTypes();
            await snap('sm-01-payment-types', {tabs: out.tabs, types: out.types});
            out.save = await saveFee('50', 'sm-02-save');
            out.list = await readList('sm-03-list');
            fact('smgr', out);
            await visitor();
        });

        // ================================================================== membership: td13 on M
        if (on('membership') && isOJS && S.M) await sect('membership', async () => {
            const out = {};
            const M = S.M;
            await as(`${S.m}rd`, M);
            const read = async (p, name) => {
                await page.goto(cUrl(M, p)).catch(() => {}); await idle(page).catch(() => {});
                const f = await page.evaluate(() => {
                    const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
                    const body = t(document.body.innerText).replace(/U52 K1 membership/g, 'THE JOURNAL');
                    return {title: document.title, membership: (body.match(/[^.]{0,80}[Mm]ember[^.]{0,80}/g) || []).slice(0, 6), nav: [...document.querySelectorAll('header a, nav a')].map((a) => t(a.innerText)).filter(Boolean).slice(0, 30), bodyStart: body.slice(0, 500)};
                }).catch((e) => ({err: flat(e.message, 200)}));
                f.url = page.url().replace(app.baseURL, '');
                await snap(name, {read: f});
                return f;
            };
            out.home = await read('/index', 'ms-01-home');
            out.about = await read('/about', 'ms-02-about');
            out.aboutSubs = await read('/about/subscriptions', 'ms-03-about-subscriptions');
            out.mySubs = await read('/user/subscriptions', 'ms-04-my-subscriptions');
            out.profile = await read('/user/profile', 'ms-05-profile');
            out.payMembership = await read('/user/payMembership', 'ms-06-pay-membership');
            await visitor();
            out.payMembershipSignedOut = await read('/user/payMembership', 'ms-07-pay-membership-signed-out');
            fact('membership', out);
        });

        // ================================================================== nocur: a journal set up with no currency (A5; Settings 2's other end)
        if (on('nocur') && isOJS) await sect('nocur', async () => {
            const out = {};
            if (!S.N) {
                const n = `${S.t}n`;
                const r = await app.api.createContext({tag: n, context: {name: 'U52 K1 no currency', contactName: 'K1 N Principal', contactEmail: `${n}pc@mail.test`},
                    users: [{username: `${n}mg`, roles: ['manager']}, {username: `${n}se`, roles: ['sectionEditor']}, {username: `${n}au`, roles: ['author']}],
                    payments: {paymentPluginName: 'ManualPayment', manualInstructions: 'Pay K1 N by transfer.', publicationFee: 50}});
                S.N = r.path || n; S.n = n;
                const sb = await app.api.createSubmission({tag: `${n}X`, context: S.N, submitter: `${n}au`, title: `K1 N X ${n}`, participants: [{username: `${n}se`, role: 'sectionEditor'}]});
                S.sN = {id: sb.submissionId, title: `K1 N X ${n}`};
                save();
            }
            await as(`${S.n}mg`, S.N);
            await openTab(S.N);
            out.tab = await readTab();
            await snap('nc-01-tab', {tab: out.tab});
            out.req = await requestOn(S.sN, 'nc-02-X', {ctx: S.N, editor: `${S.n}se`});
            out.mail = await mailRead(`${S.n}au@mail.test`, 'Payment Request Notification');
            const link = payLinkFrom(out.mail);
            if (link) {
                await as(`${S.n}au`, S.N);
                const f = await payPage(link, 'nc-03-au-pay');
                out.page = {h1: f.h1, text: f.text};
            }
            // the list after a paid record with no currency
            await as(`${S.n}mg`, S.N);
            await openWf(S.sN.id, 'nc-04-wf', {ctx: S.N});
            await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Payments', exact: true}).first().click().catch(() => {});
            await sleep(1200);
            await page.getByRole('radio', {name: 'Paid', exact: true}).first().check({force: true}).catch(() => {});
            await page.locator('form').filter({has: page.getByRole('radio', {name: 'Paid', exact: true})}).getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
            await sleep(1500);
            await page.goto(cUrl(S.N, '/payments')); await idle(page);
            await page.locator('a[name="payments"]').first().click().catch(() => {}); await idle(page); await sleep(1200);
            out.list = flat(await page.locator('.pkp_controllers_grid:visible').filter({has: page.locator('th', {hasText: 'Payment Type'})}).last().innerText().catch(() => null), 600);
            await snap('nc-05-list', {list: out.list});
            // can "Currency" be put back to none on screen?
            await openTab(S.N);
            await currencySel().selectOption({label: 'US Dollar'}).catch(() => {});
            out.currencyOptionsHaveBlank = await currencySel().evaluate((sel) => [...sel.options].some((o) => o.value === '')).catch(() => null);
            await snap('nc-06-currency-chosen-unsaved', {blank: out.currencyOptionsHaveBlank});
            fact('nocur', out);
            await visitor();
        });

        // ================================================================== omp: the press's workflow and decisions with payments on (the absence paragraph)
        if (on('omp') && isOMP) await sect('omp', async () => {
            const out = {};
            await as(u('pm'), S.J);
            out.tab = await setTab(S.J, 'om-01-enable', {enabled: true, plugin: 'Manual Fee Payment', instructions: 'Pay the press by transfer.', currency: 'US Dollar'});
            await page.goto(cUrl(S.J, '/submissions')).catch(() => {}); await idle(page);
            out.nav = navPay(await readNav());
            out.pmWf = await openWf(S.s.PA.id, 'om-02-pm-wf-PA');
            await as(u('se'), S.J);
            out.seWf = await openWf(S.s.PA.id, 'om-03-se-wf-PA');
            const labels = (out.seWf.buttons || []).map((b) => b.replace(/@.*$/, ''));
            out.decisionButtons = labels.filter((b) => /Accept|Review|Decline|Send/.test(b));
            const acc = labels.find((b) => /^Accept/.test(b));
            if (acc) out.accept = await decisionFirstPage(acc, 'om-04-se-accept-PA');
            await as(u('pm'), S.J);
            out.pay1 = await payPage(cUrl(S.J, '/payment/pay/1'), 'om-05-pay-1');
            out.paymentsPage = await payPage(cUrl(S.J, '/payments'), 'om-06-payments-page');
            fact('omp', out);
            await visitor();
        });

        // ================================================================== ops: the seeded server, read only (the absence paragraph)
        if (on('ops') && isOPS) await sect('ops', async () => {
            const out = {};
            const ctx = app.contextPath;
            await as('manager.maya', ctx);
            out.tabs = await distributionTabs(ctx);
            await snap('op-01-distribution', {tabs: out.tabs});
            out.hashTab = await page.goto(cUrl(ctx, '/management/settings/distribution#payments')).then(() => null).catch(() => null);
            await idle(page); await sleep(500);
            out.paymentsPane = await page.locator('#payments').count();
            out.nav = await readNav();
            await snap('op-02-distribution-hash-payments', {pane: out.paymentsPane, nav: out.nav});
            out.paymentsPage = await payPage(cUrl(ctx, '/payments'), 'op-03-payments-page');
            out.pay1 = await payPage(cUrl(ctx, '/payment/pay/1'), 'op-04-pay-1');
            await page.goto(cUrl(ctx, '/dashboard/editorial?currentViewId=published')).catch(() => {}); await idle(page); await sleep(800);
            await page.locator('table tbody tr').first().waitFor({timeout: 20_000}).catch(() => {});
            const id = await page.locator('table tbody tr').first().locator('td').first().innerText().then((x) => (x.match(/\d+/) || [null])[0]).catch(() => null);
            out.wfIdSeeded = id;
            // the seeded server has no submission: a scratch server with one queued preprint for the workflow header
            if (!S.srv) {
                const p = tag('u52k1s');
                const r = await app.api.createContext({tag: p, users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}]});
                const sb = await app.api.createSubmission({tag: `${p}X`, context: r.path || p, submitter: `${p}au`, title: `K1 preprint ${p}`});
                S.srv = {path: r.path || p, p, id: sb.submissionId}; save();
            }
            await as(`${S.srv.p}mg`, S.srv.path);
            out.wf = await openWf(S.srv.id, 'op-05-wf', {ctx: S.srv.path});
            out.scratchTabs = await distributionTabs(S.srv.path);
            fact('ops', out);
            await visitor();
        });

        // ================================================================== extra: the task's link, the other fee boxes (line 95)
        if (on('extra') && isOJS) await sect('extra', async () => {
            const out = {};
            await as(u('au2'), S.J);
            const t = await tasksOf('ex-01-au2-tasks');
            const link = page.locator('[role="dialog"]:visible').last().locator('a').filter({hasText: 'The publication fee is due for payment.'}).first();
            if (await link.count()) {
                await link.click().catch(() => {}); await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(600);
                out.taskLands = {url: page.url().replace(app.baseURL, ''), title: await page.title()};
                await snap('ex-02-au2-task-followed', {lands: out.taskLands});
            }
            await as(u('mg'), S.J);
            await openPaymentsPage('paymentTypes');
            out.purchaseArticle = await saveFee('2.5', 'ex-03-purchase-article-dec', 'purchaseArticleFee');
            out.membershipNeg = await saveFee('-1', 'ex-04-membership-neg', 'membershipFee');
            await openPaymentsPage('paymentTypes');
            out.issueAbc = await saveFee('abc', 'ex-05-purchase-issue-abc', 'purchaseIssueFee');
            await openPaymentsPage('paymentTypes');
            out.clear = await saveFee('', 'ex-06-purchase-article-cleared', 'purchaseArticleFee');
            fact('extra', out);
            await visitor();
        });

        // ================================================================== reader: the manual page's other titles and the fee row (lines 115–116)
        if (on('reader') && isOJS) await sect('reader', async () => {
            const out = {};
            if (!S.R) {
                const r0 = `${S.t}r`;
                const r = await app.api.createContext({tag: r0, context: {name: 'U52 K1 reader fees', contactName: 'K1 R Principal', contactEmail: `${r0}pc@mail.test`},
                    publishingMode: 'subscription', subscriptionName: 'K1 Desk', subscriptionEmail: `${r0}desk@mail.test`,
                    users: [{username: `${r0}mg`, roles: ['manager']}, {username: `${r0}au`, roles: ['author']}, {username: `${r0}rd`, roles: ['reader']}],
                    payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay K1 R by transfer.', purchaseArticleFee: 5, purchaseIssueFee: 20},
                    subscriptionTypes: [{name: 'K1 Individual', cost: 10, currency: 'USD', duration: 12}, {name: 'K1 Free', cost: 0, currency: 'USD', duration: 12}],
                    issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [{label: 'PDF', file: 'article.pdf'}]}]});
                S.R = r.path || r0; S.r = r0; S.Rissues = r.issues;
                const sb = await app.api.createSubmission({tag: `${r0}A`, context: S.R, submitter: `${r0}au`, title: `K1 R A ${r0}`, published: true, issue: {volume: 1, number: 1, year: 2026}, galleys: [{label: 'PDF', file: 'article.pdf'}]});
                S.Rart = sb.submissionId; save();
            }
            const R = S.R;
            await as(`${S.r}rd`, R);
            const pressTo = async (loc2, name) => {
                if (!(await loc2.count())) { await snap(name, {absent: true}); return {absent: true}; }
                await loc2.first().click().catch(() => {}); await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {}); await sleep(600);
                const f = await page.evaluate(() => ({title: document.title, text: (document.querySelector('.page') || document.body).innerText.replace(/\s+/g, ' ').trim().slice(0, 500)})).catch(() => null);
                f.url = page.url().replace(app.baseURL, '');
                await snap(name, {pay: f});
                return f;
            };
            await page.goto(cUrl(R, `/article/view/${S.Rart}`)); await idle(page);
            await snap('rf-01-article');
            out.article = await pressTo(page.locator('a.obj_galley_link'), 'rf-02-article-galley');
            const iid = (S.Rissues || [])[0] && S.Rissues[0].id;
            await page.goto(cUrl(R, `/issue/view/${iid}`)); await idle(page);
            await snap('rf-03-issue');
            out.issue = await pressTo(page.locator('.obj_issue_toc > .galleys a.obj_galley_link, .obj_issue_toc .heading ~ .galleys a.obj_galley_link'), 'rf-04-issue-galley');
            for (const [nm, lab] of [['paid', 'K1 Individual'], ['free', 'K1 Free']]) {
                await page.goto(cUrl(R, '/user/purchaseSubscription/individual')); await idle(page);
                const opt = (await page.locator('form#subscriptionForm select[name="typeId"] option').allInnerTexts().catch(() => [])).find((o) => o.startsWith(lab));
                if (!opt) { out[nm] = {noOption: true}; continue; }
                await page.locator('form#subscriptionForm select[name="typeId"]').selectOption({label: opt});
                out[nm] = await pressTo(page.locator('form#subscriptionForm button.submit'), `rf-05-subscription-${nm}`);
                if (nm === 'paid') {
                    const send = page.getByRole('link', {name: 'Send notification of payment'});
                    out.sent = await pressTo(send, 'rf-06-subscription-sent');
                    out.cont = await pressTo(page.getByRole('link', {name: 'Continue', exact: true}), 'rf-07-subscription-continue');
                }
            }
            fact('reader', out);
            await visitor();
        });
    } finally {
        await close();
    }
});
