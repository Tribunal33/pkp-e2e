// Control for docs/issues/U51-A16-subscription-manager-institutions-refused.md
// (spec U51 register A16): what the Subscription Manager can still do
// without the Institutions page. On PKP's default test dataset (a dataset
// fleet), OJS only, through the screens:
//   the same preconditions as walk.js (rvaca enables payments; jjanssen is
//      invited to "Subscription Manager" and accepts from the email)
//   rvaca: "Payments" › "Subscription Types", one individual type and one
//      institutional type; Institutions › "Add Institution" "Campus Library <tag>"
//   jjanssen: "Payments" › "Individual Subscriptions" › "Create New
//      Subscription" for amwandenga; "Institutional Subscriptions" › "Create
//      New Subscription" for "Campus Library <tag>" (contact amwandenga,
//      domain library.example.edu); both lists read back
// Records every screen with screen().
//
// Reset first:  npm run fleet-prep -- --feature issues-w5 --dataset 5 --reset
// Run:          PROBE_RUN=control PROBE_FEATURE=issues-w5 PROBE_AGENT=w5 node bin/probe.js ojs shared/playwright/checks/issues/subscription-manager-institutions-refused/control.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag, drainJobs, sql} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
const nextYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(d); };

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no Subscription Manager on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('control.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const t = tag('u51w5');
    const path = app.contextPath;
    const sm = 'jjanssen';
    const cu = (p) => app.url(`/index.php/${path}/en${p}`);
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); return s; }
    const flat = (x) => x.replace(/\s+/g, ' ').trim().slice(0, 200);
    const reader = sql(app, "SELECT user_id FROM users WHERE username = 'amwandenga'");
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
        // rvaca: two subscription types and one institution.
        await signIn(page, 'rvaca', {contextPath: path});
        const payments = new PaymentsPage(page, path);
        await payments.goto();
        for (const [name, kind] of [[`Online ${t}`, 'Individual (users are validated via login)'], [`Campus ${t}`, 'Institutional (users are validated via domain or IP address)']]) {
            await payments.showTab('Subscription Types');
            const type = await payments.openCreateType();
            await type.fill({name, currency: 'USD', cost: '40', format: 'Online', duration: '12'});
            await type.kindRadio(kind).check();
            fact(`type ${kind} saved`, (await type.saveAccepted()).status());
        }
        await page.goto(cu('/management/settings/institutions'));
        await idle(page);
        const inst = `Campus Library ${t}`;
        await page.getByRole('button', {name: 'Add Institution', exact: true}).click();
        const add = page.getByRole('dialog').filter({hasText: 'Add Institution'});
        await add.getByRole('button', {name: 'Save'}).waitFor({timeout: T});
        await idle(page);
        await add.getByLabel('Name', {exact: false}).first().fill(inst);
        const w = page.waitForResponse((x) => /api\/v1\/institutions/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await add.getByRole('button', {name: 'Save'}).click();
        const ri = await w;
        fact('rvaca institution saved', ri ? ri.status() : null);
        await idle(page); await pause(500);
        await snap('rvaca-institution-added');

        // jjanssen, the Subscription Manager: one subscription of each kind.
        await signIn(page, sm, {contextPath: path});
        await payments.goto();
        const win1 = await payments.openCreateSubscription('Individual Subscriptions');
        await win1.chooseUser('amwandenga', reader);
        await win1.chooseType(`Online ${t}`);
        await win1.chooseStatus('Active');
        await win1.typeDate('dateStart', today());
        await win1.typeDate('dateEnd', nextYear());
        fact(`${sm} individual subscription saved`, (await win1.saveAccepted()).status());
        await payments.showTab('Institutional Subscriptions');
        const win2 = await payments.openCreateSubscription('Institutional Subscriptions');
        fact(`${sm} institution choices`, await win2.institutionSelect().locator('option').allInnerTexts());
        await win2.chooseUser('amwandenga', reader);
        await win2.chooseType(`Campus ${t}`);
        await win2.chooseStatus('Active');
        await win2.typeDate('dateStart', today());
        await win2.typeDate('dateEnd', nextYear());
        await win2.chooseInstitution(inst);
        await win2.domainBox().fill('library.example.edu');
        await snap(`${sm}-institutional-filled`);
        fact(`${sm} institutional subscription saved`, (await win2.saveAccepted()).status());
        await payments.gotoTab('Individual Subscriptions');
        fact('individual rows', (await payments.rows('Individual Subscriptions').allInnerTexts()).map(flat));
        await payments.showTab('Institutional Subscriptions');
        await idle(page);
        fact('institutional rows', (await payments.rows('Institutional Subscriptions').allInnerTexts()).map(flat));
        await snap(`${sm}-institutional-listed`);
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
