// Issue report docs/issues/U51-A15-month-week-lists-read-1-months.md (U51 A15) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"). OMP and OPS have neither list.
//
//   1    sign in as rvaca (Journal manager)
//   2    Settings › Distribution, tab "Access"; "Publishing Mode": "The journal will require
//        subscriptions…" (not saved), so "Delayed Open Access" shows
//   3    the "Delayed Open Access" list's entries
//   4    the "Payments" page by its address (the side menu offers "Payments" only while
//        payments are enabled, which the dataset's journal does not), tab "Subscription Policies"
//   5    the four "Subscription Expiry Reminders" lists' entries
//
// The kit builds nothing; nothing is saved. Helpers: ../delayed-open-access-box-empty/lib.js.
//
// Reset first:  npm run fleet-prep -- --feature issues-sb8 --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-sb8 PROBE_AGENT=sb8 node bin/probe.js ojs shared/playwright/checks/issues/month-week-lists-read-1-months/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/month-week-lists-read-1-months/fix.diff ojs
//               (reset, walk.js, neighbour.js), then node bin/try-fix.js revert …/fix.diff ojs
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-sb8-3_5 --dataset 9 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb8-3_5 PROBE_AGENT=sb8 node bin/probe.js ojs shared/playwright/checks/issues/month-week-lists-read-1-months/walk.js
const {forEachApp, launch, signIn, screen, record, shot} = require('../../../probe');
const L = require('../delayed-open-access-box-empty/lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // both lists are a journal's alone
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const short = (s) => ({label: s.label, count: s.count, first: s.first.map((o) => o.text), last: s.last.map((o) => o.text)});
    const {page, close} = await launch(app);
    try {
        // 1-2
        await signIn(page, 'rvaca');
        const access = await L.openAccess(page);
        fact('2 subscriptions chosen', await L.chooseSubscriptionMode(access));
        // 3
        fact('3 Delayed Open Access', short(await L.readSelect(access.delayedList())));
        record('3-access', await screen(page));
        // 4: the side menu has no "Payments" while payments are off; the page's address
        fact('4 side menu entry "Payments"', await page.locator('nav#app-nav [aria-label="Payments"]').count());
        // 5
        const {lists} = await L.readReminderLists(page);
        for (const [name, s] of Object.entries(lists)) fact(`5 ${name}`, short(s));
        record('5-subscription-policies', await screen(page));
        await shot(page, '5-subscription-policies').catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
