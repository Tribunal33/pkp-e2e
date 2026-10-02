// Issue report docs/issues/U51-A17-delayed-open-access-box-empty.md (U51 A17) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"). OMP and OPS have no "Delayed Open Access".
//
//   1    sign in as rvaca (Journal manager)
//   2    Settings › Distribution, tab "Access": which "Publishing Mode" choice shows selected
//   3    "Publishing Mode": "The journal will require subscriptions…"
//   4    "Delayed Open Access" as shown (expected "Disabled")
//   5    "Save": the value the browser sent, the answer, the stored row
//   6    reload, the "Access" tab: "Delayed Open Access" as shown
//   7    control: "Disabled" chosen, "Save", reload: as shown
//
// The kit builds nothing. Helpers: ./lib.js.
//
// Reset first:  npm run fleet-prep -- --feature issues-sb8 --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-sb8 PROBE_AGENT=sb8 node bin/probe.js ojs shared/playwright/checks/issues/delayed-open-access-box-empty/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/delayed-open-access-box-empty/fix.diff ojs
//               (reset, walk.js, neighbour.js), then node bin/try-fix.js revert …/fix.diff ojs
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-sb8-3_5 --dataset 9 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb8-3_5 PROBE_AGENT=sb8 node bin/probe.js ojs shared/playwright/checks/issues/delayed-open-access-box-empty/walk.js
const {forEachApp, launch, signIn, screen, record, shot} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // "Delayed Open Access" is a journal's alone
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        fact('0 stored before', {mode: L.stored(app, 'publishingMode'), delayed: L.stored(app)});
        // 1-2
        await signIn(page, 'rvaca');
        let access = await L.openAccess(page);
        const radios = access.modeRadios();
        const mode = [];
        for (let i = 0; i < (await radios.count()); i++) {
            const r = radios.nth(i);
            mode.push({label: L.flat(await r.evaluate((el) => (el.labels && el.labels[0] ? el.labels[0].innerText : el.value))), checked: await r.isChecked()});
        }
        fact('2 Publishing Mode', mode);
        fact('2 Delayed Open Access visible', await access.delayedList().isVisible());
        // 3
        fact('3 subscriptions chosen', await L.chooseSubscriptionMode(access));
        // 4
        const before = await L.readSelect(access.delayedList());
        fact('4 Delayed Open Access', {shown: before.shown, selectedIndex: before.selectedIndex, value: before.value, first: before.first});
        record('4-access', await screen(page));
        await shot(page, '4-access').catch(() => {});
        // 5
        fact('5 Save', await L.saveAccess(page, access));
        fact('5 stored', {mode: L.stored(app, 'publishingMode'), delayed: L.stored(app)});
        // 6
        access = await L.openAccess(page);
        const again = await L.readSelect(access.delayedList());
        fact('6 after reload', {mode: await access.modeRadio(L.SUBSCRIPTION_MODE).isChecked(), shown: again.shown, selectedIndex: again.selectedIndex, value: again.value});
        record('6-reloaded', await screen(page));
        await shot(page, '6-reloaded').catch(() => {});
        // 7
        await access.delayedList().selectOption({label: 'Disabled'});
        fact('7 Save with Disabled', await L.saveAccess(page, access));
        fact('7 stored', L.stored(app));
        access = await L.openAccess(page);
        const control = await L.readSelect(access.delayedList());
        fact('7 after reload', {shown: control.shown, selectedIndex: control.selectedIndex, value: control.value});
        record('7-control', await screen(page));
    } finally {
        record('facts', facts);
        await close();
    }
});
