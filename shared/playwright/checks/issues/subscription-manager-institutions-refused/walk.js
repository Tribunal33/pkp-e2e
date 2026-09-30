// Issue report walk: docs/issues/U51-A16-subscription-manager-institutions-refused.md
// (spec U51 register A16). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// OJS only (the Subscription Manager and subscriptions are OJS's), on its
// own journal `publicknowledge` and its own users: `rvaca` (the manager),
// `jjanssen` (a Reviewer, made Subscription Manager by the steps) and, for the
// neighbour check, `sberardo` (Section editor).
//
// The kit builds nothing. Everything goes through the screens:
//   precondition: as rvaca, Settings › Distribution › Payments, "Enable",
//      "US Dollar", "Manual Fee Payment", "Save"; Users & Roles › Users ›
//      "Invite to a role" for jjanssen@mailinator.com as "Subscription Manager";
//      jjanssen accepts from the emailed link
//   control: rvaca's side menu, "Institutions" pressed
//   steps: jjanssen signs in, the side menu is read; "Payments" ›
//      "Institutional Subscriptions" › "Create New Subscription" is read and
//      closed; "Institutions" pressed. Where the page opens (the fix in),
//      "Add Institution", Name "Campus Library <tag>", "Save", and the
//      subscription window's "Institution" list is read again
//   neighbour check: jjanssen types Settings › Website's and Announcements'
//      addresses; sberardo types the Institutions page's address. All three
//      must stay refused with or without fix.diff.
// Records every screen with screen().
//
// Trying the fix (REPORT.md "Proposed fix", harness.md "Trying a fix"):
//   node bin/try-fix.js apply shared/playwright/checks/issues/subscription-manager-institutions-refused/fix.diff ojs
//   reset, run as below with PROBE_RUN=fix, then: node bin/try-fix.js revert ojs
//
// Reset first:  npm run fleet-prep -- --feature issues-w5 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-w5 PROBE_AGENT=w5 node bin/probe.js ojs shared/playwright/checks/issues/subscription-manager-institutions-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w5-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w5-3_5 PROBE_AGENT=w5 node bin/probe.js ojs shared/playwright/checks/issues/subscription-manager-institutions-refused/walk.js
// Facts: .reports/<feature>/w5/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag, drainJobs} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const DENIED = /The current role does not have access to this operation\./;
const today = () => new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no Subscription Manager on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {PaymentsPage, SubscriptionWindow} = require('../../../pages/SubscriptionsPages.js');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const t = tag('u51w5');
    const path = app.contextPath; // publicknowledge
    const sm = 'jjanssen';
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, context: path, tag: t});
    const cu = (p) => app.url(`/index.php/${path}/en${p}`);
    const rel = (u) => u.replace(/^https?:\/\/[^/]+/, '');
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        return s;
    }
    const nav = () => page.getByRole('navigation', {name: 'Site Navigation'});
    async function readNav() {
        await nav().first().waitFor({timeout: 8000}).catch(() => {});
        await idle(page); await pause(400);
        if (!(await nav().count().catch(() => 0))) return {present: false};
        return nav().first().evaluate((el) => {
            const tx = (e) => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim();
            const groups = [...el.querySelectorAll('[role="button"][aria-controls]')].map(tx);
            const links = [...el.querySelectorAll('a')].map((a) => ({text: tx(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}));
            return {
                present: true,
                institutions: links.some((l) => /management\/settings\/institutions/.test(l.href)),
                payments: links.some((l) => /\/payments$/.test(l.href)),
                entries: [...groups, ...links.map((l) => l.text)].filter((x, i, a) => x && a.indexOf(x) === i),
            };
        });
    }
    async function pressMenu(hrefPart) {
        const link = nav().locator(`a[href*="${hrefPart}"]`).first();
        const before = page.url();
        await Promise.all([page.waitForURL((u) => u.href !== before, {timeout: T}), link.click()]);
        await idle(page); await pause(400);
    }
    /** "Payments" › "Institutional Subscriptions" › "Create New Subscription": the window's messages and "Institution" list. */
    async function institutionalWindow(label) {
        await pressMenu('/payments');
        const payments = new PaymentsPage(page, path);
        await payments.showTab('Institutional Subscriptions');
        await payments.panel('Institutional Subscriptions').getByRole('link', {name: 'Create New Subscription', exact: true}).click();
        const win = new SubscriptionWindow(page, 'Create New Subscription');
        await win.expectOpen();
        await pause(400);
        const s = await snap(`${label}-institutional-window`);
        const out = {
            institutionFirst: /An institution must be created before new subscriptions can be made\./.test(s.text.dialog || ''),
            typeFirst: /A subscription type must be created before new subscriptions can be made\./.test(s.text.dialog || ''),
            institutionOptions: await win.dialog.locator('select[name="institutionId"] option').allInnerTexts().catch(() => []),
        };
        fact(`${label} institutional subscription window`, out);
        await win.close();
        return out;
    }
    async function pressInstitutions(label) {
        await pressMenu('management/settings/institutions');
        const s = await snap(`${label}-institutions-pressed`);
        const txt = `${s.text.main || ''} ${s.text.dialog || ''}`;
        const out = {
            url: rel(page.url()),
            denied: DENIED.test(txt),
            h1: await page.locator('main h1, h1').first().innerText().catch(() => null),
            addInstitution: await page.getByRole('button', {name: 'Add Institution', exact: true}).count(),
        };
        fact(`${label} pressed Institutions`, out);
        if (label !== 'rvaca') await shot(page, `${label}-institutions-pressed`);
        return out;
    }
    async function addInstitution(label) {
        const name = `Campus Library ${t}`;
        await page.getByRole('button', {name: 'Add Institution', exact: true}).click();
        const add = page.getByRole('dialog').filter({hasText: 'Add Institution'});
        await add.getByRole('button', {name: 'Save'}).waitFor({timeout: T});
        await idle(page);
        await add.getByLabel('Name', {exact: false}).first().fill(name);
        const w = page.waitForResponse((r) => /api\/v1\/institutions/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await add.getByRole('button', {name: 'Save'}).click();
        const r = await w;
        await add.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page); await pause(600);
        const rows = (await page.locator('main .listPanel__item').allInnerTexts().catch(() => [])).map((x) => x.replace(/\s+/g, ' ').trim().slice(0, 120));
        await snap(`${label}-institution-added`);
        fact(`${label} Add Institution saved`, {status: r ? r.status() : null, rowShown: rows.some((x) => x.includes(name)), rows});
        return name;
    }
    async function byAddress(label, p) {
        await page.goto(cu(p));
        await idle(page);
        const s = await snap(`${label}-${p.split('/').pop()}-by-address`);
        const out = {url: rel(page.url()), denied: DENIED.test(`${s.text.main || ''}`), h1: await page.locator('main h1, h1').first().innerText().catch(() => null)};
        fact(`${label} ${p} by address`, out);
        return out;
    }
    try {
        // Precondition: payments enabled, as the manager.
        await signIn(page, 'rvaca', {contextPath: path});
        await page.goto(cu('/management/settings/distribution'));
        await idle(page);
        await page.locator('#payments-button').click();
        await idle(page); await pause(500);
        const pay = page.locator('#payments');
        await pay.locator('input[name="paymentsEnabled"]').first().check();
        await pause(300);
        await pay.locator('select[name="currency"]').first().selectOption({label: 'US Dollar'});
        await pay.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'});
        await pause(300);
        const rs = page.waitForResponse((x) => /\/_payments/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await pay.getByRole('button', {name: 'Save', exact: true}).first().click();
        const r = await rs; await idle(page); await pause(500);
        fact('payments saved', r ? r.status() : null);
        await snap('payments-saved');

        // Precondition: jjanssen invited to "Subscription Manager".
        await page.goto(cu('/management/settings/access'));
        await idle(page);
        await page.getByRole('button', {name: 'Invite to a role'}).click();
        await page.getByLabel(/Search for a user by email address/).fill(`${sm}@mailinator.com`);
        await page.getByRole('button', {name: 'Search User', exact: true}).click();
        const newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).first();
        await newRow.waitFor({timeout: T});
        await idle(page);
        const roleOptions = await newRow.getByRole('combobox').first().locator('option').allInnerTexts();
        fact('invite role choices', roleOptions);
        await newRow.getByRole('combobox').first().selectOption({label: 'Subscription Manager'});
        await newRow.getByRole('textbox').fill(today());
        await newRow.getByRole('combobox').last().selectOption({index: 1});
        await snap('invite-details');
        await page.getByRole('button', {name: 'Save And Continue'}).click();
        await page.locator('input[name="subject"]').waitFor({timeout: T});
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
        // The newest message to the invitee before sending, so an earlier walk's invitation is never taken for this one.
        const before = await app.mail.find({to: `${sm}@mailinator.com`, timeoutMs: 1}).catch(() => null);
        await page.getByRole('button', {name: 'Invite user to the role'}).click();
        await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T});
        await snap('invitation-sent');
        // The dataset runs its jobs on web requests; drainJobs only if the mail is late.
        const fresh = async (ms) => {
            const end = Date.now() + ms;
            for (;;) {
                const m = await app.mail.find({to: `${sm}@mailinator.com`, subject: undefined, timeoutMs: 1}).catch(() => null);
                if (m && (!before || m.ID !== before.ID)) return m;
                if (Date.now() > end) return null;
                await pause(500);
            }
        };
        let msg = await fresh(15_000);
        if (!msg) { await drainJobs(app).catch(() => {}); msg = await fresh(15_000); fact('mail needed drainJobs', true); }
        if (!msg) throw new Error('no new invitation email');
        const full = await app.mail.fullMessage(msg.ID);
        const accept = app.mail.extractLink(full.HTML, 'Accept Invitation');
        fact('invitation email', {subject: full.Subject, accept: accept && accept.replace(/key=[^&]+/, 'key=…')});
        await signOut(page);
        await page.goto(accept.replace(/^https?:\/\/[^/]+/, app.baseURL));
        await idle(page);
        const acceptBtn = page.getByRole('button', {name: /^Accept And Continue to/});
        await acceptBtn.waitFor({timeout: T});
        fact('accept button', await acceptBtn.innerText());
        await acceptBtn.click();
        await page.getByRole('dialog').filter({hasText: /assigned a new role/}).waitFor({timeout: T});
        await snap('accepted');

        // Control: the manager.
        await signIn(page, 'rvaca', {contextPath: path});
        fact('rvaca side menu', await readNav());
        await pressInstitutions('rvaca');

        // Steps 1-2: jjanssen signs in, the side menu.
        await signIn(page, sm, {contextPath: path});
        await idle(page); await pause(400);
        fact(`${sm} landed`, rel(page.url()));
        const menu = await readNav();
        await snap(`${sm}-menu`);
        fact(`${sm} side menu`, menu);
        // Step 3: "Payments" › "Institutional Subscriptions" › "Create New Subscription".
        await institutionalWindow(sm);
        // Step 4: "Institutions".
        const pressed = await pressInstitutions(sm);
        if (!pressed.denied && pressed.addInstitution) {
            // The page opened (the fix in): add one, and the subscription window offers it.
            const name = await addInstitution(sm);
            const again = await institutionalWindow(`${sm}-after-add`);
            fact(`${sm} window offers the new institution`, again.institutionOptions.some((o) => o.includes(name)));
        }

        // Neighbour check: the Subscription Manager's other Settings addresses, and a Section editor at Institutions.
        await byAddress(sm, '/management/settings/website');
        await byAddress(sm, '/management/settings/announcements');
        await signIn(page, 'sberardo', {contextPath: path});
        await byAddress('sberardo', '/management/settings/institutions');
    } catch (err) {
        fact('ERROR', String(err.stack || err).slice(0, 1200));
        await snap('ERROR').catch(() => {});
        await shot(page, 'ERROR').catch(() => {});
        throw err;
    } finally {
        record('facts', facts);
        await close();
    }
});
