// Issue report docs/issues/U52-A1-payment-types-promise-fees-on-about.md (U52 A1) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets").
//
//   1    sign in as dbarnes
//   2    Settings › Distribution › "Payments": "Enable", "US Dollar", "Manual Fee Payment",
//        "Pay by bank transfer u52r1" as the instructions, "Save"
//   3    reload, side menu "Payments", the "Payment Types" tab: the sentences under each heading
//   4    "50", "7", "5", "20" in the four boxes, "Save"
//   5    signed out: "About" › "About the Journal"
//   6    the other reader pages the menus offer, the home page, "Current" and "Archives"
//
// The kit builds nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-u52r1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u52r1 PROBE_AGENT=u52r1 node bin/probe.js ojs shared/playwright/checks/issues/payment-types-promise-fees-on-about/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/payment-types-promise-fees-on-about/fix.diff ojs
//               (reset, walk.js, neighbour.js), then node bin/try-fix.js revert …/fix.diff ojs
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u52r1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u52r1-3_5 PROBE_AGENT=u52r1 node bin/probe.js ojs shared/playwright/checks/issues/payment-types-promise-fees-on-about/walk.js
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const L = require('./lib');

const FEES = {
    'Article Processing Charge': 50,
    'Purchase Issue': 7,
    'Purchase Article': 5,
    'Association Membership': 20,
};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the "Payment Types" tab is a journal's alone
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {
        app: app.name,
        line: app.line || 'main',
        dataset: app.dataset,
    };
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 2500)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1-2
        await signIn(page, 'dbarnes');
        fact(
            '2 payments set up',
            await L.setUpPayments(page, app, {
                currency: 'USD',
                instructions: 'Pay by bank transfer u52r1',
            })
        );
        record('2-payments', await screen(page));

        // 3
        const {tab, tabs} = await L.openPaymentTypes(page, app);
        fact('3 tabs', tabs);
        const form = await L.readForm(tab.form());
        fact('3 sections', form.sections);
        fact('3 fields', form.fields);
        record('3-payment-types', await screen(page));

        // 4
        await L.typeFees(tab, FEES);
        fact('4 Save', await L.saveTypes(page, tab));
        fact('4 boxes', await L.boxValues(tab));
        record('4-saved', await screen(page));

        // 5
        await signOut(page);
        const menu = await L.aboutMenu(page, app);
        fact(
            '5 reader menus',
            menu.map((m) => m.name)
        );
        const amounts = Object.values(FEES);
        const base = app.url(`/index.php/${app.contextPath}/en`);
        fact('5 About the Journal', await L.readPublic(page, `${base}/about`, amounts));
        record('5-about', await screen(page));

        // 6
        const pages = {
            Submissions: '/about/submissions',
            'Editorial Masthead': '/about/editorialMasthead',
            'Privacy Statement': '/about/privacy',
            Contact: '/about/contact',
            Subscriptions: '/about/subscriptions',
            Home: '/index',
            Current: '/issue/current',
            Archives: '/issue/archive',
        };
        for (const [name, path] of Object.entries(pages)) fact(`6 ${name}`, await L.readPublic(page, `${base}${path}`, amounts));
    } finally {
        record('facts', facts);
        await close();
    }
});
