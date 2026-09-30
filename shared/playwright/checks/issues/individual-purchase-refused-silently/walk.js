// Issue report walk, on a dataset fleet (PKP's default test dataset,
// harness.md "Dataset fleets"), OJS only (OMP and OPS have no subscriptions):
//   docs/issues/U51-A9-individual-purchase-refused-silently.md (spec U51 register A9)
//
// Steps 1-10 of the report, as written there:
//   1-5   the manager `rvaca` makes `publicknowledge` require subscriptions and
//         take manual payments, and creates the individual type
//         "Member Year u51w11" that asks for membership;
//   6-9   the reader `ccorino` opens "Purchase Individual Subscription", chooses
//         that type, leaves "Membership" empty, presses "Save", then reopens
//         "My Subscriptions";
//   10    the control: the same with "Membership" "ACME".
// The neighbour checks for the fix ride along: the page as first opened (step 7)
// must show no error list, and the accepted purchase (step 10) must still lead
// to the payment page.
// The kit builds nothing. Every screen is recorded with screen(); each page
// request's status and the new lines of the fleet's server log go into the facts.
//
// PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/individual-purchase-refused-silently/walk.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const TAG = 'u51w11';
const TYPE = `Member Year ${TAG}`;
const READER = 'ccorino';
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] no subscriptions on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {AccessSettings, PaymentsPage, MySubscriptionsPage, PurchasePage} = require('../../../pages/SubscriptionsPages.js');
    const cp = app.contextPath;
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    const stored = (step) => fact(`${step}-stored`, sql(app, `SELECT s.subscription_id, s.status, s.membership, s.date_start, s.date_end FROM subscriptions s JOIN users u ON u.user_id = s.user_id WHERE u.username = '${READER}' ORDER BY s.subscription_id`).split('\n').filter(Boolean));

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const here = () => page.url().replace(app.baseURL, '');
    const my = new MySubscriptionsPage(page, cp);
    const purchase = new PurchasePage(page, cp);

    /** The purchase page as the reader sees it: title, boxes, any error list or marked box. */
    async function readPurchase() {
        const onForm = await purchase.form().count();
        return {
            landed: here(),
            title: await page.title(),
            h1: flat(await page.locator('.pkp_structure_main h1').first().innerText({timeout: 1500}).catch(() => null)),
            form: !!onForm,
            selectedType: onForm ? flat(await purchase.selectedType().innerText().catch(() => null)) : null,
            typeOptions: onForm ? await purchase.typeOptions().catch(() => null) : null,
            membership: onForm ? await purchase.membershipBox().inputValue().catch(() => null) : null,
            errorList: await purchase.errors().count() ? flat(await purchase.errors().innerText()) : null,
            markedBoxes: await page.locator('.pkp_structure_main .error, .pkp_structure_main [aria-invalid="true"]').count(),
            mainText: flat(await page.locator('.pkp_structure_main').innerText().catch(() => ''), 800),
        };
    }
    /** Press a button that posts the page; the answer's status, the landing and the server log. */
    async function press(locator) {
        const from = logSize();
        const nav = page.waitForNavigation({waitUntil: 'load', timeout: T}).catch(() => null);
        await locator.click();
        const resp = await nav;
        await idle(page).catch(() => {});
        await pause(300);
        return {status: resp ? resp.status() : null, log: logSince(from)};
    }
    async function readMine(name) {
        await my.goto();
        await idle(page);
        const rows = my.rows(my.individualPart());
        const out = {landed: here(), rows: [], purchaseNew: await my.purchaseLink(my.individualPart()).count()};
        for (let i = 0; i < await rows.count(); i++) out.rows.push(await my.rowCells(rows.nth(i)));
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }

    try {
        // ------------------------------------------------------------ steps 1-5: the manager
        await signIn(page, 'rvaca', {contextPath: cp});                                                   // 1
        const access = new AccessSettings(page, cp);                                                       // 2
        await access.goto();
        await access.modeRadio(SUB_MODE).check();
        fact('step2-access-save', (await access.save()).status());
        await page.locator('#payments-button').click();                                                    // 3
        await idle(page); await pause(500);
        const pay = page.locator('#payments');
        await pay.locator('input[name="paymentsEnabled"]').first().check();
        await pause(300);
        await pay.locator('select[name="currency"]').first().selectOption({label: 'US Dollar'});
        await pay.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'});
        await pause(400);
        await pay.locator('textarea[name^="manualInstructions"], input[name^="manualInstructions"]').first().fill('Pay by bank transfer.');
        const rs = page.waitForResponse((x) => /\/_payments/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await pay.getByRole('button', {name: 'Save', exact: true}).first().click();
        const r = await rs; await idle(page); await pause(500);
        fact('step3-payments-save', r ? r.status() : null);
        await snap('setup-payments-saved');

        const payments = new PaymentsPage(page, cp);                                                        // 4
        await payments.gotoTab('Subscription Types');
        const type = await payments.openCreateType();
        await type.fill({name: TYPE, currency: 'USD', cost: '7', format: 'Online', duration: '12'});
        await type.kindRadio('Individual (users are validated via login)').check();
        await type.membershipBox().check();
        fact('step4-type-save', (await type.saveAccepted()).status());
        await payments.gotoTab('Subscription Types');
        fact('step4-type-rows', (await payments.rows('Subscription Types').allInnerTexts()).map((t) => flat(t, 300)));
        fact('step4-type-stored', sql(app, `SELECT type_id, membership, institutional, disable_public_display, cost, currency_code_alpha FROM subscription_types ORDER BY type_id`).split('\n').filter(Boolean));
        await snap('setup-type');
        await signOut(page);                                                                               // 5

        // ------------------------------------------------------------ steps 6-9: the reader
        await signIn(page, READER, {contextPath: cp});                                                     // 6
        await readMine('step6-my-subscriptions');
        const s7 = await press(my.purchaseLink(my.individualPart()));                                      // 7
        Object.assign(s7, await readPurchase());
        await snap('step7-purchase-page', {walk: s7});
        fact('step7-purchase-page', s7);
        fact('neighbour-fresh-page-error-list', s7.errorList);

        await purchase.typeSelect().selectOption({label: `${TYPE} (7.00 USD)`});                           // 8
        await purchase.membershipBox().fill('');
        const s8 = await press(purchase.submitButton());
        Object.assign(s8, await readPurchase());
        await snap('step8-save-empty-membership', {walk: s8});
        fact('step8-save-empty-membership', s8);
        stored('step8');

        await readMine('step9-my-subscriptions');                                                          // 9

        // ------------------------------------------------------------ step 10: the control (and the fix's neighbour)
        await press(my.purchaseLink(my.individualPart()));                                                 // 10
        await purchase.typeSelect().selectOption({label: `${TYPE} (7.00 USD)`});
        await purchase.membershipBox().fill('ACME');
        const s10 = await press(purchase.submitButton());
        s10.landed = here();
        s10.h1 = flat(await page.locator('.pkp_structure_main h1').first().innerText({timeout: 3000}).catch(() => null));
        s10.mainText = flat(await page.locator('.pkp_structure_main').innerText().catch(() => ''), 800);
        s10.errorList = await purchase.errors().count();
        await snap('step10-save-with-membership', {walk: s10});
        fact('step10-save-with-membership', s10);
        stored('step10');
        await readMine('step10-my-subscriptions');
    } catch (e) {
        fact('error', String(e && e.stack || e).slice(0, 1500));
        await snap('error').catch(() => {});
        throw e;
    } finally {
        record('facts', facts);
        await close();
    }
});
