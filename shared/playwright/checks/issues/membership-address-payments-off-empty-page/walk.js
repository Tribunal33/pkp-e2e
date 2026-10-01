// Issue report walk: docs/issues/U52-A9-membership-address-payments-off-empty-page.md
// (spec U52 register A9, its "payments not set up" half), and step 15 of
// docs/issues/U51-A12-signed-out-purchase-subscription-server-error.md (A9's
// signed-out half, which has U51 A12's cause). OJS only: OMP and OPS have no
// membership address.
//
// Takes the reports' Steps through the screens on a dataset fleet (PKP's
// default test dataset, freshly reset), the step numbers the A9 report's:
//   signed out (U51-A12 step 15): the address, signed out;
//   1-2   as amwandenga, the address on the dataset's journal (payments off);
//   3-4   as rvaca, Settings › Distribution › "Payments" (Enable, USD, Manual
//         Fee Payment, instructions, Save), then "Payments" › "Payment Types" ›
//         "Association Membership" 20, Save;
//   5     as amwandenga, the address (the control: the payment page);
//   6     as rvaca, "Enable" unticked, Save;
//   7-8   as amwandenga, the address again, then "Send notification of payment"
//         (rvaca's mailbox counted before and after).
// Neighbours (for the fix): signed out with payments set up (U51 A12's cause,
// which the A9 fix leaves alone); payments on again with "Association
// Membership" emptied. Records every screen with screen(), each address's
// status, the new lines of the fleet's server log, and the queued payment
// requests the address writes (a read of queued_payments).
//
// Run from pkp-e2e (reset first, the walk changes the journal's settings):
//   npm run fleet-prep -- --feature issues-w44 --dataset 2 --reset
//   PROBE_FEATURE=issues-w44 PROBE_AGENT=w44 node bin/probe.js ojs shared/playwright/checks/issues/membership-address-payments-off-empty-page/walk.js
// On 3.5, PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-w44-3_5,
// PROBE_FEATURE=issues-w44-3_5 and PROBE_RUN=r35.
// The report's Observed is with PHP assertions off, as in production. Where
// the server's php.ini turns them on (Homebrew's development php.ini on the
// Mac), every signed-in step fails at OJSPaymentManager's assert(false)
// instead: stop the dataset fleet's server (node bin/probe-servers.js --stop
// --app ojs --dataset 2) and let fleet-prep start it again with
// PHP_INI_SCAN_DIR=":<dir holding an ini with zend.assertions = -1>" in front.
// Step 8 is taken only where step 7 offers "Send notification of payment"
// (it does not on main or 3.5; 3.4 and 3.3 were read in the code only).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 500) => (s == null ? s : String(s).replace(/[\s ]+/g, ' ').trim().slice(0, n));
const READER = 'amwandenga';
const MANAGER = 'rvaca';
const CONTACT = 'rvaca@mailinator.com';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no membership address on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {PaymentSettingsTab, JournalPaymentsPage, PAYMENTS_TEXT: TEXT} = require('../../../pages/PaymentsPages.js');
    const ctx = `/index.php/${app.contextPath}/en`;
    const address = `${ctx}/user/payMembership`;
    const facts = {line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    const logDir = path.resolve(__dirname, '../../../../../apps/ojs/playwright/.server-logs');
    const logFile = path.join(logDir, `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).subarray(from).toString('utf8').split('\n')
                .filter((l) => /Fatal|Uncaught|Error|Invalid payment type|\[500\]/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    const queued = () => { try { return Number(sql(app, 'SELECT count(*) FROM queued_payments')); } catch (e) { return `sql failed: ${e.message.slice(0, 120)}`; } };
    const mailCount = () => app.mail.count({to: CONTACT, subject: TEXT.manualNotificationSubject});

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const settings = new PaymentSettingsTab(page, app.contextPath);

    /** Open the membership address as a person types it: status, where it lands, what it shows, the log, the queued requests. */
    async function open(name) {
        const from = logSize();
        const q0 = queued();
        const resp = await page.goto(app.url(address)).catch((e) => ({err: e.message}));
        await idle(page).catch(() => {});
        await pause(400);
        const out = {
            status: resp && resp.status ? resp.status() : resp,
            landed: page.url().replace(app.baseURL, ''),
            title: await page.title().catch(() => null),
            h1: flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null)),
            main: flat(await page.locator('.pkp_structure_main, main').first().innerText({timeout: 2000}).catch(() => ''), 400),
            bodyChars: (await page.locator('body').innerText({timeout: 2000}).catch(() => '')).trim().length,
            loginForm: await page.locator('form#login').count(),
            notifyLink: await page.getByRole('link', {name: TEXT.sendNotification, exact: true}).count(),
        };
        await pause(300);
        out.log = logSince(from);
        out.queuedBefore = q0;
        out.queuedAfter = queued();
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }

    async function paymentsEnable(on) {
        await settings.goto();
        if (on) await settings.enableBox().check(); else await settings.enableBox().uncheck();
        await settings.save();
    }

    try {
        // ------------------------------------------------ signed out (U51-A12 step 15)
        await open('signed-out-dataset');

        // ------------------------------------------------ 1-2: payments never set up
        await signIn(page, READER);                                                        // 1
        await open('step2-payments-not-set-up');                                           // 2

        // ------------------------------------------------ 3-4: the manager sets payments up with a membership fee
        await signIn(page, MANAGER);                                                       // 3
        await settings.goto();
        await settings.enableBox().check();
        await settings.currencySelect().selectOption('USD');
        await settings.pluginSelect().selectOption('ManualPayment');
        await settings.instructionsBox().waitFor({timeout: T});
        await settings.instructionsBox().fill('Pay by bank transfer.');
        await settings.save();
        await snap('step3-payments-saved');
        const pp = new JournalPaymentsPage(page, app.contextPath);                         // 4
        await page.reload(); await idle(page);
        const menuPayments = page.getByRole('navigation').getByRole('link', {name: 'Payments', exact: true}).first();
        const viaMenu = await menuPayments.isVisible().catch(() => false);
        if (viaMenu) { await menuPayments.click(); await page.waitForLoadState('load'); await idle(page); } else await pp.goto();
        fact('step4-payments-via-side-menu', viaMenu);
        const types = await pp.showPaymentTypes();
        await types.type(TEXT.membership, '20');
        await types.form().getByRole('button', {name: 'Save', exact: true}).click();
        await types.savedNotice().first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        await snap('step4-membership-fee-saved');

        // ------------------------------------------------ 5: the control (and neighbour): payments set up, fee 20
        await signIn(page, READER);
        await open('step5-payments-set-up');

        // ------------------------------------------------ neighbour: signed out with payments set up (U51 A12's cause)
        await signOut(page);
        await open('neighbour-signed-out-payments-set-up');

        // ------------------------------------------------ 6-8: payments switched off
        await signIn(page, MANAGER);
        await paymentsEnable(false);                                                       // 6
        await snap('step6-enable-unticked');
        await signIn(page, READER);
        const s7 = await open('step7-payments-switched-off');                              // 7
        if (s7.notifyLink) {
            const before = await mailCount();
            await page.getByRole('link', {name: TEXT.sendNotification, exact: true}).click();   // 8
            await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
            let after = before;
            for (let i = 0; i < 20 && after === before; i++) { await pause(500); after = await mailCount(); }
            const out = {
                h1: flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null)),
                main: flat(await page.locator('.pkp_structure_main, main').first().innerText({timeout: 2000}).catch(() => ''), 300),
                links: (await page.locator('.pkp_structure_main a, main a').allInnerTexts().catch(() => [])).map((x) => flat(x)).filter(Boolean),
                mailsBefore: before,
                mailsAfter: after,
            };
            await snap('step8-notification', {walk: out});
            fact('step8-notification', out);
        } else {
            fact('step8-notification', 'no "Send notification of payment" link on the page');
        }

        // ------------------------------------------------ neighbour: payments on again, no membership fee
        await signIn(page, MANAGER);
        await paymentsEnable(true);
        await page.goto(app.url(`${ctx}/payments`)); await idle(page);
        const types2 = await pp.showPaymentTypes();
        await types2.type(TEXT.membership, '');
        await types2.form().getByRole('button', {name: 'Save', exact: true}).click();
        await types2.savedNotice().first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        await snap('neighbour-fee-emptied');
        await signIn(page, READER);
        await open('neighbour-no-membership-fee');
    } finally {
        record('facts', facts);
        await close();
    }
});
