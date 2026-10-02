// Issue report walk: docs/issues/U51-A16-subscription-manager-offered-institutions-refused.md
// (spec U51 register A16). Takes the report's Steps through the screens on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), OJS only (the Subscription Manager role
// and the payments side menu are OJS's): its journal `publicknowledge`, its manager `rvaca` and its
// author `ccorino`, who is given the dataset's empty "Subscription Manager" role.
//
// The kit builds nothing. Everything goes through the screens:
//   precondition: as rvaca, Settings › Distribution › "Payments", tick "Enable", "Save"
//   precondition: as rvaca, Users & Roles › "Invite to a role" ccorino@mailinator.com as
//      "Subscription Manager"; ccorino, signed out, accepts from the emailed link
//   control: rvaca's side menu, "Institutions" pressed
//   steps: ccorino signs in, presses "Payments" in the side menu, the side menu is read,
//      "Institutions" pressed; back on "Payments", "Institutional Subscriptions" ›
//      "Create New Subscription", the window read
//   neighbour check (with fix.diff in and out): ccorino's "Payments" entry still there and
//      opening the Payments page; rvaca's "Institutions" still there and opening the page.
// Records every screen with screen().
//
// Trying the fix (REPORT.md "Proposed fix", harness.md "Trying a fix"):
//   node bin/try-fix.js apply shared/playwright/checks/issues/subscription-manager-offered-institutions-refused/fix.diff ojs
//   reset, run as below with PROBE_RUN=fix, then: node bin/try-fix.js revert shared/playwright/checks/issues/subscription-manager-offered-institutions-refused/fix.diff ojs
//
// Reset first:  npm run fleet-prep -- --feature issues-sb9 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-sb9 PROBE_AGENT=sb9 node bin/probe.js ojs shared/playwright/checks/issues/subscription-manager-offered-institutions-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-sb9-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb9-3_5 PROBE_AGENT=sb9 node bin/probe.js ojs shared/playwright/checks/issues/subscription-manager-offered-institutions-refused/walk.js
// Facts: .reports/<feature>/sb9/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {T, pause, rel, DENIED, sideMenu, pressMenuLink, inviteAndAccept} = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the surface is OJS's alone
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const path = app.contextPath; // publicknowledge
    const cu = (p) => app.url(`/index.php/${path}/en${p}`);
    fact('fleet', {line: app.line, dataset: app.dataset, context: path});
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        return s;
    }
    const mainText = (s) => `${s.text.main || ''} ${s.text.dialog || ''}`;
    try {
        // Precondition: payments enabled, as the manager.
        await signIn(page, 'rvaca', {contextPath: path});
        const {changePayments} = require('../payment-link-blank-page-when-payments-off/lib');
        fact('payments enabled', await changePayments(page, app, {enable: true}));
        await snap('payments-enabled');

        // Precondition: ccorino becomes the Subscription Manager.
        fact('invitation', await inviteAndAccept(page, app, {email: 'ccorino@mailinator.com', roleName: 'Subscription Manager', mark: snap}));

        // Control: the manager's side menu and "Institutions".
        await signIn(page, 'rvaca', {contextPath: path});
        await page.goto(cu('/payments'));
        await idle(page); await pause(400);
        fact('rvaca side menu on Payments', await sideMenu(page));
        await snap('rvaca-payments');
        if ((await sideMenu(page)).institutions) {
            await pressMenuLink(page, 'management/settings/institutions');
            const s = await snap('rvaca-institutions');
            fact('rvaca pressed Institutions', {url: rel(page.url()), denied: DENIED.test(mainText(s)), addInstitution: await page.getByRole('button', {name: 'Add Institution', exact: true}).count()});
        }

        // Step 1: sign in as ccorino.
        await signIn(page, 'ccorino', {contextPath: path});
        await idle(page); await pause(400);
        const landed = await snap('ccorino-landed');
        fact('1 ccorino lands', {url: rel(page.url()), denied: DENIED.test(mainText(landed)), menu: await sideMenu(page)});

        // Step 2: "Payments" in the side menu (or the address when the landing page has no menu).
        const m0 = await sideMenu(page);
        if (m0.payments) await pressMenuLink(page, '/payments');
        else { await page.goto(cu('/payments')); await idle(page); await pause(400); }
        const pay = await snap('ccorino-payments');
        fact('2 Payments', {via: m0.payments ? 'side menu' : 'address', url: rel(page.url()), h1: await page.locator('main h1, h1').first().innerText().catch(() => null), denied: DENIED.test(mainText(pay))});

        // Step 3: the side menu.
        const m1 = await sideMenu(page);
        fact('3 ccorino side menu on Payments', m1);
        await shot(page, 'ccorino-payments');

        // Step 4: "Institutions".
        if (m1.institutions) {
            await pressMenuLink(page, 'management/settings/institutions');
            const s = await snap('ccorino-institutions');
            fact('4 ccorino pressed Institutions', {url: rel(page.url()), title: await page.title(), denied: DENIED.test(mainText(s)), text: (s.text.main || '').replace(/\s+/g, ' ').trim().slice(0, 200), addInstitution: await page.getByRole('button', {name: 'Add Institution', exact: true}).count()});
            await shot(page, 'ccorino-institutions');
        } else {
            fact('4 ccorino pressed Institutions', 'not offered');
        }
        // The page's address typed (the register's "or opening its address").
        await page.goto(cu('/management/settings/institutions'));
        await idle(page); await pause(400);
        const typed = await snap('ccorino-institutions-typed');
        fact('4b ccorino Institutions by address', {url: rel(page.url()), denied: DENIED.test(mainText(typed))});

        // Step 5: "Institutional Subscriptions" › "Create New Subscription".
        await page.goto(cu('/payments'));
        await idle(page); await pause(400);
        // Neighbour check: the Subscription Manager keeps "Payments", and it opens the page.
        const m2 = await sideMenu(page);
        fact('N ccorino keeps Payments', {payments: m2.payments, entries: m2.entries});
        await page.locator('#subscriptionsTabs').getByRole('link', {name: 'Institutional Subscriptions', exact: true}).click();
        await idle(page); await pause(600);
        const panel = page.locator('#subscriptionsTabs [role="tabpanel"]:visible, #subscriptionsTabs .ui-tabs-panel:visible').first();
        await panel.getByRole('link', {name: 'Create New Subscription', exact: true}).click();
        const dlg = page.getByRole('dialog').last();
        await dlg.waitFor({timeout: T});
        await idle(page); await pause(800);
        const w = await snap('ccorino-create-institutional-subscription');
        const wt = (w.text.dialog || '').replace(/\s+/g, ' ');
        fact('5 Create New Subscription window', {
            noInstitution: /An institution must be created before new subscriptions can be made\./.test(wt),
            noType: /A subscription type must be created before new subscriptions can be made\./.test(wt),
            institutionOptions: await dlg.locator('select[name="institutionId"] option').allInnerTexts().catch(() => []),
        });
        await shot(page, 'ccorino-create-institutional-subscription');
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
