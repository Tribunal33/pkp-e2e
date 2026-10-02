// Neighbour check for the U51 A17 fix (fix.diff): run with the fix in and out, on a freshly
// reset dataset fleet. The fix only gives the list "Disabled" while nothing is saved; this
// shows that a saved choice still wins:
//   N1  "Publishing Mode" subscriptions, "Delayed Open Access" "6 Months", "Save", reload:
//       "6 Months" shown, 6 stored;
//   N2  the same with "Disabled" saved after it: "Disabled" shown, 0 stored.
//
// Reset first:  npm run fleet-prep -- --feature issues-sb8 --dataset 9 --reset
// Run:          PROBE_FEATURE=issues-sb8 PROBE_AGENT=sb8 [PROBE_RUN=fix] node bin/probe.js ojs shared/playwright/checks/issues/delayed-open-access-box-empty/neighbour.js
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        let access = await L.openAccess(page);
        await L.chooseSubscriptionMode(access);
        for (const [step, label] of [['N1', '6 Months'], ['N2', 'Disabled']]) {
            await access.delayedList().selectOption({label});
            fact(`${step} Save with ${label}`, await L.saveAccess(page, access));
            fact(`${step} stored`, L.stored(app));
            access = await L.openAccess(page);
            const s = await L.readSelect(access.delayedList());
            fact(`${step} after reload`, {shown: s.shown, value: s.value});
            record(`${step}-reloaded`, await screen(page));
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
