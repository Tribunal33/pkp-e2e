// Issue report walk: docs/issues/U51-A12-signed-out-purchase-subscription-server-error.md
// (spec U51 register A12). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// the journal manager `rvaca` makes `publicknowledge` require subscriptions,
// take manual payments (Settings › Distribution) and offer one individual
// subscription type (Payments › Subscription Types); then, signed out, the
// two purchase addresses are opened (steps 10-11); the reader `amwandenga`
// opens them signed in (the control); and steps 12-14 end the session on
// the form. Step numbers are the report's. The kit builds nothing. Records
// every screen with screen(), the status of each page request, and the new
// lines of the fleet's server log after each request.
//
// Where step 10 fails, it also takes the report's way round: "Login" on the
// home page, the address again, the "Subscriptions" page and "Purchase New
// Subscription". Where step 10 leads to Login (the fix in), it signs in
// there; after step 14's Login it signs in and presses "Save" once more.
// Neighbours (for the fix): signed out, "My Subscriptions" and the
// "Subscriptions" page, which must behave as before the fix.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes
// the journal's settings:
//   npm run fleet-prep -- --feature issues-w2 --dataset 2 --reset
//   PROBE_FEATURE=issues-w2 PROBE_AGENT=w2 node bin/probe.js ojs shared/playwright/checks/issues/signed-out-purchase-subscription-server-error/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w2-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w2-3_5 PROBE_AGENT=w2 node bin/probe.js ojs shared/playwright/checks/issues/signed-out-purchase-subscription-server-error/walk.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no subscriptions on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const ctx = `/index.php/${app.contextPath}/en`;
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            const buf = fs.readFileSync(logFile);
            return buf.slice(from).toString('utf8').split('\n').filter((l) => /\b(500|Fatal|Uncaught|Error)\b/.test(l)).map((l) => l.slice(0, 400)).slice(0, 6);
        } catch { return []; }
    };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    /** Open an address as a person types it; the page's status, where it lands, its title and heading, and the server log. */
    async function open(name, pathname) {
        const from = logSize();
        const resp = await page.goto(app.url(pathname)).catch((e) => ({err: e.message}));
        await idle(page).catch(() => {});
        await pause(400);
        const out = {
            asked: pathname,
            status: resp && resp.status ? resp.status() : resp,
            landed: page.url().replace(app.baseURL, ''),
            title: await page.title().catch(() => null),
            h1: await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null),
            bodyChars: (await page.locator('body').innerText({timeout: 2000}).catch(() => '')).trim().length,
            loginForm: await page.locator('form#login').count(),
        };
        await pause(300);
        out.log = logSince(from);
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }
    const individual = `${ctx}/user/purchaseSubscription/individual`;
    const institutional = `${ctx}/user/purchaseSubscription/institutional`;
    try {
        // ---------------------------------------------------------------- steps 1-6: the manager sets the journal up
        await signIn(page, 'rvaca', {contextPath: app.contextPath});                                     // 1
        await page.goto(app.url(`${ctx}/management/settings/distribution`));                              // 2
        await idle(page);
        await page.locator('#access-button').click();
        await idle(page); await pause(500);
        const access = page.locator('#access');
        await access.getByText(SUB_MODE, {exact: true}).click();                                          // 3
        let rs = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await access.getByRole('button', {name: 'Save', exact: true}).first().click();
        let r = await rs; await idle(page); await pause(500);
        fact('step3-access-save', r ? r.status() : null);
        await snap('access-saved');
        await page.locator('#payments-button').click();                                                   // 4
        await idle(page); await pause(500);
        const pay = page.locator('#payments');
        await pay.locator('input[name="paymentsEnabled"]').first().check();                               // 4
        await pause(300);
        await pay.locator('select[name="currency"]').first().selectOption({label: 'US Dollar'});
        await pay.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'});
        await pause(400);
        await pay.locator('textarea[name^="manualInstructions"], input[name^="manualInstructions"]').first().fill('Pay by bank transfer.'); // 5
        rs = page.waitForResponse((x) => /\/_payments/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await pay.getByRole('button', {name: 'Save', exact: true}).first().click();                        // 6
        r = await rs; await idle(page); await pause(500);
        fact('step6-payments-save', r ? r.status() : null);
        await snap('payments-saved');

        // ---------------------------------------------------------------- steps 7-8: one individual subscription type
        const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
        const payments = new PaymentsPage(page, app.contextPath);
        await page.reload(); await idle(page);                                                            // 7: "Payments" in the side menu
        const menuPayments = page.getByRole('navigation').getByRole('link', {name: 'Payments', exact: true}).first();
        const viaMenu = await menuPayments.isVisible().catch(() => false);
        if (viaMenu) { await menuPayments.click(); await page.waitForLoadState('load'); await idle(page); } else await payments.goto();
        fact('step7-payments-via-side-menu', viaMenu);
        await payments.showTab('Subscription Types');
        const type = await payments.openCreateType();
        await type.fill({name: 'Online', currency: 'USD', cost: '40', format: 'Online', duration: '12'});  // 8
        await type.kindRadio('Individual (users are validated via login)').check();
        fact('step8-currency-label', await type.currencySelect().locator('option:checked').innerText().catch(() => null));
        await snap('type-filled');
        fact('step8-type-save', (await type.saveAccepted()).status());
        await snap('type-saved');
        await signOut(page);                                                                              // 9

        /** Sign in on the Login page the browser is on; where it lands, and the purchase form's state. */
        const formState = async () => ({
            landed: page.url().replace(app.baseURL, ''),
            title: await page.title().catch(() => null),
            h1: await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null),
            typeOptions: await page.locator('select#typeId option').allInnerTexts().catch(() => []),
            errors: await page.locator('#formErrors, .pkp_form_error, .error, [id$="-error"]').allInnerTexts().then((a) => a.map((x) => x.trim()).filter(Boolean)).catch(() => []),
            main: (await page.locator('.page, main, #pkp_content_main').first().innerText({timeout: 2000}).catch(() => '')).replace(/\s+/g, ' ').slice(0, 600),
        });
        async function loginHere(name) {
            await page.locator('input#username').fill('amwandenga');
            await page.locator('input#password').fill('amwandengaamwandenga');
            await page.locator('form#login button[type="submit"]').click();
            await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
            const st = await formState();
            fact(name, st);
            await snap(name, {walk: st});
            return st;
        }

        // ---------------------------------------------------------------- steps 10-11: signed out, the two addresses
        const s10 = await open('step10-signed-out-individual', individual);
        if (s10.loginForm) {
            // Expected (with the fix): the Login page; signing in there leads on to the purchase page.
            await loginHere('step10-after-login');
            await signOut(page);
        } else {
            // The way round: "Login" at the top of the journal's pages, then the address again, and the "Subscriptions" page.
            await page.goto(app.url(`${ctx}/index`)); await idle(page);
            await page.getByRole('link', {name: 'Login', exact: true}).first().click();
            await page.waitForLoadState('load'); await idle(page);
            await loginHere('wayround-signed-in-from-home');
            await open('wayround-address-again', individual);
            fact('wayround-address-again-form', await formState());
            await open('wayround-subscriptions-page', `${ctx}/about/subscriptions`);
            const buy = page.getByRole('link', {name: 'Purchase New Subscription', exact: true});
            fact('wayround-purchase-links', await buy.count());
            if (await buy.count()) {
                await buy.first().click(); await page.waitForLoadState('load'); await idle(page);
                const st = await formState();
                fact('wayround-purchase-new-subscription', st);
                await snap('wayround-purchase-new-subscription', {walk: st});
            }
            await signOut(page);
        }
        const s11 = await open('step11-signed-out-institutional', institutional);
        if (s11.loginForm) {
            await loginHere('step11-after-login');
            await signOut(page);
        }

        // ---------------------------------------------------------------- the control, signed in
        await signIn(page, 'amwandenga', {contextPath: app.contextPath});
        await open('control-signed-in-individual', individual);
        await open('control-signed-in-institutional', institutional);

        // ---------------------------------------------------------------- steps 12-14: the session ends while the form is open, then "Save"
        await open('step12-form-open', individual);                                                      // 12
        fact('step12-form', await formState());
        const other = await page.context().newPage();
        await signOut(other).catch(() => {});                                                             // 13: the reader logs out in another tab
        await other.close();
        const from = logSize();
        const post = page.waitForResponse((x) => /payPurchaseSubscription/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await page.getByRole('button', {name: 'Save', exact: true}).first().click();                           // 14: "Save" on this page
        const pr = await post;
        await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
        await pause(400);
        const cont = {status: pr ? pr.status() : null, landed: page.url().replace(app.baseURL, ''), h1: await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null),
            bodyChars: (await page.locator('body').innerText({timeout: 2000}).catch(() => '')).trim().length, loginForm: await page.locator('form#login').count(), log: logSince(from)};
        await snap('step14-save-after-session-ended', {walk: cont});
        fact('step14-save-after-session-ended', cont);
        if (cont.loginForm) {
            // With the fix: sign in on that Login page and read what the reader lands on.
            const f2 = logSize();
            const st = await loginHere('step14-after-login');
            fact('step14-after-login-log', logSince(f2));
            if (st.typeOptions.length) {
                // and "Save" once more from there
                const p2 = page.waitForResponse((x) => /payPurchaseSubscription/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
                await page.getByRole('button', {name: 'Save', exact: true}).first().click();
                const r2 = await p2; await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
                const st2 = {status: r2 ? r2.status() : null, ...(await formState())};
                fact('step14-after-login-save-again', st2);
                await snap('step14-after-login-save-again', {walk: st2});
            }
        }

        // ---------------------------------------------------------------- neighbours: must stay as they were
        await signOut(page).catch(() => {});
        await open('neighbour-signed-out-my-subscriptions', `${ctx}/user/subscriptions`);
        await open('neighbour-signed-out-about-subscriptions', `${ctx}/about/subscriptions`);
    } finally {
        record('facts', facts);
        await close();
    }
});
