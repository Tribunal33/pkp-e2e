// Neighbour check of docs/issues/U52-A12-institutions-menu-entry-stays-after-payments-off.md (U52 A12) {OJS}:
// institutional statistics keep "Institutions" in the side menu whatever "Payments" does, and the fix
// must leave that alone. Walked with the fix in and out, on PKP's default test dataset. Helpers: lib.js.
//
//   N1   admin: Administration › Site Settings › "Statistics": tick "Enable institutional statistics", "Save"
//   N2   the journal's Settings › Distribution › "Statistics": tick the same box, "Save" ("Institutions" comes)
//   N3   the page loaded again, "Payments": "Enable" ticked and saved, then unticked and saved:
//        "Institutions" must stay
//   N4   "Payments" ticked and saved; "Statistics": the journal's box unticked and saved: "Institutions" stays
//        (payments are on)
//   N5   "Payments" unticked and saved: nothing keeps "Institutions" now (it goes with the fix only)
//   N6   the page loaded again: neither entry
//
// Reset first:  npm run fleet-prep -- --feature issues-u52r6 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u52r6 PROBE_AGENT=u52r6 node bin/probe.js ojs shared/playwright/checks/issues/institutions-menu-entry-stays-after-payments-off/neighbour.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        if (v && v.menu) v = {...v, menu: {institutions: v.menu.institutions, payments: v.menu.payments}};
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 600)}`);
    };
    const {page, close} = await launch(app);
    const failures = L.watchFailures(page);
    try {
        // N1
        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/en/admin/settings'));
        await idle(page);
        await page.locator('#setup-button').first().click().catch(() => {});
        await L.showTab(page, 'statistics');
        fact('N1 site box ticked, Save', await L.saveInstitutionStats(page, true, /api\/v1\/site/));

        // N2
        await L.openDistribution(page, app, 'statistics');
        fact('N2 journal box ticked, Save', await L.saveInstitutionStats(page, true, /api\/v1\/contexts/));
        record('N2-statistics-on', await screen(page));

        // N3 (a fresh page load, so the menu starts from what the page itself knows)
        await L.openDistribution(page, app, 'payments');
        fact('N3 page loaded again', {menu: await L.menu(page)});
        fact('N3 Enable ticked, Save', await L.savePayments(page, true));
        fact('N3 Enable unticked, Save', await L.savePayments(page, false));
        record('N3-payments-off-statistics-on', await screen(page));

        // N4
        fact('N4 Enable ticked, Save', await L.savePayments(page, true));
        await L.showTab(page, 'statistics');
        fact('N4 journal box unticked, Save', await L.saveInstitutionStats(page, false, /api\/v1\/contexts/));
        record('N4-statistics-off-payments-on', await screen(page));

        // N5
        await L.showTab(page, 'payments');
        fact('N5 Enable unticked, Save', await L.savePayments(page, false));
        record('N5-both-off', await screen(page));

        // N6
        await L.openDistribution(page, app);
        fact('N6 page loaded again', {menu: await L.menu(page)});
    } finally {
        facts.failures = failures;
        console.log(`[fact] failures: ${JSON.stringify(failures)}`);
        record('facts', facts);
        await close();
    }
});
