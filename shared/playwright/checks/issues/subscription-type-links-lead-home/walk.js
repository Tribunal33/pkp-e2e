// Issue report walk: docs/issues/U51-A24-subscription-type-links-lead-home.md
// (spec U51 register A24). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions):
//   steps 1-7   the journal manager `rvaca` makes `publicknowledge` require
//               subscriptions, places the "Subscription" block, adds an
//               individual and an institutional type (the "Payments" page
//               needs payments enabled), then turns payments off again;
//   steps 8-12  the reader `amwandenga` presses the block's "Learn More" and
//               both "View Available Subscription Types" on "My
//               Subscriptions";
//   steps 13-15 control, which must not change with the fix: payments set
//               up; "Learn More" opens the "Subscriptions" page and its
//               "Purchase New Subscription" opens the purchase page; "My
//               Subscriptions" offers "Purchase New Subscription";
//   step 16     signed out: the block's lines.
// Step numbers are the report's. The kit builds nothing. Every screen is
// recorded with screen(); where each press lands, the page's notices and the
// fleet's server-log errors go into the facts. A link the page does not offer
// (the fix in) is recorded as absent, not pressed.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes
// the journal's settings:
//   npm run fleet-prep -- --feature issues-w9 --dataset 9 --reset
//   PROBE_FEATURE=issues-w9 PROBE_AGENT=w9 node bin/probe.js ojs shared/playwright/checks/issues/subscription-type-links-lead-home/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w9-3_5 --dataset 9 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w9-3_5 PROBE_AGENT=w9 node bin/probe.js ojs shared/playwright/checks/issues/subscription-type-links-lead-home/walk.js
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
    const {AccessSettings, PaymentsPage, MySubscriptionsPage, SubscriptionsReader, SubscriptionBlock} = require('../../../pages/SubscriptionsPages.js');
    const {SidebarSetup} = require('../../../pages/CustomContentPages.js');
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
    const block = new SubscriptionBlock(page);
    const my = new MySubscriptionsPage(page, cp);
    const offer = new SubscriptionsReader(page, cp);
    const isHome = () => /\/index\.php\/[^/]+(\/en)?(\/index)?\/?$/.test(new URL(page.url()).pathname);
    const blockLines = async () => (await block.root().count()) ? (await block.lines().allInnerTexts()).map((t) => flat(t)) : null;
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
            block: await blockLines(),
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
    /** "My Subscriptions": each part's heading, its links. */
    async function readMine(name) {
        const from = logSize();
        const resp = await my.goto();
        await idle(page);
        const part = async (loc) => (await loc.count()) ? {
            text: flat(await loc.innerText(), 600),
            links: (await loc.getByRole('link').allInnerTexts()).map((t) => flat(t)),
        } : null;
        const out = {status: resp ? resp.status() : null, landed: here(), h1: flat(await my.heading().innerText().catch(() => null), 100),
            individual: await part(my.individualPart()), institutional: await part(my.institutionalPart()), log: logSince(from)};
        await snap(name, {walk: out});
        fact(name, out);
        return out;
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
        // ------------------------------------------------------------ steps 1-7: the manager
        await as(MANAGER);                                                                                 // 1
        await setMode('step2', MODE.subscription);                                                         // 2
        await setPayments('step3', {enabled: true, method: false});                                        // 3
        const sidebar = new SidebarSetup(page, cp);                                                        // 4
        await sidebar.goto();
        fact('step4-sidebar-save', await sidebar.place('subscriptionblockplugin', true));
        const payments = new PaymentsPage(page, cp);                                                       // 5-6
        await payments.gotoTab('Subscription Types');
        for (const [i, t] of TYPES.entries()) {
            const w = await payments.openCreateType();
            await w.fill({name: t.name, currency: 'USD', cost: t.cost, format: 'Online', duration: '12'});
            await w.kindRadio(t.kind).check();
            fact(`step${5 + i}-type-save`, (await w.saveAccepted()).status());
        }
        await snap('step6-types-saved');
        await setPayments('step7', {enabled: false});                                                      // 7

        // ------------------------------------------------------------ steps 8-12: A24, payments not set up
        await as(READER);                                                                                  // 8
        let from = logSize();
        await page.goto(app.url(`${ctx}/index`));
        await landedOn('step8-home', from);
        await press('step9-learn-more', block.link('Learn More'));                                         // 9
        await readMine('step10-my-subscriptions');                                                         // 10
        await press('step11-view-types-individual', my.individualPart().getByRole('link', {name: 'View Available Subscription Types', exact: true}));   // 11
        await my.goto(); await idle(page);                                                                 // 12
        await press('step12-view-types-institutional', my.institutionalPart().getByRole('link', {name: 'View Available Subscription Types', exact: true}));

        // ------------------------------------------------------------ steps 13-15: control, payments set up
        await as(MANAGER);                                                                                 // 13
        await setPayments('step13', {enabled: true, method: true});
        await as(READER);                                                                                  // 14
        await page.goto(app.url(`${ctx}/index`)); await idle(page);
        const s14 = await press('step14-learn-more', block.link('Learn More'));
        if (s14 && !s14.home) {
            fact('step14-page', {types: (await offer.main().locator('.subscription_name').allInnerTexts()).map((t) => flat(t)), purchaseLinks: await offer.purchaseLinks().count()});
            await press('step15-purchase-individual', offer.purchaseLinks());                              // 15
        }
        await readMine('step15-my-subscriptions-set-up');

        // ------------------------------------------------------------ step 16: signed out
        await signOut(page);                                                                               // 16
        from = logSize();
        await page.goto(app.url(`${ctx}/index`));
        await landedOn('step16-home-signed-out', from);
    } finally {
        record('facts', facts);
        await close();
    }
});
