// Issue report docs/issues/U52-A12-institutions-menu-entry-stays-after-payments-off.md (U52 A12) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing. Helpers: lib.js.
//
//   1    sign in as dbarnes
//   2    Settings › Distribution › "Payments": the side menu as the page loads
//   3    tick "Enable", "Save": the side menu
//   4    untick "Enable", "Save": the side menu, read again after 5 seconds
//   5    press "Institutions" in the side menu
//   6    Settings › Distribution loaded again: the side menu
// The neighbour check (institutional statistics) is neighbour.js beside it.
//
// Reset first:  npm run fleet-prep -- --feature issues-u52r6 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u52r6 PROBE_AGENT=u52r6 node bin/probe.js ojs shared/playwright/checks/issues/institutions-menu-entry-stays-after-payments-off/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/institutions-menu-entry-stays-after-payments-off/fix.diff ojs
//               (reset, walk.js; reset, neighbour.js), then node bin/try-fix.js revert …/fix.diff ojs
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u52r6-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u52r6-3_5 PROBE_AGENT=u52r6 node bin/probe.js ojs shared/playwright/checks/issues/institutions-menu-entry-stays-after-payments-off/walk.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // only a journal's side menu follows "Enable" (a press's does not; a server has no payments)
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const {page, close} = await launch(app);
    const failures = L.watchFailures(page);
    const pick = (m) => ({institutions: m.institutions, payments: m.payments, nearSettings: m.labels.slice(Math.max(0, m.labels.indexOf('Settings') - 3), m.labels.indexOf('Settings') + 1)});
    try {
        // 1-2
        await signIn(page, 'dbarnes');
        await L.openDistribution(page, app, 'payments');
        fact('2 loaded', {enable: await page.locator('#payments input[name="paymentsEnabled"]').isChecked(), menu: pick(await L.menu(page))});
        record('2-payments-tab', await screen(page));

        // 3
        const s3 = await L.savePayments(page, true);
        fact('3 Enable ticked, Save', {...s3, menu: pick(s3.menu)});
        record('3-enabled-saved', await screen(page));

        // 4
        const s4 = await L.savePayments(page, false);
        fact('4 Enable unticked, Save', {...s4, menu: pick(s4.menu)});
        record('4-disabled-saved', await screen(page));
        await L.pause(5000);
        fact('4 five seconds later', pick(await L.menu(page)));

        // 5
        const inst = page.locator('nav#app-nav [aria-label="Institutions"]').first();
        if (await inst.count()) {
            const before = page.url();
            await Promise.all([page.waitForURL((u) => u.href !== before, {timeout: L.T}), inst.click()]);
            await idle(page);
            fact('5 Institutions pressed', {
                url: L.rel(page.url()),
                h1: await page.locator('h1').first().innerText().catch(() => null),
                addInstitution: await page.getByRole('button', {name: 'Add Institution', exact: true}).count(),
                menu: pick(await L.menu(page)),
            });
            record('5-institutions-pressed', await screen(page));
        } else {
            fact('5 Institutions pressed', 'no "Institutions" entry to press');
        }

        // 6
        await L.openDistribution(page, app, 'payments');
        fact('6 page loaded again', {enable: await page.locator('#payments input[name="paymentsEnabled"]').isChecked(), menu: pick(await L.menu(page))});
        record('6-reloaded', await screen(page));
    } finally {
        facts.failures = failures;
        console.log(`[fact] failures: ${JSON.stringify(failures)}`);
        record('facts', facts);
        await close();
    }
});
