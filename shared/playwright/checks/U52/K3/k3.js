// U52 claim check, chunk K3: requesting, paying and recording the APC.
// Spec: docs/specs/U52-payments-and-apcs.md lines 185–268 (Rules 8–16), 288–319 (Side effects),
// 350–353 (Setting 9), 359–393 (Cross-feature interactions), register A2, A3, A6, A8.
//
// OJS (the one app with the surface):
//   J   the main journal: payments set up with "Manual Fee Payment" (instructions with a line break),
//       USD, "Article Processing Charge" 50; issues Vol 1 No 1 (published) and Vol 1 No 2 (future);
//       one account per role level (manager, editor, production editor, section editor assigned and
//       not, guest editor, copyeditor, layout editor, proofreader, funding coordinator, two authors, reader).
//       A  the fee's life: requested by "Accept and Skip Review", paid for by the Author, recorded
//          "Paid" / "Waived" / "Unpaid" by the Section Editor (td5, td6, td10; Rules 8–11, 13, 14, 16; A2)
//       G  "Waive" on the "Request Payment" page (Rule 8, U34 OJS1)
//       H  the assistants' saves (td12; A6)
//       B  a Production article never requested: publishing waits for the record (td11; Rule 15)
//       C  paid, published, "Unpaid", a new version (Rule 15's last sentence)
//       F  a submission in review (Rule 13 "at every stage")
//   J2 the template and the switch-off: the "Payment Request" template edited (Setting 9), a request,
//      then "Enable" unticked, the instructions emptied, the method cleared (td8; A3)
//   J3 "Paypal Fee Payment" with an "Account Name" (td9), then back to the manual method (Rule 3)
//   J4 a subscription journal with a subscription contact: a subscription bought, one renewed, an
//      article and an issue bought, each "Send notification of payment" (td14; A8; Rule 10 "Continue")
// OMP: a scratch press with "Manual Fee Payment" set up on screen: the accept decision, the workflow
//      header and the payment address (the {OJS} controls). OPS: a scratch server's workflow header
//      and payment address (the absence control).
//
//   PROBE_FEATURE=U52 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U52/K3/k3.js
//   PHASES=seed,req,pay,td7,roles,rec,waive,pub,pub2,cur,tpl,off,off2,pp,sub,subiss,sweep,pk,omp,ops (default all; later phases reuse k3-state-<app>.json)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, users} =
    require('../../../probe');
const {LoginPage} = require('../../../pages/LoginPage.js');

const ALL = ['seed', 'req', 'pay', 'td7', 'roles', 'rec', 'waive', 'pub', 'pub2', 'cur', 'tpl', 'off', 'off2', 'pp', 'sub', 'subiss', 'sweep', 'pk', 'omp', 'ops'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stateFile = (app) => path.join(outDir(), `k3-state-${app.name}.json`);
const INSTR = 'Pay by bank transfer to account 123.\nQuote your submission number.';

forEachApp(async (app) => {
    const sf = stateFile(app);
    const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 2));
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const mailOf = (u) => `${u}@mail.test`;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('k3-facts', {[k]: v}, {merge: true}); };

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
    const as = async (user, ctx) => {
        await signIn(page, user, {contextPath: ctx}).catch((e) => log('signIn slow', user, flat(e.message, 120)));
        await idle(page).catch(() => {});
        who = user;
    };
    const visitor = async () => { await signOut(page).catch(() => {}); who = 'visitor'; };

    /** A frontend page as data (no main landmark there). */
    async function front() {
        return page.evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            const main = document.querySelector('.pkp_structure_main') || document.querySelector('main') || document.body;
            return {
                url: location.pathname + location.search,
                title: document.title,
                h1: [...main.querySelectorAll('h1')].filter(vis).map((e) => t(e.innerText)),
                heads: [...main.querySelectorAll('h2, h3')].filter(vis).map((e) => t(e.innerText)),
                tables: [...main.querySelectorAll('table')].filter(vis).map((tb) => [...tb.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => t(c.innerText)))),
                paras: [...main.querySelectorAll('p')].filter(vis).map((e) => t(e.innerText)).filter(Boolean).slice(0, 30),
                instructionsHtml: (() => { const p = [...main.querySelectorAll('p, div')].find((e) => /bank transfer|cheque/i.test(e.innerText) && e.children.length < 6); return p ? p.innerHTML.slice(0, 600) : null; })(),
                links: [...main.querySelectorAll('a')].filter(vis).map((a) => ({text: t(a.innerText), href: (a.getAttribute('href') || '').replace(location.origin, '')})).filter((l) => l.text),
                buttons: [...main.querySelectorAll('button, input[type=submit]')].filter(vis).map((b) => t(b.innerText || b.value)).filter(Boolean),
                loginForm: !!document.querySelector('form#login, form.cmp_form.login'),
                notices: [...document.querySelectorAll('.cmp_notification, .pkp_notification, [role=alert]')].filter(vis).map((e) => t(e.innerText)).filter(Boolean),
                text: t(main.innerText).slice(0, 3000),
            };
        }).catch((e) => ({err: flat(e.message, 200)}));
    }
    /** The navigation chain of the main frame while fn runs. */
    async function chained(fn) {
        const chain = [];
        const onResp = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${r.request().method()} ${r.url().replace(app.baseURL, '')}`); } catch (e) { /* none */ } };
        page.on('response', onResp);
        try { await fn(); } finally { page.off('response', onResp); }
        return chain;
    }
    async function land(url, name, extra = {}) {
        let status = null;
        const chain = await chained(async () => {
            const r = await page.goto(url.startsWith('http') ? url : app.url(url)).catch((e) => ({err: flat(e.message, 200)}));
            status = r && r.status ? r.status() : (r && r.err) || null;
            await idle(page).catch(() => {});
        });
        await snap(name, extra);
        const f = await front();
        f.chain = chain; f.status = status;
        record(name, {front: f}, {merge: true});
        return f;
    }
    async function pressNav(locator, name, extra = {}) {
        const n = await locator.count().catch(() => 0);
        if (!n) { record(name, {absent: true, ...extra}); return {absent: true}; }
        await loc(page, name, locator.first());
        let status = null;
        const chain = await chained(async () => {
            const [resp] = await Promise.all([
                page.waitForNavigation({timeout: 30000}).catch(() => null),
                locator.first().click(),
            ]);
            status = resp ? resp.status() : null;
            await idle(page).catch(() => {});
        });
        await snap(name, extra);
        const f = await front();
        f.chain = chain; f.status = status;
        record(name, {front: f}, {merge: true});
        return f;
    }

    // ------------------------------------------------------------------ workflow helpers (OJS/OMP/OPS)
    const wfUrl = (ctx, id, {author = false, key} = {}) => cUrl(ctx, `/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const wfDlg = () => page.locator('[role="dialog"]:visible').first();
    async function wfHeader() {
        return page.evaluate(() => {
            const vis = (e) => e.getClientRects().length > 0;
            const d = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0];
            if (!d) return {dialog: false};
            const btns = [...d.querySelectorAll('button, a')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean);
            const pay = d.querySelector('.pkpWorkflow__submissionPayments');
            let paySiblings = null;
            if (pay) {
                const row = pay.parentElement;
                paySiblings = [...row.children].filter(vis).map((c) => (c.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean);
            }
            return {dialog: true, buttons: btns.slice(0, 50), paymentsPresent: !!pay, paySiblings, heading: (d.querySelector('h1, h2') || {}).innerText || null, text: d.innerText.slice(0, 1500)};
        }).catch((e) => ({err: flat(e.message)}));
    }
    async function openWf(ctx, id, label, opts = {}) {
        await page.goto(wfUrl(ctx, id, opts)); await idle(page);
        await wfDlg().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await sleep(500);
        const h = await wfHeader();
        await snap(label, {header: h});
        log(`[${label}]`, app.name, who, 'payments:', h.paymentsPresent, '| buttons:', JSON.stringify((h.buttons || []).slice(0, 14)));
        return h;
    }
    const payBtn = () => page.locator('.pkpWorkflow__submissionPayments > button').first();
    const payContent = () => page.locator('.pkpWorkflow__submissionPayments .pkpDropdown__content');
    async function readMenu() {
        return payContent().evaluate((el) => ({
            text: el.innerText,
            legends: [...el.querySelectorAll('legend, label.pkpFormFieldLabel, .pkpFormFieldLabel')].map((x) => x.innerText.trim()),
            radios: [...el.querySelectorAll('input[type=radio]')].map((r) => ({value: r.value, checked: r.checked, label: ((r.closest('label') || r.parentElement).innerText || '').trim()})),
            buttons: [...el.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean),
        })).catch((e) => ({err: flat(e.message, 200)}));
    }
    async function openMenu(label) {
        if (!(await payBtn().count())) { record(label, {paymentsButton: false}); return {absent: true}; }
        if (!(await payContent().count())) await payBtn().click();
        await payContent().waitFor({timeout: 10000}).catch(() => {});
        await page.locator('.pkpWorkflow__submissionPayments input[type=radio]').first().waitFor({timeout: 15000}).catch(() => {});
        await idle(page); await sleep(300);
        const m = await readMenu();
        await snap(label, {menu: m});
        log(`[${label}]`, who, JSON.stringify((m.radios || []).map((r) => `${r.label}${r.checked ? '*' : ''}`)), '| buttons', JSON.stringify(m.buttons));
        return m;
    }
    async function closeMenu() {
        if (await payContent().count()) { await payBtn().click().catch(() => {}); await sleep(300); }
    }
    /** Choose an option in the "Payments" menu and press its "Save": the answer, the status line, the menu right after. */
    async function saveMenu(option, label) {
        const m0 = await openMenu(`${label}-open`);
        if (m0.absent) return {absent: true};
        const radio = payContent().getByRole('radio', {name: option, exact: true});
        await loc(page, `Payments menu: "${option}"`, radio);
        await radio.check({force: true}).catch(() => radio.click({force: true}));
        await sleep(200);
        const chosen = await readMenu();
        const reqs = [];
        const onReq = (r) => { if (/\/payment(\?|$)/.test(r.url())) reqs.push({method: r.method(), override: r.headers()['x-http-method-override'] || null, body: (r.postData() || '').slice(0, 300), url: r.url().replace(/^.*\/api\/v1\//, '')}); };
        page.on('request', onReq);
        const respP = page.waitForResponse((r) => /\/payment(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).then(async (r) => ({status: r.status(), body: flat(await r.text().catch(() => ''), 300)})).catch(() => null);
        const saveBtn = payContent().getByRole('button', {name: 'Save', exact: true});
        await loc(page, 'Payments menu: "Save"', saveBtn);
        await saveBtn.click();
        const resp = await respP;
        page.off('request', onReq);
        const saved = await payContent().locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 5000}).then(() => true).catch(() => false);
        const statusText = await page.locator('.pkpWorkflow__submissionPayments [role="status"], .pkpWorkflow__submissionPayments .pkpFormPage__status').allInnerTexts().catch(() => []);
        const after = await readMenu();
        await snap(`${label}-saved`, {chosen, resp, reqs, saved, statusText, after});
        log(`[${label}] ${option} → resp`, JSON.stringify(resp), 'req', JSON.stringify(reqs), 'saved', saved, 'status', JSON.stringify(statusText));
        return {chosen, resp, reqs, saved, statusText, after};
    }
    /** The author's (or anyone's) Tasks panel on the dashboard: the rows, and optionally the payment row pressed. */
    async function tasks(ctx, label, {follow = false} = {}) {
        await page.goto(cUrl(ctx, '/dashboard/mySubmissions')); await idle(page);
        let bell = page.getByRole('button', {name: /^Tasks/}).first();
        if (!(await bell.count())) { await page.goto(cUrl(ctx, '/dashboard/editorial')); await idle(page); bell = page.getByRole('button', {name: /^Tasks/}).first(); }
        await bell.waitFor({timeout: 15000}).catch(() => {});
        await loc(page, 'dashboard: the Tasks button', bell);
        const bellText = await bell.innerText().catch(() => null);
        await bell.click(); await idle(page); await sleep(800); await idle(page);
        const win = page.locator('[role="dialog"]:visible').last();
        const rows = await win.locator('tr.gridRow').allInnerTexts().then((r) => r.map((x) => flat(x, 400))).catch(() => []);
        await snap(label, {bellText, rows});
        log(`[${label}]`, who, 'bell', flat(bellText), 'rows', JSON.stringify(rows));
        let followed = null;
        if (follow) {
            const row = win.locator('tr.gridRow').filter({hasText: /publication fee/i}).first();
            if (await row.count()) {
                const link = row.locator('a').first();
                await loc(page, 'Tasks: the publication fee row\'s link', link);
                const href = await link.getAttribute('href').catch(() => null);
                followed = await pressNav(link, `${label}-followed`);
                followed.href = href;
                log(`[${label}-followed]`, followed.url, JSON.stringify(followed.h1), flat(followed.text, 200));
            } else followed = {noRow: true};
        }
        return {bellText, rows, followed};
    }
    /** The "Payments" page's "Payments" tab (the list of payments). */
    async function paymentsList(ctx, label) {
        await page.goto(cUrl(ctx, '/payments')); await idle(page);
        const tab = page.locator('#subscriptionsTabs a[name="payments"]');
        await loc(page, 'Payments page: the "Payments" tab', tab);
        await tab.click(); await idle(page); await sleep(800); await idle(page);
        const grid = page.locator('#subscriptionsTabs [role="tabpanel"]:visible, #subscriptionsTabs .ui-tabs-panel:visible').last();
        const out = await grid.evaluate((g) => ({
            columns: [...g.querySelectorAll('thead th, tr.gridHeader th, th')].map((th) => th.innerText.trim()).filter(Boolean),
            rows: [...g.querySelectorAll('tbody tr.gridRow')].map((tr) => [...tr.children].map((td) => td.innerText.trim())),
            empty: [...g.querySelectorAll('tbody.empty, tr.empty')].map((x) => x.innerText.trim()).filter(Boolean),
            text: g.innerText.slice(0, 1500),
        })).catch((e) => ({err: flat(e.message)}));
        await snap(label, {list: out});
        log(`[${label}]`, JSON.stringify(out.rows), JSON.stringify(out.columns));
        return out;
    }
    /** The workflow header's "Activity Log": its rows. */
    async function activityLog(ctx, id, label) {
        await openWf(ctx, id, `${label}-wf`);
        const b = wfDlg().getByRole('button', {name: 'Activity Log', exact: true});
        if (!(await b.count())) { record(label, {absent: true}); return {absent: true}; }
        await b.click(); await idle(page);
        await page.getByRole('dialog', {name: /Activity Log|History/}).last().waitFor({timeout: 15000}).catch(() => {});
        await sleep(1200); await idle(page);
        const win = page.locator('[role="dialog"]:visible').last();
        const rows = await win.locator('tr').allInnerTexts().then((r) => r.map((x) => flat(x, 300)).filter(Boolean)).catch(() => []);
        await snap(label, {rows});
        await win.getByRole('button', {name: /^Close/}).first().click().catch(() => {});
        await sleep(700);
        return {rows};
    }
    async function mailFacts(to, subject, contains, timeoutMs = 25000) {
        try {
            const m = await app.mail.find({to, subject, contains, timeoutMs});
            const full = await app.mail.fullMessage(m.ID).catch(() => null);
            const links = full ? [...(full.HTML || '').matchAll(/<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi)].map((x) => ({text: x[3].replace(/<[^>]+>/g, '').trim(), href: x[2].replace(/&amp;/g, '&')})) : [];
            return {id: m.ID, from: m.From, to: (m.To || []).map((x) => `${x.Name} <${x.Address}>`), cc: (m.Cc || []).map((x) => x.Address), subject: m.Subject, text: full && flat(full.Text, 2000), links};
        } catch (e) { return {error: flat(e.message, 200)}; }
    }
    const mcount = (to, subject) => app.mail.count({to, subject}).catch(() => null);

    // ------------------------------------------------------------------ decision helpers
    async function decisionPage(label) {
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await sleep(600);
        const d = await page.evaluate(() => {
            const vis = (e) => e.getClientRects().length > 0;
            const main = document.querySelector('main') || document.body;
            const labelOf = (i) => { const l = i.id && document.querySelector(`label[for="${i.id}"]`); return (l ? l.innerText : (i.closest('label') || i.parentElement || {}).innerText || '').trim().replace(/\s+/g, ' '); };
            return {
                url: location.href,
                h1: [...main.querySelectorAll('h1')].filter(vis).map((e) => e.innerText.trim()),
                headings: [...main.querySelectorAll('h2,h3,legend')].filter(vis).map((e) => e.innerText.trim()).filter(Boolean).slice(0, 30),
                radios: [...main.querySelectorAll('input[type=radio]')].filter(vis).map((i) => ({label: labelOf(i), checked: i.checked, name: i.name, value: i.value})),
                buttons: [...main.querySelectorAll('button')].filter(vis).map((b) => b.innerText.trim()).filter(Boolean).slice(0, 40),
                editors: (window.tinymce ? (window.tinymce.get() || []) : []).map((e) => ({id: e.id, text: (e.getContent({format: 'text'}) || '').replace(/\s+/g, ' ').trim().slice(0, 1200)})),
                text: main.innerText.slice(0, 5000),
            };
        });
        await snap(label, {decision: d});
        return d;
    }
    /** From the workflow: press an accept button, record every page, pick the payment choice, record the decision. */
    async function acceptWith(ctx, id, button, choice, label) {
        await openWf(ctx, id, `${label}-wf`, {key: 'workflow_1'});
        const btn = wfDlg().getByRole('button', {name: button, exact: true}).first();
        if (!(await btn.count())) { record(`${label}-absent`, {button}); return {absent: true}; }
        await loc(page, `workflow: "${button}"`, btn);
        await btn.click(); await idle(page);
        await page.waitForURL(/\/decision\//, {timeout: 30000}).catch(() => {});
        const p1 = await decisionPage(`${label}-page1`);
        log(`[${label}] page1`, JSON.stringify(p1.h1), JSON.stringify(p1.radios));
        let chosen = null;
        if (choice) {
            const r = page.getByRole('radio', {name: choice, exact: true});
            if (await r.count()) { await loc(page, `Request Payment: "${flat(choice, 40)}"`, r.first()); await r.first().check({force: true}); }
            chosen = await page.locator('input[name="requestPayment"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked})));
            await snap(`${label}-page1-chosen`, {chosen});
        }
        const pages = [p1];
        const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
        for (let i = 2; i < 8 && !(await rec.isVisible().catch(() => false)); i++) {
            await page.getByRole('button', {name: 'Continue', exact: true}).first().click(); await idle(page);
            pages.push(await decisionPage(`${label}-page${i}`));
        }
        await rec.click(); await idle(page);
        await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
        await sleep(800);
        await snap(`${label}-recorded`);
        return {chosen, pages: pages.map((p) => ({h1: p.h1, headings: p.headings, radios: p.radios, editors: p.editors.map((e) => flat(e.text, 600))}))};
    }

    // ------------------------------------------------------------------ settings helpers (Settings › Distribution › "Payments")
    async function paySettings(ctx, label) {
        await page.goto(cUrl(ctx, '/management/settings/distribution')); await idle(page);
        const tab = page.locator('#payments-button');
        if (!(await tab.count())) { await snap(label, {tab: false}); return {tab: false}; }
        await tab.click(); await idle(page); await sleep(600);
        const panel = page.locator('#payments');
        const st = await panel.evaluate((p) => ({
            enabled: (p.querySelector('input[name=paymentsEnabled]') || {}).checked,
            currency: (p.querySelector('select[name=currency]') || {}).value,
            method: (p.querySelector('select[name=paymentPluginName]') || {}).value,
            methodOptions: [...((p.querySelector('select[name=paymentPluginName]') || {}).options || [])].map((o) => `${o.value}=${o.text}`),
            instructions: (p.querySelector('textarea[name=manualInstructions]') || {}).value,
            accountName: (p.querySelector('input[name=accountName]') || {}).value,
        })).catch((e) => ({err: flat(e.message)}));
        await snap(label, {st});
        return st;
    }
    async function savePaySettings(label) {
        const panel = page.locator('#payments');
        const respP = page.waitForResponse((r) => /\/_payments/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).then((r) => r.status()).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const status = await respP;
        const saved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 6000}).then(() => true).catch(() => false);
        await snap(label, {status, saved});
        log(`[${label}] save`, status, saved);
        return {status, saved};
    }

    try {
        // ================================================================== OMP: the press's controls
        if (isOMP) {
            if (on('omp')) await sect('omp', async () => {
                if (!S.omp) {
                    const t = tag('u52k3p');
                    const U = (k, role, g, f) => ({username: `${t}${k}`, roles: [role], givenName: g, familyName: f});
                    await app.api.createContext({tag: t, context: {name: `U52 K3 press ${t}`, contactName: 'K3 Principal', contactEmail: `${t}pc@mail.test`},
                        users: [U('mgr', 'manager', 'Maya', 'Kthreemanager'), U('se', 'sectionEditor', 'Sena', 'Kthreeeditor'), U('au', 'author', 'Alex', 'Kthreeauthor')]});
                    const s = await app.api.createSubmission({tag: `${t}a`, context: t, submitter: `${t}au`, title: `K3 press ${t}`, participants: [{username: `${t}se`, role: 'sectionEditor'}],
                        decisions: ['skipInternalReview'], reviewRounds: [{reviewers: [], stage: 'external'}]});
                    S.omp = {t, a: s.submissionId, stageId: s.stageId, rounds: s.reviewRounds}; save();
                }
                const t = S.omp.t;
                await as(`${t}mgr`, t);
                const st0 = await paySettings(t, 'omp-01-mgr-settings-payments');
                await page.locator('#payments input[name=paymentsEnabled]').check();
                await sleep(300);
                await page.locator('#payments select[name=currency]').selectOption('USD').catch(() => {});
                await page.locator('#payments select[name=paymentPluginName]').selectOption('ManualPayment').catch(() => {});
                await page.locator('#payments textarea[name=manualInstructions]').fill(INSTR).catch(() => {});
                const sv = await savePaySettings('omp-02-mgr-settings-payments-saved');
                const st1 = await paySettings(t, 'omp-03-mgr-settings-payments-reloaded');
                fact('omp.settings', {before: st0, save: sv, after: st1});
                // the editor's workflow at the external review round: no "Payments" in the header, no "Request Payment"
                await as(`${t}se`, t);
                const r = S.omp.rounds && S.omp.rounds[0];
                const h = await openWf(t, S.omp.a, 'omp-04-se-workflow-review', r ? {key: `workflow_${r.stageId}_${r.id}`} : {});
                const acc = wfDlg().getByRole('button', {name: 'Accept Submission', exact: true}).first();
                let p1 = null;
                if (await acc.count()) {
                    await acc.click(); await idle(page);
                    await page.waitForURL(/\/decision\//, {timeout: 30000}).catch(() => {});
                    p1 = await decisionPage('omp-05-se-accept-page1');
                }
                await as(`${t}mgr`, t);
                const hm = await openWf(t, S.omp.a, 'omp-06-mgr-workflow');
                const pay = await land(`/index.php/${t}/payment/pay/999999`, 'omp-07-mgr-payment-pay-999999');
                fact('omp.controls', {sePayments: h.paymentsPresent, seButtons: h.buttons, acceptPage1: p1 && {h1: p1.h1, headings: p1.headings, radios: p1.radios}, mgrPayments: hm.paymentsPresent, mgrButtons: hm.buttons, payAddress: {url: pay.url, status: pay.status, h1: pay.h1, text: flat(pay.text, 400)}});
                log('[omp]', JSON.stringify(facts['omp.controls']).slice(0, 900));
                // footnote s0: the context scenario's `payments` key on a press
                const tp = tag('u52k3x');
                const refused = await app.api.createContext({tag: tp, payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'x'}}).then(() => 'accepted').catch((e) => flat(e.message, 300));
                fact('omp.paymentsKey', refused);
                log('[omp payments key]', refused);
            });
            return;
        }
        // ================================================================== OPS: the absence control
        if (isOPS) {
            if (on('ops')) await sect('ops', async () => {
                if (!S.ops) {
                    const t = tag('u52k3s');
                    await app.api.createContext({tag: t, context: {name: `U52 K3 server ${t}`, contactName: 'K3 Principal', contactEmail: `${t}pc@mail.test`},
                        users: [{username: `${t}mgr`, roles: ['manager'], givenName: 'Maya', familyName: 'Kthreemanager'}, {username: `${t}au`, roles: ['author'], givenName: 'Alex', familyName: 'Kthreeauthor'}]});
                    const s = await app.api.createSubmission({tag: `${t}a`, context: t, submitter: `${t}au`, title: `K3 preprint ${t}`});
                    S.ops = {t, a: s.submissionId}; save();
                }
                const t = S.ops.t;
                await as(`${t}mgr`, t);
                const h = await openWf(t, S.ops.a, 'ops-01-mgr-workflow');
                const st = await paySettings(t, 'ops-02-mgr-settings-distribution');
                const tabs = await page.getByRole('tab').allInnerTexts().catch(() => []);
                const pay = await land(`/index.php/${t}/payment/pay/999999`, 'ops-03-mgr-payment-pay-999999');
                const pp = await land(`/index.php/${t}/payments`, 'ops-04-mgr-payments-page');
                fact('ops.controls', {payments: h.paymentsPresent, buttons: h.buttons, distributionTabs: tabs.map((x) => x.trim()), payTab: st, payAddress: {url: pay.url, status: pay.status, h1: pay.h1, text: flat(pay.text, 400)}, paymentsPage: {status: pp.status, url: pp.url, h1: pp.h1, text: flat(pp.text, 300)}});
                log('[ops]', JSON.stringify(facts['ops.controls']).slice(0, 900));
                // footnote s0: the seeded server, read only, as its manager
                await as('manager.maya', 'publicknowledge');
                await page.goto(cUrl('publicknowledge', '/management/settings/distribution')); await idle(page);
                const pkTabs = await page.getByRole('tab').allInnerTexts().catch(() => []);
                await snap('ops-05-maya-publicknowledge-distribution', {tabs: pkTabs});
                fact('ops.publicknowledge', pkTabs.map((x) => x.trim()));
                log('[ops pk]', JSON.stringify(pkTabs));
            });
            return;
        }

        // ================================================================== OJS
        const J = () => S.J && S.J.t;
        const u = (k) => `${S.J.t}${k}`;
        if (on('seed') && !S.J) await sect('seed', async () => {
            const t = tag('u52k3j');
            const U = (k, role, g, f) => ({username: `${t}${k}`, roles: [role], givenName: g, familyName: f});
            const roster = [
                U('mgr', 'manager', 'Maya', 'Manager'), U('ed', 'editor', 'Edda', 'Editor'), U('pe', 'productionEditor', 'Pete', 'Production'),
                U('se', 'sectionEditor', 'Sena', 'Section'), U('se2', 'sectionEditor', 'Otto', 'Unassigned'), U('ge', 'guestEditor', 'Gia', 'Guest'),
                U('ce', 'copyeditor', 'Cora', 'Copyeditor'), U('le', 'layoutEditor', 'Lars', 'Layout'), U('pr', 'proofreader', 'Pia', 'Proofreader'),
                U('fu', 'funding', 'Fern', 'Funding'), U('au', 'author', 'Alex', 'Author'), U('au2', 'author', 'Bea', 'Coauthor'), U('rd', 'reader', 'Rosa', 'Reader'),
            ];
            const r = await app.api.createContext({tag: t, context: {name: `U52 K3 journal ${t}`, acronym: 'KTHREE', contactName: 'K3 Principal', contactEmail: `${t}pc@mail.test`},
                users: roster, payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: INSTR, publicationFee: 50},
                issues: [{volume: 1, number: 1, year: 2026, published: true}, {volume: 1, number: 2, year: 2026, published: false}]});
            S.J = {t, contextId: r.contextId, issues: r.issues};
            save();
            const sub = async (key, body) => {
                const s = await app.api.createSubmission({tag: `${t}${key.toLowerCase()}`, context: t, submitter: `${t}au`, title: `K3 ${key} ${t}`, ...body});
                S.J[key] = {id: s.submissionId, pub: s.publicationId, stageId: s.stageId, rounds: s.reviewRounds, title: `K3 ${key} ${t}`};
                save();
                log('[seed]', key, s.submissionId, 'stage', s.stageId);
            };
            const P = (k, role) => ({username: `${t}${k}`, role});
            try {
                await sub('A', {participants: [P('se', 'sectionEditor'), P('ge', 'guestEditor'), P('au2', 'author'), P('ce', 'copyeditor'), P('le', 'layoutEditor'), P('pr', 'proofreader'), P('fu', 'funding')]});
            } catch (e) {
                log('[seed] A with au2 as author participant refused:', flat(e.message, 300));
                S.J.au2Refused = flat(e.message, 300);
                await sub('A', {participants: [P('se', 'sectionEditor'), P('ge', 'guestEditor'), P('ce', 'copyeditor'), P('le', 'layoutEditor'), P('pr', 'proofreader'), P('fu', 'funding')]});
            }
            await sub('G', {participants: [P('se', 'sectionEditor')]});
            await sub('H', {participants: [P('se', 'sectionEditor'), P('ce', 'copyeditor'), P('le', 'layoutEditor')], decisions: ['skipExternalReview']});
            await sub('B', {participants: [P('se', 'sectionEditor')], decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'PDF', file: 'article.pdf'}]});
            await sub('C', {participants: [P('se', 'sectionEditor')], decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'PDF', file: 'article.pdf'}]});
            await sub('F', {participants: [P('se', 'sectionEditor')], decisions: ['sendExternalReview'], reviewRounds: [{reviewers: []}]});
            save();
        });
        if (!S.J) { log('not seeded'); return; }
        const t = J();

        // ------------------------------------------------------------------ req: td5, Rule 8, Side effects "Payment Request Notification"
        if (on('req') && !S.reqDone) await sect('req', async () => {
            const out = {};
            await as(u('se'), t);
            if (!S.reqDecided) {
                out.beforeHeader = await openWf(t, S.J.A.id, 'req-01-se-A-submission-stage', {key: 'workflow_1'});
                out.beforeMenu = await openMenu('req-02-se-A-menu-before-request');
                await closeMenu();
                out.accept = await acceptWith(t, S.J.A.id, 'Accept and Skip Review', null, 'req-03-se-A-accept-skip');
                S.reqDecided = true; save();
                fact('req.decision', {beforeHeader: out.beforeHeader, beforeMenu: out.beforeMenu, accept: out.accept});
            }
            out.afterHeader = await openWf(t, S.J.A.id, 'req-04-se-A-after');
            out.afterMenu = await openMenu('req-05-se-A-menu-after-request');
            await closeMenu();
            // the Author's and the co-author's email
            out.mailAu = await mailFacts(mailOf(u('au')), 'Payment Request Notification');
            out.mailAu2 = await mailFacts(mailOf(u('au2')), 'Payment Request Notification', undefined, 10000);
            out.counts = {};
            for (const k of ['au', 'au2', 'se', 'ge', 'mgr', 'ce']) out.counts[k] = await mcount(mailOf(u(k)), 'Payment Request Notification');
            out.counts.contact = await mcount(`${t}pc@mail.test`, 'Payment Request Notification');
            // the Tasks panels
            await as(u('au'), t);
            out.auTasks = await tasks(t, 'req-06-au-tasks', {follow: true});
            await as(u('au2'), t);
            out.au2Tasks = await tasks(t, 'req-07-au2-tasks', {follow: false});
            await as(u('se'), t);
            out.seTasks = await tasks(t, 'req-08-se-tasks');
            const link = (out.mailAu.links || []).find((l) => /payment\/pay\//.test(l.href));
            S.payLink = link && link.href;
            S.guidelinesLink = ((out.mailAu.links || []).find((l) => /about\/submissions/.test(l.href)) || {}).href || null;
            S.reqDone = true; save();
            fact('req', out);
            log('[req mail]', JSON.stringify({from: out.mailAu.from, to: out.mailAu.to, subject: out.mailAu.subject, links: out.mailAu.links}), 'counts', JSON.stringify(out.counts));
        });

        // ------------------------------------------------------------------ pay: td6, Rules 9–11, the manual page, "Manual Payment Notification"
        if (on('pay') && S.payLink && !S.payDone) await sect('pay', async () => {
            const out = {link: S.payLink};
            await visitor();
            out.signedOut = await land(S.payLink, 'pay-01-visitor-email-link');
            // sign in on the page the visitor got
            const lp = new LoginPage(page);
            if (await lp.usernameInput.count()) {
                const chain = await chained(async () => {
                    await lp.submitCredentials(u('au'), users.getPassword(u('au')));
                    await page.waitForURL((x) => !x.pathname.includes('/login'), {timeout: 20000}).catch(() => {});
                    await idle(page);
                });
                who = u('au');
                await snap('pay-02-au-after-sign-in');
                out.afterSignIn = await front(); out.afterSignIn.chain = chain;
            }
            await loc(page, 'Manual Fee Payment: "Send notification of payment"', page.getByRole('link', {name: 'Send notification of payment'}));
            const c0 = await mcount(`${t}pc@mail.test`, 'Manual Payment Notification');
            out.notify1 = await pressNav(page.getByRole('link', {name: 'Send notification of payment'}), 'pay-03-au-notify');
            out.mail1 = await mailFacts(`${t}pc@mail.test`, 'Manual Payment Notification');
            out.continueHref = (out.notify1.links || []).find((l) => l.text === 'Continue');
            out.cont = await pressNav(page.getByRole('link', {name: 'Continue', exact: true}), 'pay-04-au-continue');
            await sleep(1500);
            out.contDialog = await wfHeader();
            await snap('pay-05-au-continue-settled', {header: out.contDialog});
            // the task again, the button a second time
            out.again = await tasks(t, 'pay-06-au-tasks-again', {follow: true});
            out.notify2 = await pressNav(page.getByRole('link', {name: 'Send notification of payment'}), 'pay-07-au-notify-again');
            await sleep(4000);
            out.contactCount = {before: c0, after: await mcount(`${t}pc@mail.test`, 'Manual Payment Notification')};
            // the editor: the menu after the notification (Rule 11)
            await as(u('se'), t);
            await openWf(t, S.J.A.id, 'pay-08-se-A-after-notify');
            out.menuAfterNotify = await openMenu('pay-09-se-A-menu-after-notify');
            await closeMenu();
            out.listAfterNotify = await (async () => { await as(u('mgr'), t); return paymentsList(t, 'pay-10-mgr-payments-list-after-notify'); })();
            S.payDone = true; save();
            fact('pay', out);
            log('[pay]', JSON.stringify({signedOut: out.signedOut.url, afterSignIn: out.afterSignIn && out.afterSignIn.url, mail: {from: out.mail1.from, to: out.mail1.to, subject: out.mail1.subject}, cont: out.cont.url, counts: out.contactCount}));
        });

        // ------------------------------------------------------------------ td7: an address naming no payment request
        if (on('td7')) await sect('td7', async () => {
            const out = {};
            await as(u('au'), t);
            out.au = await land(`/index.php/${t}/payment/pay/999999`, 'td7-01-au-pay-999999');
            await as(u('mgr'), t);
            out.mgr = await land(`/index.php/${t}/payment/pay/999999`, 'td7-02-mgr-pay-999999');
            out.mgrNoId = await land(`/index.php/${t}/payment/pay`, 'td7-03-mgr-pay-no-id');
            await visitor();
            out.visitor = await land(`/index.php/${t}/payment/pay/999999`, 'td7-04-visitor-pay-999999');
            fact('td7', out);
            log('[td7]', JSON.stringify({au: [out.au.status, out.au.h1, flat(out.au.text, 200)], mgrNoId: [out.mgrNoId.status, out.mgrNoId.h1, flat(out.mgrNoId.text, 200)], visitor: [out.visitor.url, out.visitor.loginForm]}));
        });

        // ------------------------------------------------------------------ roles: Actors row 4, Rule 13 (who is offered the menu, at which stage), td12, A6
        if (on('roles')) await sect('roles', async () => {
            const out = {A: {}, stages: {}};
            const who4 = [['mgr', false], ['ed', false], ['pe', false], ['admin', false], ['se', false], ['se2', false], ['ge', false], ['ce', false], ['le', false], ['pr', false], ['fu', false], ['au', true], ['au2', true], ['rd', false]];
            for (const [k, author] of who4) {
                const user = k === 'admin' ? 'admin' : u(k);
                await as(user, t);
                const h = await openWf(t, S.J.A.id, `roles-A-${k}`, {author});
                const entry = {payments: h.paymentsPresent, dialog: h.dialog, buttons: (h.buttons || []).slice(0, 14), paySiblings: h.paySiblings};
                if (h.paymentsPresent) { entry.menu = await openMenu(`roles-A-${k}-menu`); await closeMenu(); }
                if (author) { const he = await openWf(t, S.J.A.id, `roles-A-${k}-editorial-address`); entry.editorialAddress = {payments: he.paymentsPresent, dialog: he.dialog, url: page.url(), text: flat(he.text, 200)}; }
                out.A[k] = entry;
            }
            // at every stage: the manager on G (Submission), F (Review), H (Copyediting), B (Production)
            await as(u('mgr'), t);
            for (const k of ['G', 'F', 'H', 'B']) {
                const h = await openWf(t, S.J[k].id, `roles-${k}-mgr`);
                out.stages[k] = {payments: h.paymentsPresent};
                if (h.paymentsPresent) { out.stages[k].menu = await openMenu(`roles-${k}-mgr-menu`); await closeMenu(); }
            }
            // td12: the Copyeditor saves "Paid" on H, the Layout Editor then "Waived"
            await as(u('ce'), t);
            await openWf(t, S.J.H.id, 'roles-H-ce');
            out.ceSave = await saveMenu('Paid', 'roles-H-ce-paid');
            await page.reload(); await idle(page); await sleep(800);
            out.ceReload = await openMenu('roles-H-ce-reloaded');
            await closeMenu();
            await as(u('le'), t);
            await openWf(t, S.J.H.id, 'roles-H-le');
            out.leSave = await saveMenu('Waived', 'roles-H-le-waived');
            await as(u('mgr'), t);
            out.list = await paymentsList(t, 'roles-list-after-assistants');
            fact('roles', out);
            log('[roles]', JSON.stringify(Object.fromEntries(Object.entries(out.A).map(([k, v]) => [k, `${v.dialog ? '' : 'NO-DIALOG '}${v.payments}`]))), JSON.stringify(out.stages));
        });

        // ------------------------------------------------------------------ rec: td10, Rules 13, 14, 16, A2; Side effects' silence
        if (on('rec') && S.payDone && !S.recDone) await sect('rec', async () => {
            const out = {};
            const people = ['au', 'au2', 'se', 'mgr'];
            const countAll = async () => {
                const c = {};
                for (const k of people) c[k] = (await app.mail._search({to: mailOf(u(k))}).catch(() => ({messages: []}))).messages.length;
                c.contact = (await app.mail._search({to: `${t}pc@mail.test`}).catch(() => ({messages: []}))).messages.length;
                return c;
            };
            out.mailBefore = await countAll();
            await as(u('se'), t);
            out.logBefore = await activityLog(t, S.J.A.id, 'rec-01-se-A-activity-before');
            // Rule 14 "at that moment": the fee changed after the request
            await as(u('mgr'), t);
            await page.goto(cUrl(t, '/payments')); await idle(page);
            await page.locator('#subscriptionsTabs a[name="paymentTypes"]').click(); await idle(page); await sleep(800);
            await page.locator('#paymentTypesForm input[name="publicationFee"]').fill('75');
            await page.locator('#paymentTypesForm').getByRole('button', {name: 'Save'}).click(); await idle(page); await sleep(1500);
            out.feeChanged = await page.locator('#paymentTypesForm input[name="publicationFee"]').inputValue().catch(() => null);
            await snap('rec-02-mgr-fee-75');
            await as(u('au'), t);
            out.auPageAt75 = await land(S.payLink, 'rec-03-au-payment-page-after-fee-change');
            // Paid
            await as(u('se'), t);
            await openWf(t, S.J.A.id, 'rec-04-se-A');
            out.paid = await saveMenu('Paid', 'rec-05-se-A-paid');
            await closeMenu();
            out.paidReopen = await openMenu('rec-06-se-A-paid-reopened');
            await closeMenu();
            await page.reload(); await idle(page); await sleep(800);
            await wfDlg().waitFor({timeout: 30000}).catch(() => {});
            out.paidReload = await openMenu('rec-07-se-A-paid-reloaded');
            await closeMenu();
            await as(u('mgr'), t);
            out.listPaid = await paymentsList(t, 'rec-08-mgr-list-paid');
            // the Author's task after the record (A2)
            await as(u('au'), t);
            out.auTasksPaid = await tasks(t, 'rec-09-au-tasks-after-paid', {follow: true});
            // Paid again: nothing changes
            await as(u('se'), t);
            await openWf(t, S.J.A.id, 'rec-10-se-A');
            out.paidAgain = await saveMenu('Paid', 'rec-11-se-A-paid-again');
            await as(u('mgr'), t);
            out.listPaidAgain = await paymentsList(t, 'rec-12-mgr-list-paid-again');
            // Waived
            await as(u('se'), t);
            await openWf(t, S.J.A.id, 'rec-13-se-A');
            out.waived = await saveMenu('Waived', 'rec-14-se-A-waived');
            await page.reload(); await idle(page); await sleep(800);
            out.waivedReload = await openMenu('rec-15-se-A-waived-reloaded');
            await closeMenu();
            await as(u('mgr'), t);
            out.listWaived = await paymentsList(t, 'rec-16-mgr-list-waived');
            await as(u('au'), t);
            out.auTasksWaived = await tasks(t, 'rec-17-au-tasks-after-waived', {follow: true});
            // Unpaid
            await as(u('se'), t);
            await openWf(t, S.J.A.id, 'rec-18-se-A');
            out.unpaid = await saveMenu('Unpaid', 'rec-19-se-A-unpaid');
            await page.reload(); await idle(page); await sleep(800);
            out.unpaidReload = await openMenu('rec-20-se-A-unpaid-reloaded');
            await closeMenu();
            await as(u('mgr'), t);
            out.listUnpaid = await paymentsList(t, 'rec-21-mgr-list-unpaid');
            // Paid once more, to leave A settled
            await as(u('se'), t);
            await openWf(t, S.J.A.id, 'rec-22-se-A');
            out.paidFinal = await saveMenu('Paid', 'rec-23-se-A-paid-final');
            out.logAfter = await activityLog(t, S.J.A.id, 'rec-24-se-A-activity-after');
            // silence: the counts after a wait, then a control mail to the contact (the Author's notification, A2)
            await sleep(12000);
            out.mailAfterSaves = await countAll();
            await as(u('au'), t);
            await land(S.payLink, 'rec-25-au-payment-page-after-records');
            out.notifyAfterRecord = await pressNav(page.getByRole('link', {name: 'Send notification of payment'}), 'rec-26-au-notify-after-records');
            await sleep(4000);
            out.mailAfterControl = await countAll();
            out.auTasksAfter = await tasks(t, 'rec-27-au-tasks-end');
            S.recDone = true; save();
            fact('rec', out);
            log('[rec]', JSON.stringify({paid: out.paid && out.paid.resp, listPaid: out.listPaid.rows, listWaived: out.listWaived.rows, listUnpaid: out.listUnpaid.rows, mail: [out.mailBefore, out.mailAfterSaves, out.mailAfterControl], log: [out.logBefore.rows && out.logBefore.rows.length, out.logAfter.rows && out.logAfter.rows.length]}));
        });

        // ------------------------------------------------------------------ waive: Rule 8 "Waive" requests the fee all the same (U34 OJS1)
        if (on('waive') && !S.waiveDone) await sect('waive', async () => {
            const out = {};
            const c0 = await mcount(mailOf(u('au')), 'Payment Request Notification');
            await as(u('se'), t);
            out.accept = await acceptWith(t, S.J.G.id, 'Accept and Skip Review', 'Waive', 'waive-01-se-G-accept-skip-waive');
            await openWf(t, S.J.G.id, 'waive-02-se-G-after');
            out.menu = await openMenu('waive-03-se-G-menu');
            await closeMenu();
            await sleep(3000);
            out.mailCount = {before: c0, after: await mcount(mailOf(u('au')), 'Payment Request Notification')};
            out.mail = await mailFacts(mailOf(u('au')), 'Payment Request Notification', S.J.G.title.split(' ').slice(0, 2).join(' '), 10000);
            await as(u('au'), t);
            out.tasks = await tasks(t, 'waive-04-au-tasks');
            await as(u('mgr'), t);
            out.list = await paymentsList(t, 'waive-05-mgr-list');
            S.waiveDone = true; save();
            fact('waive', out);
            log('[waive]', JSON.stringify({menu: out.menu.radios, mail: out.mailCount, tasks: out.tasks.rows}));
        });

        // ------------------------------------------------------------------ pub: td11, Rule 15
        async function tryPublish(id, label, {issue, pub} = {}) {
            await openWf(t, id, `${label}-wf`, pub ? {key: `publication_${pub}_titleAbstract`} : {});
            const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
            let pubBtn = btn;
            if (!(await btn.count())) {
                // from a stage view the header's shortcut leads to the publication first
                const sc = wfDlg().getByRole('button', {name: 'Schedule For Publication', exact: true}).first();
                if (await sc.count()) { await sc.click(); await idle(page); await sleep(1200); }
            }
            if (!(await pubBtn.count())) { record(`${label}-no-button`, {absent: true}); return {noButton: true}; }
            await loc(page, 'publication: the publish button', pubBtn);
            await pubBtn.click(); await idle(page); await sleep(1500);
            let panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
            if (!(await panel.locator('select[name="versionStage"]').count())) { await pubBtn.click().catch(() => {}); await idle(page); await sleep(1500); }
            const out = {};
            if (await panel.locator('select[name="versionStage"]').count()) {
                await panel.locator('select[name="versionStage"]').selectOption('VoR').catch(() => {});
                await panel.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
                await page.waitForFunction(() => document.querySelectorAll('input[name="assignment"]:checked').length === 1, null, {timeout: 20000}).catch(() => {});
                if (issue) {
                    const radio = panel.getByRole('radio', {name: issue.radio, exact: true});
                    if (await radio.count()) await radio.check();
                    const sel = panel.locator('select[name="issueId"]');
                    await sel.locator('option').filter({hasText: issue.label}).first().waitFor({state: 'attached', timeout: 20000}).catch(() => {});
                    const v = await sel.locator('option').filter({hasText: issue.label}).first().getAttribute('value').catch(() => null);
                    if (v) await sel.selectOption(v);
                }
                out.panel = flat(await panel.innerText().catch(() => ''), 1500);
                await snap(`${label}-panel`);
                await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                await idle(page); await sleep(2000);
            }
            const dlgs = await page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((d) => ({text: d.innerText.slice(0, 1500), buttons: [...d.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean)}))).catch(() => []);
            out.window = dlgs[dlgs.length - 1];
            await snap(`${label}-window`, {dialogs: dlgs});
            return out;
        }
        async function confirmWindow(label) {
            const top = page.locator('[role="dialog"]:visible').last();
            const b = top.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last();
            if (!(await b.count())) return {noConfirm: true};
            const resp = page.waitForResponse((r) => /\/publish$/.test(r.url()), {timeout: 30000}).then((r) => r.status()).catch(() => null);
            await b.click();
            const st = await resp;
            await idle(page); await sleep(1500);
            const h = await wfHeader();
            await snap(label, {status: st, header: h});
            return {status: st, text: flat(h.text, 600)};
        }
        async function closeWindow() {
            const top = page.locator('[role="dialog"]:visible').last();
            const c = top.getByRole('button', {name: /^(Cancel|Close|OK)$/}).last();
            if (await c.count()) { await c.click().catch(() => {}); await sleep(900); }
        }
        if (on('pub')) await sect('pub', async () => {
            const out = {};
            const future = {radio: 'Assign To Future Issue and Schedule Only', label: 'Vol. 1 No. 2'};
            const back = {radio: 'Assign To Current/Back Issue', label: 'Vol. 1 No. 1'};
            await as(u('mgr'), t);
            // B: never requested, "Unpaid"
            await openWf(t, S.J.B.id, 'pub-01-mgr-B');
            out.Bmenu = await openMenu('pub-02-mgr-B-menu'); await closeMenu();
            out.Bunpaid = await tryPublish(S.J.B.id, 'pub-03-mgr-B-unpaid', {issue: future});
            await closeWindow();
            await openWf(t, S.J.B.id, 'pub-04-mgr-B');
            out.Bwaive = await saveMenu('Waived', 'pub-05-mgr-B-waived');
            out.Bwaived = await tryPublish(S.J.B.id, 'pub-06-mgr-B-after-waiver', {issue: future});
            out.Bconfirm = await confirmWindow('pub-07-mgr-B-scheduled');
            // G: requested ("Waive" on the decision), still "Unpaid"
            if (S.waiveDone) { out.Gunpaid = await tryPublish(S.J.G.id, 'pub-08-mgr-G-requested-unpaid'); await closeWindow(); }
            // C: "Paid", published into the current issue, then "Unpaid" and a new version
            await openWf(t, S.J.C.id, 'pub-09-mgr-C');
            out.Cpaid = await saveMenu('Paid', 'pub-10-mgr-C-paid');
            out.Cpub = await tryPublish(S.J.C.id, 'pub-11-mgr-C-publish', {issue: back});
            out.Cconfirm = await confirmWindow('pub-12-mgr-C-published');
            await openWf(t, S.J.C.id, 'pub-13-mgr-C-after-publish');
            out.Cunpaid = await saveMenu('Unpaid', 'pub-14-mgr-C-unpaid');
            const nv = wfDlg().getByRole('button', {name: 'Create New Version', exact: true}).first();
            if (await nv.count()) {
                await nv.click(); await idle(page); await sleep(1200);
                const top = page.locator('[role="dialog"]:visible').last();
                await snap('pub-15-mgr-C-new-version-window');
                const ok = top.getByRole('button', {name: /^(Create|Create New Version|Yes|OK|Confirm)$/}).last();
                if (await ok.count()) { await ok.click(); await idle(page); await sleep(2500); }
                await snap('pub-16-mgr-C-new-version-made');
            }
            out.Cv2 = await tryPublish(S.J.C.id, 'pub-17-mgr-C-v2-unpaid', {issue: back});
            await closeWindow();
            fact('pub', out);
            log('[pub]', JSON.stringify({B: flat(out.Bunpaid.window && out.Bunpaid.window.text, 300), Bafter: flat(out.Bwaived.window && out.Bwaived.window.text, 200), Bconfirm: out.Bconfirm, G: flat(out.Gunpaid && out.Gunpaid.window && out.Gunpaid.window.text, 200), C: out.Cconfirm, Cv2: flat(out.Cv2.window && out.Cv2.window.text, 300)}));
        });

        // pub2: a requested fee still "Unpaid" (G), and C's next version after "Unpaid"; "Waive" read back on a fresh submission (W)
        if (on('pub2')) await sect('pub2', async () => {
            const out = {};
            const back = {radio: 'Assign To Current/Back Issue', label: 'Vol. 1 No. 1'};
            await as(u('mgr'), t);
            out.Gunpaid = await tryPublish(S.J.G.id, 'pub2-01-mgr-G-requested-unpaid', {pub: S.J.G.pub, issue: {radio: 'Assign To Future Issue and Schedule Only', label: 'Vol. 1 No. 2'}});
            await closeWindow();
            await openWf(t, S.J.C.id, 'pub2-02-mgr-C', {key: `publication_${S.J.C.pub}_titleAbstract`});
            out.Cmenu = await openMenu('pub2-03-mgr-C-menu'); await closeMenu();
            const nv = page.locator('[role="dialog"]:visible button:visible, [role="dialog"]:visible a:visible').filter({hasText: /^\s*Create New Version\s*$/}).first();
            await loc(page, 'publication: "Create New Version"', nv);
            if (await nv.count()) {
                await nv.click(); await idle(page); await sleep(1500);
                const dl = await page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((d) => ({text: d.innerText.slice(0, 800), buttons: [...d.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean)}))).catch(() => []);
                await snap('pub2-04-mgr-C-new-version-window', {dialogs: dl});
                out.nvWindow = dl[dl.length - 1];
                const top = page.locator('[role="dialog"]:visible').last();
                const ok = top.getByRole('button', {name: /^(Create|Create New Version|Yes|OK|Confirm|Save)$/}).last();
                if (await ok.count()) { await ok.click(); await idle(page); await sleep(2500); }
                await snap('pub2-05-mgr-C-new-version-made');
            }
            const pubs = await page.evaluate(async (id) => { const r = await fetch(`${location.pathname.replace(/dashboard.*$/, '')}api/v1/submissions/${id}`); return r.ok ? (await r.json()).publications.map((p) => ({id: p.id, status: p.status, version: p.version})) : r.status; }, S.J.C.id).catch(() => null);
            out.Cpubs = pubs;
            const latest = Array.isArray(pubs) ? pubs[pubs.length - 1].id : null;
            if (latest) out.Cv2 = await tryPublish(S.J.C.id, 'pub2-06-mgr-C-v2-unpaid', {pub: latest, issue: back});
            await closeWindow();
            // W: "Waive" chosen, read back before "Record Decision"
            if (!S.J.W || !S.J.W.done) {
            if (!S.J.W) {
                const s = await app.api.createSubmission({tag: `${t}w`, context: t, submitter: u('au2'), title: `K3 W ${t}`, participants: [{username: u('se'), role: 'sectionEditor'}]});
                S.J.W = {id: s.submissionId, pub: s.publicationId, title: `K3 W ${t}`}; save();
            }
            const c0 = await mcount(mailOf(u('au2')), 'Payment Request Notification');
            await as(u('se'), t);
            out.W = await acceptWith(t, S.J.W.id, 'Accept and Skip Review', 'Waive', 'pub2-07-se-W-accept-waive');
            await sleep(4000);
            out.Wmail = {before: c0, after: await mcount(mailOf(u('au2')), 'Payment Request Notification')};
            await as(u('au2'), t);
            out.Wtasks = await tasks(t, 'pub2-08-au2-tasks');
            S.J.W.done = true; save();
            }
            fact('pub2', out);
            log('[pub2]', JSON.stringify({G: flat(out.Gunpaid && out.Gunpaid.window && out.Gunpaid.window.text, 300), Cmenu: out.Cmenu && out.Cmenu.radios, nv: out.nvWindow && flat(out.nvWindow.text, 200), pubs, Cv2: flat(out.Cv2 && out.Cv2.window && out.Cv2.window.text, 300), Wchosen: out.W && out.W.chosen, Wmail: out.Wmail, Wtasks: out.Wtasks.rows}));
        });

        // cur: the currency axis of Rules 8 and 14 (the journal switched to EUR after A's request)
        if (on('cur') && S.recDone && !S.curDone) await sect('cur', async () => {
            const out = {};
            if (!S.J.V) {
                const sv = await app.api.createSubmission({tag: `${t}v`, context: t, submitter: u('au'), title: `K3 V ${t}`, participants: [{username: u('se'), role: 'sectionEditor'}]});
                S.J.V = {id: sv.submissionId, pub: sv.publicationId}; save();
            }
            await as(u('mgr'), t);
            await paySettings(t, 'cur-01-mgr-settings');
            await page.locator('#payments select[name=currency]').selectOption('EUR');
            out.save = await savePaySettings('cur-02-mgr-currency-eur-saved');
            await as(u('au'), t);
            out.aPage = await land(S.payLink, 'cur-03-au-A-payment-page-after-eur');
            await as(u('se'), t);
            await openWf(t, S.J.V.id, 'cur-04-se-V', {key: 'workflow_1'});
            await wfDlg().getByRole('button', {name: 'Accept and Skip Review', exact: true}).first().click(); await idle(page);
            await page.waitForURL(/\/decision\//, {timeout: 30000}).catch(() => {});
            out.vPage1 = await decisionPage('cur-05-se-V-accept-page1-eur');
            await openWf(t, S.J.V.id, 'cur-06-se-V-back');
            out.vPaid = await saveMenu('Paid', 'cur-07-se-V-paid-eur');
            await as(u('mgr'), t);
            out.list = await paymentsList(t, 'cur-08-mgr-list-eur');
            S.curDone = true; save();
            fact('cur', out);
            log('[cur]', JSON.stringify({save: out.save, aPage: out.aPage.tables, v: out.vPage1.radios, list: out.list.rows}));
        });

        // ------------------------------------------------------------------ J2: tpl (Setting 9) and off (td8, A3)
        if ((on('tpl') || on('off')) && !S.J2) await sect('seed2', async () => {
            const t2 = tag('u52k3k');
            const U = (k, role, g, f) => ({username: `${t2}${k}`, roles: [role], givenName: g, familyName: f});
            await app.api.createContext({tag: t2, context: {name: `U52 K3 second ${t2}`, acronym: 'KTWO', contactName: 'K3 Principal Two', contactEmail: `${t2}pc@mail.test`},
                users: [U('mgr', 'manager', 'Mia', 'Manager'), U('se', 'sectionEditor', 'Sam', 'Section'), U('au', 'author', 'Ada', 'Author')],
                payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: INSTR, publicationFee: 50}});
            const s = await app.api.createSubmission({tag: `${t2}d`, context: t2, submitter: `${t2}au`, title: `K3 D ${t2}`, participants: [{username: `${t2}se`, role: 'sectionEditor'}]});
            S.J2 = {t: t2, D: s.submissionId}; save();
        });
        const t2 = S.J2 && S.J2.t;
        if (on('tpl') && S.J2 && !S.tplDone) await sect('tpl', async () => {
            const out = {};
            await as(`${t2}mgr`, t2);
            await page.goto(cUrl(t2, '/management/settings/manageEmails')); await idle(page);
            await page.locator('main').getByRole('button', {name: /^Edit /}).first().waitFor({timeout: 30000}).catch(() => {});
            out.names = await page.evaluate(() => [...document.querySelectorAll('main button')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter((s) => /^Edit /.test(s)).map((s) => s.replace(/^Edit (Edit )?/, '')));
            await snap('tpl-01-mgr-manage-emails', {names: out.names});
            const btn = page.locator('main').getByRole('button', {name: 'Edit Payment Request', exact: true});
            await loc(page, 'Manage Emails: "Edit Payment Request"', btn);
            if (await btn.count()) {
                const respP = page.waitForResponse((r) => /api\/v1\/(mailables|emailTemplates)\//.test(r.url()) && r.request().method() === 'GET', {timeout: 20000}).catch(() => null);
                await btn.click();
                const r = await respP;
                const multi = r && /mailables/.test(r.url());
                if (multi) {
                    const d = page.getByRole('dialog', {name: 'Payment Request', exact: true}).last();
                    await d.waitFor({timeout: 15000}).catch(() => {});
                    await snap('tpl-02-mgr-payment-request-window');
                    await d.getByRole('button', {name: 'Edit', exact: true}).first().click();
                }
                const ed = page.getByRole('dialog', {name: 'Edit Template'}).last();
                await ed.waitFor({timeout: 15000}).catch(() => {});
                await page.waitForFunction(() => window.tinymce && window.tinymce.get('editEmailTemplate-body-control-en') && window.tinymce.get('editEmailTemplate-body-control-en').initialized, null, {timeout: 15000}).catch(() => {});
                out.defaultBody = await page.evaluate(() => window.tinymce.get('editEmailTemplate-body-control-en').getContent()).catch(() => null);
                out.defaultSubject = await ed.locator('input[name="subject-en"]').inputValue().catch(() => null);
                await snap('tpl-03-mgr-edit-template', {defaultBody: out.defaultBody});
                await page.evaluate(() => { const e = window.tinymce.get('editEmailTemplate-body-control-en'); e.setContent(e.getContent() + '<p>K3 edited sentence for the payment request.</p>'); e.fire('change'); e.fire('input'); e.save(); });
                // a keystroke so the form takes the change as typed
                const ifr = page.frameLocator('#editEmailTemplate-body-control-en_ifr').locator('body');
                await ifr.click(); await page.keyboard.press('End'); await page.keyboard.type(' ');
                const saveResp = page.waitForResponse((x) => /api\/v1\/emailTemplates/.test(x.url()) && x.request().method() !== 'GET', {timeout: 20000}).then((x) => x.status()).catch(() => null);
                await ed.getByRole('button', {name: 'Save', exact: true}).click();
                out.saveStatus = await saveResp;
                await sleep(1500);
                await snap('tpl-04-mgr-template-saved', {saveStatus: out.saveStatus});
            }
            // the request on D
            await as(`${t2}se`, t2);
            out.accept = await acceptWith(t2, S.J2.D, 'Accept and Skip Review', null, 'tpl-05-se-D-accept-skip');
            out.mail = await mailFacts(mailOf(`${t2}au`), 'Payment Request Notification');
            S.J2.payLink = ((out.mail.links || []).find((l) => /payment\/pay\//.test(l.href)) || {}).href || null;
            S.tplDone = true; save();
            fact('tpl', out);
            log('[tpl]', out.saveStatus, flat(out.mail.text, 600), 'names has Manual?', JSON.stringify((out.names || []).filter((n) => /Pay/i.test(n))));
        });
        if (on('off') && S.J2 && S.J2.payLink && !S.offDone) await sect('off', async () => {
            const out = {link: S.J2.payLink};
            const people = [`${t2}au`, `${t2}mgr`, `${t2}se`];
            const counts = async () => { const c = {}; for (const k of people) c[k] = (await app.mail._search({to: mailOf(k)}).catch(() => ({messages: []}))).messages.length; c.contact = (await app.mail._search({to: `${t2}pc@mail.test`}).catch(() => ({messages: []}))).messages.length; return c; };
            await as(`${t2}au`, t2);
            out.on = await tasks(t2, 'off-01-au-tasks-payments-on', {follow: true});
            out.mail0 = await counts();
            // "Enable" unticked
            await as(`${t2}mgr`, t2);
            await paySettings(t2, 'off-02-mgr-settings');
            await page.locator('#payments input[name=paymentsEnabled]').uncheck();
            out.saveOff = await savePaySettings('off-03-mgr-enable-unticked-saved');
            await as(`${t2}au`, t2);
            out.enableOff = await tasks(t2, 'off-04-au-tasks-enable-off', {follow: true});
            out.enableOffLink = await land(S.J2.payLink, 'off-05-au-email-link-enable-off');
            await as(`${t2}se`, t2);
            out.seHeaderOff = await openWf(t2, S.J2.D, 'off-06-se-D-enable-off');
            // "Enable" ticked, the instructions emptied
            await as(`${t2}mgr`, t2);
            await paySettings(t2, 'off-07-mgr-settings');
            await page.locator('#payments input[name=paymentsEnabled]').check(); await sleep(300);
            await page.locator('#payments textarea[name=manualInstructions]').fill('');
            out.saveEmpty = await savePaySettings('off-08-mgr-instructions-emptied-saved');
            out.settingsEmpty = await paySettings(t2, 'off-09-mgr-settings-reloaded');
            await as(`${t2}au`, t2);
            out.instrEmpty = await land(S.J2.payLink, 'off-10-au-email-link-instructions-empty');
            // the method cleared, if the list offers no method
            await as(`${t2}mgr`, t2);
            const st = await paySettings(t2, 'off-11-mgr-settings');
            out.methodOptions = st.methodOptions;
            await page.locator('#payments textarea[name=manualInstructions]').fill(INSTR).catch(() => {});
            const emptyOpt = (st.methodOptions || []).find((o) => o.startsWith('='));
            if (emptyOpt !== undefined) {
                await page.locator('#payments select[name=paymentPluginName]').selectOption('');
                out.saveNoMethod = await savePaySettings('off-12-mgr-method-cleared-saved');
                out.settingsNoMethod = await paySettings(t2, 'off-13-mgr-settings-reloaded');
                await as(`${t2}au`, t2);
                out.noMethod = await land(S.J2.payLink, 'off-14-au-email-link-no-method');
            }
            await sleep(8000);
            out.mail1 = await counts();
            S.offDone = true; save();
            fact('off', out);
            log('[off]', JSON.stringify({enableOff: [out.enableOff.followed && out.enableOff.followed.status, out.enableOff.followed && flat(out.enableOff.followed.text, 200)], link: [out.enableOffLink.status, flat(out.enableOffLink.text, 200)], instrEmpty: [out.instrEmpty.status, flat(out.instrEmpty.text, 200)], noMethod: out.noMethod && [out.noMethod.status, flat(out.noMethod.text, 200)], methodOptions: out.methodOptions, mail: [out.mail0, out.mail1]}));
        });

        // off2: "Enable" unticked with the instructions filled: the task, the page and its button
        if (on('off2') && S.offDone && !S.off2Done) await sect('off2', async () => {
            const out = {};
            await as(`${t2}mgr`, t2);
            await paySettings(t2, 'off2-01-mgr-settings');
            await page.locator('#payments textarea[name=manualInstructions]').fill(INSTR);
            out.saveOn = await savePaySettings('off2-02-mgr-instructions-refilled-saved');
            await paySettings(t2, 'off2-03-mgr-settings');
            await page.locator('#payments input[name=paymentsEnabled]').uncheck();
            out.saveOff = await savePaySettings('off2-04-mgr-enable-unticked-saved');
            out.settings = await paySettings(t2, 'off2-05-mgr-settings-reloaded');
            out.sideMenu = await page.locator('nav a, aside a').allInnerTexts().then((a) => a.map((x) => x.trim()).filter((x) => /Payment|Institution/.test(x))).catch(() => []);
            const c0 = await mcount(`${t2}pc@mail.test`, 'Manual Payment Notification');
            await as(`${t2}au`, t2);
            out.task = await tasks(t2, 'off2-06-au-tasks-enable-off', {follow: true});
            out.notify = await pressNav(page.getByRole('link', {name: 'Send notification of payment'}), 'off2-07-au-notify-enable-off');
            out.mail = await mailFacts(`${t2}pc@mail.test`, 'Manual Payment Notification', undefined, 15000);
            out.count = {before: c0, after: await mcount(`${t2}pc@mail.test`, 'Manual Payment Notification')};
            out.cont = await pressNav(page.getByRole('link', {name: 'Continue', exact: true}), 'off2-08-au-continue');
            await as(`${t2}se`, t2);
            out.header = await openWf(t2, S.J2.D, 'off2-09-se-D');
            S.off2Done = true; save();
            fact('off2', out);
            log('[off2]', JSON.stringify({saveOff: out.saveOff, settings: out.settings, sideMenu: out.sideMenu, task: out.task.followed && [out.task.followed.status, out.task.followed.h1], notify: [out.notify.status, out.notify.h1, flat(out.notify.text, 150)], mail: {to: out.mail.to, from: out.mail.from, err: out.mail.error}, count: out.count, cont: out.cont.url, payments: out.header.paymentsPresent}));
        });

        // ------------------------------------------------------------------ pp: td9 (PayPal), then Rule 3 (back to the manual method)
        if (on('pp') && !S.ppDone) await sect('pp', async () => {
            if (!S.J3) {
                const t3 = tag('u52k3q');
                const U = (k, role, g, f) => ({username: `${t3}${k}`, roles: [role], givenName: g, familyName: f});
                await app.api.createContext({tag: t3, context: {name: `U52 K3 paypal ${t3}`, acronym: 'KPP', contactName: 'K3 Principal Three', contactEmail: `${t3}pc@mail.test`},
                    users: [U('mgr', 'manager', 'Max', 'Manager'), U('se', 'sectionEditor', 'Sol', 'Section'), U('au', 'author', 'Ari', 'Author')],
                    payments: {currency: 'USD', paymentPluginName: 'PaypalPayment', publicationFee: 50}});
                const s = await app.api.createSubmission({tag: `${t3}e`, context: t3, submitter: `${t3}au`, title: `K3 E ${t3}`, participants: [{username: `${t3}se`, role: 'sectionEditor'}]});
                S.J3 = {t: t3, E: s.submissionId}; save();
            }
            const t3 = S.J3.t;
            const out = {};
            await as(`${t3}mgr`, t3);
            out.before = await paySettings(t3, 'pp-01-mgr-settings-paypal');
            const panel = page.locator('#payments');
            await panel.locator('input[name=accountName]').fill('test');
            await panel.locator('input[name=clientId]').fill('x');
            await panel.locator('input[name=secret]').fill('x');
            out.save = await savePaySettings('pp-02-mgr-paypal-saved');
            out.after = await paySettings(t3, 'pp-03-mgr-settings-reloaded');
            await as(`${t3}se`, t3);
            out.accept = await acceptWith(t3, S.J3.E, 'Accept and Skip Review', null, 'pp-04-se-E-accept-skip');
            out.mail = await mailFacts(mailOf(`${t3}au`), 'Payment Request Notification');
            S.J3.payId = (((out.mail.links || []).find((l) => /payment\/pay\//.test(l.href)) || {}).href || '').split('/').pop() || null; save();
            await as(`${t3}au`, t3);
            const tk = await tasks(t3, 'pp-05-au-tasks', {follow: true});
            out.task = tk;
            // Rule 3: back to the manual method, the same task
            await as(`${t3}mgr`, t3);
            await paySettings(t3, 'pp-06-mgr-settings');
            await page.locator('#payments select[name=paymentPluginName]').selectOption('ManualPayment');
            await sleep(300);
            await page.locator('#payments textarea[name=manualInstructions]').fill(INSTR);
            out.saveManual = await savePaySettings('pp-07-mgr-manual-saved');
            await as(`${t3}au`, t3);
            out.taskManual = await tasks(t3, 'pp-08-au-tasks-manual', {follow: true});
            S.ppDone = true; save();
            fact('pp', out);
            log('[pp]', JSON.stringify({after: out.after, requestPage: out.accept.pages && out.accept.pages[0] && out.accept.pages[0].radios, task: tk.followed && [tk.followed.status, tk.followed.url, tk.followed.chain, flat(tk.followed.text, 300)], manual: out.taskManual.followed && [out.taskManual.followed.url, out.taskManual.followed.h1]}));
        });

        // ------------------------------------------------------------------ sub: td14, A8, Rule 10 "Continue" for reader fees
        if (on('sub') && !S.subDone) await sect('sub', async () => {
            if (!S.J4) {
                const t4 = tag('u52k3r');
                const U = (k, role, g, f) => ({username: `${t4}${k}`, roles: [role], givenName: g, familyName: f});
                const r = await app.api.createContext({tag: t4, context: {name: `U52 K3 subscriptions ${t4}`, acronym: 'KSUB', contactName: 'K3 Principal Four', contactEmail: `${t4}pc@mail.test`},
                    publishingMode: 'subscription',
                    users: [U('mgr', 'manager', 'Mo', 'Manager'), U('au', 'author', 'Abe', 'Author'), U('rd', 'reader', 'Rae', 'Buyer'), U('rn', 'reader', 'Ren', 'Renewer'), U('ra', 'reader', 'Ria', 'Articlebuyer'), U('ri', 'reader', 'Ivo', 'Issuebuyer')],
                    payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: INSTR, purchaseArticleFee: 5, purchaseIssueFee: 7},
                    subscriptionName: 'K3 Subscriptions Desk', subscriptionEmail: `${t4}desk@mail.test`, subscriptionMailingAddress: '1 Desk Road',
                    subscriptionTypes: [{name: 'K3 Individual', cost: 10, currency: 'USD', duration: 12}],
                    subscriptions: [{user: `${t4}rn`, type: 'K3 Individual'}],
                    issues: [{volume: 1, number: 1, year: 2026, published: true}]});
                const s = await app.api.createSubmission({tag: `${t4}r`, context: t4, submitter: `${t4}au`, title: `K3 R ${t4}`, published: true, issue: {volume: 1, number: 1, year: 2026}, galleys: [{label: 'PDF', file: 'article.pdf'}]});
                S.J4 = {t: t4, R: s.submissionId, issues: r.issues}; save();
            }
            const t4 = S.J4.t;
            const out = {};
            const deskN = async () => (await app.mail._search({to: `${t4}desk@mail.test`}).catch(() => ({messages: []}))).messages.length;
            // a subscription bought
            await as(`${t4}rd`, t4);
            out.buyForm = await land(`/index.php/${t4}/user/purchaseSubscription/individual`, 'sub-01-rd-purchase');
            out.buyPage = await pressNav(page.locator('form#subscriptionForm button.submit'), 'sub-02-rd-purchase-saved');
            out.buyNotify = await pressNav(page.getByRole('link', {name: 'Send notification of payment'}), 'sub-03-rd-notify');
            out.buyMail = await mailFacts(`${t4}pc@mail.test`, 'Manual Payment Notification');
            out.buyCont = await pressNav(page.getByRole('link', {name: 'Continue', exact: true}), 'sub-04-rd-continue');
            // renewed
            await as(`${t4}rn`, t4);
            out.my = await land(`/index.php/${t4}/user/subscriptions`, 'sub-05-rn-my-subscriptions');
            out.renewPage = await pressNav(page.getByRole('link', {name: 'Renew', exact: true}), 'sub-06-rn-renew');
            out.renewNotify = await pressNav(page.getByRole('link', {name: 'Send notification of payment'}), 'sub-07-rn-notify');
            out.renewCont = await pressNav(page.getByRole('link', {name: 'Continue', exact: true}), 'sub-08-rn-continue');
            // an article
            await as(`${t4}ra`, t4);
            await land(`/index.php/${t4}/article/view/${S.J4.R}`, 'sub-09-ra-article');
            out.artPage = await pressNav(page.locator('a.obj_galley_link').first(), 'sub-10-ra-galley');
            out.artNotify = await pressNav(page.getByRole('link', {name: 'Send notification of payment'}), 'sub-11-ra-notify');
            out.artCont = await pressNav(page.getByRole('link', {name: 'Continue', exact: true}), 'sub-12-ra-continue');
            out.artAgain = await pressNav(page.locator('a.obj_galley_link').first(), 'sub-13-ra-galley-again');
            // an issue: the issue page's galley, if the issue has one
            await as(`${t4}ri`, t4);
            const iss = await land(`/index.php/${t4}/issue/current`, 'sub-14-ri-current-issue');
            out.issuePage = {links: iss.links, h1: iss.h1};
            const ig = page.locator('.obj_issue_toc .galleys a.obj_galley_link, .issue_toc .galleys_links a').first();
            if (await ig.count()) {
                out.issPay = await pressNav(ig, 'sub-15-ri-issue-galley');
                out.issNotify = await pressNav(page.getByRole('link', {name: 'Send notification of payment'}), 'sub-16-ri-notify');
                out.issCont = await pressNav(page.getByRole('link', {name: 'Continue', exact: true}), 'sub-17-ri-continue');
            } else out.issueGalley = 'none on the issue page';
            await sleep(3000);
            out.contactN = (await app.mail._search({to: `${t4}pc@mail.test`}).catch(() => ({messages: []}))).messages.length;
            out.deskN = await deskN();
            S.subDone = true; save();
            fact('sub', out);
            log('[sub]', JSON.stringify({buyMail: {from: out.buyMail.from, to: out.buyMail.to, text: flat(out.buyMail.text, 300)}, buyCont: out.buyCont.url, renewCont: out.renewCont.url, artCont: out.artCont.url, artAgain: out.artAgain.url, iss: out.issCont && out.issCont.url, contactN: out.contactN, deskN: out.deskN}));
        });

        // subiss: an issue bought (an issue galley made on screen first)
        if (on('subiss') && S.J4 && !S.subissDone) await sect('subiss', async () => {
            const t4 = S.J4.t;
            const out = {};
            await as(`${t4}mgr`, t4);
            await page.goto(cUrl(t4, '/manageIssues')); await idle(page);
            await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
            const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
            await panel.locator('table').first().waitFor({timeout: 30000});
            await panel.getByRole('link', {name: 'Vol. 1 No. 1 (2026)', exact: true}).click();
            const dlg = page.getByRole('dialog', {name: /^Issue Management/});
            await dlg.waitFor({timeout: 30000}); await idle(page);
            await dlg.getByRole('tab', {name: 'Issue Galleys', exact: true}).click(); await idle(page); await sleep(600);
            const tp = dlg.getByRole('tabpanel', {name: 'Issue Galleys'});
            await tp.getByRole('link', {name: 'Create Issue Galley', exact: true}).click();
            const gw = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('input[name="label"]')}).last();
            await gw().waitFor({timeout: 30000}); await idle(page); await sleep(500);
            const up = page.waitForResponse((r) => /issue-galley-grid\/upload/.test(r.url()), {timeout: 30000}).catch(() => null);
            await gw().locator('input[type="file"]').setInputFiles(path.resolve(__dirname, '../../../../../apps/ojs/playwright/fixtures/files/article.pdf'));
            out.upload = await up.then((r) => r && r.status());
            await idle(page); await sleep(500);
            await gw().locator('input[name="label"]').fill('Full Issue PDF');
            const sv = page.waitForResponse((r) => /issue-galley-grid\/update/.test(r.url()), {timeout: 30000}).catch(() => null);
            await gw().getByRole('button', {name: 'Save', exact: true}).click();
            out.save = await sv.then((r) => r && r.status());
            await idle(page); await sleep(1000);
            await snap('subiss-01-mgr-issue-galley-saved', {out});
            await as(`${t4}ri`, t4);
            const iss = await land(`/index.php/${t4}/issue/current`, 'subiss-02-ri-current-issue');
            out.issueLinks = iss.links;
            const ig = page.locator('a').filter({hasText: /Full Issue PDF/}).first();
            out.pay = await pressNav(ig, 'subiss-03-ri-issue-galley');
            out.notify = await pressNav(page.getByRole('link', {name: 'Send notification of payment'}), 'subiss-04-ri-notify');
            out.mail = await mailFacts(`${t4}pc@mail.test`, 'Manual Payment Notification', 'Purchase Issue', 15000);
            out.cont = await pressNav(page.getByRole('link', {name: 'Continue', exact: true}), 'subiss-05-ri-continue');
            S.subissDone = true; save();
            fact('subiss', out);
            log('[subiss]', JSON.stringify({upload: out.upload, save: out.save, links: (out.issueLinks || []).map((l) => l.text), pay: [out.pay.url, out.pay.h1, out.pay.tables], notifyCont: (out.notify.links || []).find((l) => l.text === 'Continue'), cont: out.cont.url, mail: {to: out.mail.to, text: flat(out.mail.text, 200), err: out.mail.error}}));
        });

        // sweep: the menu left with an unsaved choice; the Author's task deleted from the Tasks panel (J3); the side menu
        if (on('sweep')) await sect('sweep', async () => {
            const out = {};
            await as(u('mgr'), t);
            await openWf(t, S.J.F.id, 'sweep-01-mgr-F');
            out.open = await openMenu('sweep-02-mgr-F-menu');
            await payContent().getByRole('radio', {name: 'Paid', exact: true}).check({force: true});
            await payBtn().click(); await sleep(400);
            out.closedWithChange = await payContent().count();
            out.reopened = await openMenu('sweep-03-mgr-F-menu-reopened-unsaved');
            const d0 = dialogs.length;
            await page.goto(cUrl(t, '/dashboard/editorial')); await idle(page);
            out.leaveDialogs = dialogs.slice(d0);
            await openWf(t, S.J.F.id, 'sweep-04-mgr-F-back');
            out.back = await openMenu('sweep-05-mgr-F-menu-after-leaving');
            await closeMenu();
            out.nav = await page.evaluate(() => [...document.querySelectorAll('nav a, [role=navigation] a, .app__nav a, aside a')].map((a) => a.innerText.trim()).filter(Boolean)).catch(() => []);
            await page.goto(cUrl(t, '/dashboard/editorial')); await idle(page);
            out.sideMenu = await page.evaluate(() => [...document.querySelectorAll('a, button')].filter((e) => e.getClientRects().length && e.closest('nav, aside, [class*=nav], [class*=Nav]')).map((a) => a.innerText.trim()).filter(Boolean).slice(0, 40)).catch(() => []);
            await snap('sweep-06-mgr-side-menu', {sideMenu: out.sideMenu});
            if (S.J3) {
                const t3 = S.J3.t;
                await as(`${t3}au`, t3);
                await tasks(t3, 'sweep-07-au-J3-tasks');
                const win = page.locator('[role="dialog"]:visible').last();
                const row = win.locator('tr.gridRow').filter({hasText: /publication fee/i}).first();
                if (await row.count()) {
                    await row.locator('input[type=checkbox]').first().check().catch(() => {});
                    const del = win.getByRole('link', {name: 'Delete', exact: true}).or(win.getByRole('button', {name: 'Delete', exact: true})).first();
                    await loc(page, 'Tasks: "Delete"', del);
                    const dd = dialogs.length;
                    await del.click().catch(() => {}); await idle(page); await sleep(1500);
                    const conf = page.locator('[role="dialog"]:visible').last();
                    const confText = flat(await conf.innerText().catch(() => ''), 300);
                    const ok = conf.getByRole('button', {name: /^(OK|Yes|Delete)$/}).first();
                    if (/sure|delete/i.test(confText) && await ok.count()) { await ok.click().catch(() => {}); await idle(page); await sleep(1200); }
                    out.deleteDialogs = dialogs.slice(dd); out.deleteConfirm = confText;
                    out.afterDelete = await tasks(t3, 'sweep-08-au-J3-tasks-after-delete');
                    out.linkAfterDelete = await land(`/index.php/${t3}/payment/pay/${(S.J3.payId || '')}`, 'sweep-09-au-J3-email-link-after-delete');
                }
            }
            fact('sweep', out);
            log('[sweep]', JSON.stringify({open: out.open.radios, closedWithChange: out.closedWithChange, reopened: out.reopened.radios, leave: out.leaveDialogs, back: out.back.radios, side: out.sideMenu, del: out.deleteConfirm, after: out.afterDelete && out.afterDelete.rows, link: out.linkAfterDelete && [out.linkAfterDelete.status, out.linkAfterDelete.h1]}));
        });

        // ------------------------------------------------------------------ pk: the seeded journal keeps payments off (s0), read only
        if (on('pk')) await sect('pk', async () => {
            await as('manager.maya', 'publicknowledge');
            const st = await paySettings('publicknowledge', 'pk-01-maya-settings-payments');
            fact('pk', st);
            log('[pk]', JSON.stringify(st));
        });
    } finally {
        record('k3-dialogs', {dialogs});
        await close();
    }
});
