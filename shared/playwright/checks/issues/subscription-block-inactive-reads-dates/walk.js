// Issue report walk: docs/issues/U51-A13-A26-subscription-block-inactive-reads-dates.md
// (spec U51 register A13, A26). Takes the report's Steps through the screens
// on a dataset fleet (PKP's default test dataset, harness.md "Dataset
// fleets"), OJS only (OMP and OPS have no subscriptions):
//   steps 1-9   the journal manager `rvaca` makes `publicknowledge` require
//               subscriptions, take manual payments, show the "Subscription"
//               block in the sidebar, and offer the individual type
//               "Online Year u51w4";
//   steps 10-14 the reader `amwandenga` buys it with the manual method, then
//               reads the block on the home page and on "My Subscriptions";
//   steps 15-19 the manager sets that subscription to "Needs Approval",
//               "Needs Information" and "Other, See Notes" in turn (end date
//               a year on), and the reader reads the block and the table
//               after each;
//   control     the same with "Active" (the fix's neighbour: the block must
//               still read "Expires: {date}").
// Step numbers are the report's. The kit builds nothing. Every screen is
// recorded with screen(); the block's lines, the table's status, the stored
// row and the fleet's server-log errors go into the facts.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes
// the journal's settings:
//   npm run fleet-prep -- --feature issues-w4 --dataset 4 --reset
//   PROBE_FEATURE=issues-w4 PROBE_AGENT=w4 node bin/probe.js ojs shared/playwright/checks/issues/subscription-block-inactive-reads-dates/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w4-3_5 --dataset 4 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w4-3_5 PROBE_AGENT=w4 node bin/probe.js ojs shared/playwright/checks/issues/subscription-block-inactive-reads-dates/walk.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const TAG = 'u51w4';
const TYPE = `Online Year ${TAG}`;
const READER = 'amwandenga';
const MANAGER = 'rvaca';
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const STATUSES = ['Needs Approval', 'Needs Information', 'Other, See Notes'];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const iso = (d) => d.toISOString().slice(0, 10);
const now = new Date();
const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const nextYear = new Date(today);
nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no subscriptions on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {AccessSettings, PaymentsPage, MySubscriptionsPage, PurchasePage, SubscriptionBlock} = require('../../../pages/SubscriptionsPages.js');
    const {SidebarSetup} = require('../../../pages/CustomContentPages.js');
    const cp = app.contextPath;
    const ctx = `/index.php/${cp}/en`;
    const facts = {line: app.line || 'main', today: iso(today), nextYear: iso(nextYear)};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    const stored = () => sql(app, `SELECT s.subscription_id, s.status, s.date_start, s.date_end FROM subscriptions s JOIN users u ON u.user_id = s.user_id WHERE u.username = '${READER}' ORDER BY s.subscription_id`).split('\n').filter(Boolean);

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const here = () => page.url().replace(app.baseURL, '');
    const block = new SubscriptionBlock(page);
    const my = new MySubscriptionsPage(page, cp);
    const blockLines = async () => (await block.root().count()) ? (await block.lines().allInnerTexts()).map((t) => flat(t)) : null;

    /** The home page's "Subscription" block. */
    async function readHome(name) {
        const from = logSize();
        const resp = await page.goto(app.url(`${ctx}/index`));
        await idle(page);
        const out = {status: resp ? resp.status() : null, landed: here(), block: await blockLines()};
        out.log = logSince(from);
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }
    /** "My Subscriptions": the individual table's row and the block. */
    async function readMine(name) {
        const from = logSize();
        const resp = await my.goto();
        await idle(page);
        const rows = my.rows(my.individualPart());
        const table = [];
        for (let i = 0; i < await rows.count(); i++) table.push(await my.rowCells(rows.nth(i)));
        const out = {status: resp ? resp.status() : null, landed: here(), table, block: await blockLines()};
        out.log = logSince(from);
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }
    /** The manager sets the reader's subscription's "Status" (and "End date" a year on). */
    async function setStatus(name, status) {
        await signOut(page);
        await signIn(page, MANAGER, {contextPath: cp});
        const payments = new PaymentsPage(page, cp);
        await payments.gotoTab('Individual Subscriptions');
        const sw = await payments.openEditSubscription('Individual Subscriptions', 'Mwandenga');
        await sw.chooseStatus(status);
        await sw.typeDate('dateEnd', iso(nextYear));
        const from = logSize();
        const r = await sw.saveAccepted();
        await payments.gotoTab('Individual Subscriptions');
        const row = await payments.rows('Individual Subscriptions').allInnerTexts().then((a) => a.map((t) => flat(t, 300)));
        const out = {save: r.status(), row, stored: stored(), log: logSince(from)};
        await snap(name, {walk: out});
        fact(name, out);
        await signOut(page);
        await signIn(page, READER, {contextPath: cp});
    }

    try {
        // ------------------------------------------------------------ steps 1-9: the manager sets the journal up
        await signIn(page, MANAGER, {contextPath: cp});                                                   // 1
        const access = new AccessSettings(page, cp);                                                       // 2
        await access.goto();
        await access.modeRadio(SUB_MODE).check();
        fact('step2-access-save', (await access.save()).status());
        await page.locator('#payments-button').click();                                                    // 3-4
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
        const r3 = await rs; await idle(page); await pause(500);
        fact('step4-payments-save', r3 ? r3.status() : null);
        await snap('step4-payments-saved');

        const sidebar = new SidebarSetup(page, cp);                                                        // 5
        await sidebar.goto();
        fact('step5-sidebar-labels', flat(await sidebar.form.locator('fieldset').filter({has: page.locator('input[name="sidebar"]')}).innerText().catch(() => null), 600));
        fact('step5-sidebar-save', await sidebar.place('subscriptionblockplugin', true));
        await snap('step5-sidebar-saved');

        const payments = new PaymentsPage(page, cp);                                                       // 6-8
        await payments.gotoTab('Subscription Types');
        const type = await payments.openCreateType();
        await type.fill({name: TYPE, currency: 'USD', cost: '40', format: 'Online', duration: '12'});
        await type.kindRadio('Individual (users are validated via login)').check();
        fact('step8-type-save', (await type.saveAccepted()).status());
        await snap('step8-type-saved');
        await signOut(page);                                                                               // 9

        // ------------------------------------------------------------ steps 10-14: the reader buys it (manual payment)
        await signIn(page, READER, {contextPath: cp});                                                     // 10
        await readHome('step10-home-before');
        await my.goto(); await idle(page);                                                                 // 11
        await my.purchaseLink(my.individualPart()).first().click();
        await page.waitForLoadState('load'); await idle(page);
        const purchase = new PurchasePage(page, cp);
        const options = await purchase.typeOptions();
        fact('step12-type-options', options);
        const label = options.find((o) => o.startsWith(TYPE));
        await purchase.typeSelect().selectOption({label});                                                 // 12
        const from9 = logSize();
        await purchase.submit();
        await idle(page);
        const s9 = {landed: here(), title: await page.title(), h1: flat(await page.locator('.pkp_structure_main h1').first().innerText({timeout: 3000}).catch(() => null)), stored: stored(), log: logSince(from9)};
        await snap('step12-after-save', {walk: s9});
        fact('step12-after-save', s9);
        await readHome('step13-home-awaiting');                                                            // 13
        await readMine('step14-my-subscriptions-awaiting');                                                // 14

        // ------------------------------------------------------------ steps 15-19: the manager sets an inactive status
        for (const status of STATUSES) {
            const key = status.split(',')[0].toLowerCase().replace(/\s+/g, '-');
            await setStatus(`step16-set-${key}`, status);                                                  // 15-16
            await readHome(`step17-home-${key}`);                                                          // 17
            await readMine(`step18-my-subscriptions-${key}`);                                              // 18
        }

        // ------------------------------------------------------------ control (the fix's neighbour): "Active"
        await setStatus('control-set-active', 'Active');
        await readHome('control-home-active');
        await readMine('control-my-subscriptions-active');
    } finally {
        record('facts', facts);
        await close();
    }
});
