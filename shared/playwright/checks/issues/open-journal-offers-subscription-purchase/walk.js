// Issue report walk: docs/issues/U51-A23-open-journal-offers-subscription-purchase.md
// (spec U51 register A23). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions):
//   steps 1-3   the journal manager `rvaca` sets payments up (manual method)
//               and adds an individual type; the journal stays open access,
//               as the dataset has it;
//   steps 4-6   the reader `amwandenga` opens the "Subscriptions" page by its
//               address and presses "Purchase New Subscription";
//   steps 7-8   the same with the journal set to not published online;
//   step 9      signed out: the "Subscriptions" page;
//   steps 10-11 control, which must not change with the fix: the journal set
//               to require subscriptions; the page's "Purchase New
//               Subscription" opens the purchase page.
// Step numbers are the report's. The kit builds nothing. Every screen is
// recorded with screen(); where each press lands, the page's notices and the
// fleet's server-log errors go into the facts.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes
// the journal's settings:
//   npm run fleet-prep -- --feature issues-w9 --dataset 9 --reset
//   PROBE_FEATURE=issues-w9 PROBE_AGENT=w9 node bin/probe.js ojs shared/playwright/checks/issues/open-journal-offers-subscription-purchase/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w9-3_5 --dataset 9 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w9-3_5 PROBE_AGENT=w9 node bin/probe.js ojs shared/playwright/checks/issues/open-journal-offers-subscription-purchase/walk.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const TAG = 'u51w9';
const TYPES = [
    {name: `Online Year ${TAG}`, cost: '40', kind: 'Individual (users are validated via login)'},
    {name: `Campus Year ${TAG}`, cost: '400', kind: 'Institutional (users are validated via domain or IP address)'},
];
const READER = 'amwandenga';
const MANAGER = 'rvaca';
const MODE = {
    subscription: 'The journal will require subscriptions to access some or all of its contents.',
    open: 'The journal will provide open access to its contents.',
    none: "OJS will not be used to publish the journal's contents online.",
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no subscriptions on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {AccessSettings, PaymentsPage, SubscriptionsReader} = require('../../../pages/SubscriptionsPages.js');
    const cp = app.contextPath;
    const ctx = `/index.php/${cp}/en`;
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

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const here = () => page.url().replace(app.baseURL, '');
    const offer = new SubscriptionsReader(page, cp);
    const isHome = () => /\/index\.php\/[^/]+(\/en)?(\/index)?\/?$/.test(new URL(page.url()).pathname);
    /** What the landed page is: address, title, heading, notices, the block, the server log. */
    async function landedOn(name, from, extra = {}) {
        await idle(page).catch(() => {});
        await pause(300);
        const s = await snap(name, extra);
        const out = {
            landed: here(),
            home: isHome(),
            title: await page.title(),
            h1: flat(await page.locator('.pkp_structure_main h1').first().innerText({timeout: 2000}).catch(() => null), 200),
            notices: s.notices || [],
            alerts: (await page.locator('.pkp_structure_main .cmp_notification, .pkp_structure_main [role="alert"], .pkp_notification').allInnerTexts().catch(() => [])).map((t) => flat(t, 300)),
            log: logSince(from),
            ...extra,
        };
        fact(name, out);
        return out;
    }
    /** Press a link if the page offers it, and record where it lands. */
    async function press(name, link) {
        const offered = await link.count();
        if (!offered) { fact(name, {offered: 0}); await snap(`${name}-not-offered`); return null; }
        const from = logSize();
        await Promise.all([page.waitForNavigation({waitUntil: 'load', timeout: T}).catch(() => null), link.first().click()]);
        return landedOn(name, from, {offered});
    }
    /** The "Subscriptions" page opened by its address. */
    async function readOffer(name) {
        const from = logSize();
        const resp = await offer.goto();
        const out = await landedOn(name, from, {status: resp ? resp.status() : null});
        if (!out.home) {
            out.types = (await offer.main().locator('.subscription_name').allInnerTexts()).map((t) => flat(t));
            out.purchaseLinks = await offer.purchaseLinks().count();
            fact(`${name}-page`, {types: out.types, purchaseLinks: out.purchaseLinks});
        }
        return out;
    }
    async function setMode(step, label) {
        const access = new AccessSettings(page, cp);
        await access.goto();
        await access.modeRadio(label).check();
        fact(`${step}-access-save`, (await access.save()).status());
    }
    /** Settings › Distribution › "Payments". */
    async function setPayments(step, {enabled, method}) {
        await page.goto(app.url(`${ctx}/management/settings/distribution`));
        await idle(page);
        await page.locator('#payments-button').click();
        await idle(page); await pause(500);
        const pay = page.locator('#payments');
        const box = pay.locator('input[name="paymentsEnabled"]').first();
        await box.setChecked(enabled);
        await pause(300);
        if (enabled) {
            await pay.locator('select[name="currency"]').first().selectOption({label: 'US Dollar'});
            if (method) {
                await pay.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'});
                await pause(400);
                await pay.locator('textarea[name^="manualInstructions"], input[name^="manualInstructions"]').first().fill('Pay by bank transfer.');
            }
        }
        const rs = page.waitForResponse((x) => /\/_payments/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await pay.getByRole('button', {name: 'Save', exact: true}).first().click();
        const r = await rs; await idle(page); await pause(500);
        fact(`${step}-payments-save`, r ? r.status() : null);
        await snap(`${step}-payments-saved`);
    }
    async function as(user) {
        await signOut(page).catch(() => {});
        await signIn(page, user, {contextPath: cp});
    }

    try {
        // ------------------------------------------------------------ steps 1-3: the manager
        await as(MANAGER);                                                                                 // 1
        await setPayments('step2', {enabled: true, method: true});                                         // 2
        const payments = new PaymentsPage(page, cp);                                                       // 3
        await payments.gotoTab('Subscription Types');
        const w = await payments.openCreateType();
        await w.fill({name: TYPES[0].name, currency: 'USD', cost: TYPES[0].cost, format: 'Online', duration: '12'});
        await w.kindRadio(TYPES[0].kind).check();
        fact('step3-type-save', (await w.saveAccepted()).status());
        await snap('step3-type-saved');

        // ------------------------------------------------------------ steps 4-6: open access (the dataset's mode)
        await as(READER);                                                                                  // 4
        const o = await readOffer('step5-open-offer-page');                                                // 5
        if (!o.home) await press('step6-open-purchase-individual', offer.purchaseLinks());                // 6

        // ------------------------------------------------------------ steps 7-8: not published online
        await as(MANAGER);                                                                                 // 7
        await setMode('step7', MODE.none);
        await as(READER);                                                                                  // 8
        const o8 = await readOffer('step8-none-offer-page');
        if (!o8.home) await press('step8-none-purchase-individual', offer.purchaseLinks());

        // ------------------------------------------------------------ step 9: signed out
        await signOut(page);                                                                               // 9
        await readOffer('step9-none-offer-page-signed-out');

        // ------------------------------------------------------------ steps 10-11: control, subscriptions required
        await as(MANAGER);                                                                                 // 10
        await setMode('step10', MODE.subscription);
        await as(READER);                                                                                  // 11
        const o11 = await readOffer('step11-subscription-offer-page');
        if (!o11.home) await press('step11-subscription-purchase-individual', offer.purchaseLinks());
    } finally {
        record('facts', facts);
        await close();
    }
});
