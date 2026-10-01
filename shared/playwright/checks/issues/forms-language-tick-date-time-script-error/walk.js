// Issue report docs/issues/U57-A5-forms-language-tick-date-time-script-error.md (U57 A5):
// the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//   steps    1–6: as `rvaca`, Settings › Website › "Setup" › "Languages": untick French
//            "Forms", reload, tick it again, then "Date & Time" › "French"
//   control  after the steps: reload (French is a form language again), untick and
//            re-tick French "Forms" on that page, then "Date & Time" › "French"
//   neighbour  (the fix's): French "Forms" unticked, reload, "Date & Time": no "French"
//            button, the English choices as before, and its "Save" sends English alone
//   The control is a neighbour too: with the fix in, it must stay as it was.
//
// Reset first:  npm run fleet-prep -- --feature issues-u3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u3 PROBE_AGENT=u3 node bin/probe.js all shared/playwright/checks/issues/forms-language-tick-date-time-script-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u3-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u3-3_5 PROBE_AGENT=u3 node bin/probe.js all shared/playwright/checks/issues/forms-language-tick-date-time-script-error/walk.js
//   `neighbour` as the script's argument takes the neighbour alone, as `rvaca`, on a fresh reset.
// Facts: .reports/<feature>/u3/a5-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');
const NEIGHBOUR_ONLY = process.argv[2] === 'neighbour';

forEachApp(async (app) => {
    const {JournalLanguagesTab} = require('../../../pages/LanguagesPages.js');
    const fact = (k, v) => { record('a5-facts', {[k]: v}, {merge: true}); console.log('[a5]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);
    const tab = new JournalLanguagesTab(page, app.contextPath, {locale: 'en'});

    // 1. Sign in as rvaca.  2. Settings › Website › "Setup" › "Languages".
    await signIn(page, 'rvaca');
    if (!NEIGHBOUR_ONLY) await steps();
    else await tab.goto();

    // Neighbour: French not a form language: "Date & Time" offers English alone and saves English alone.
    await tab.pressWebsite('fr_CA', 'formLocale');
    await tab.goto();
    errs.splice(0);
    fact('neighbour-dateTime', await L.dateTimeFrench(page));
    fact('neighbour-save', await L.saveDateTime(page));
    fact('neighbour-scriptErrors', errs.splice(0));
    await snap(page, 'a5-neighbour');

    async function steps() {
    await tab.goto();
    fact('formsBoxesAtStart', await L.formsBoxes(tab));
    errs.splice(0);

    // 3. Untick French "Forms".
    const untick = await tab.pressWebsite('fr_CA', 'formLocale');
    fact('step3-untick', {status: untick.response.status(), alerts: untick.alerts, notices: await L.noticeText(page), scriptErrors: errs.splice(0)});

    // 4. Reload; "Setup" › "Languages" again.
    await tab.goto();
    fact('step4-reloaded', {formsBoxes: await L.formsBoxes(tab), scriptErrors: errs.splice(0)});

    // 5. Tick French "Forms".
    const tick = await tab.pressWebsite('fr_CA', 'formLocale');
    await L.sleep(1500);
    fact('step5-tick', {status: tick.response.status(), alerts: tick.alerts, notices: await L.noticeText(page), formsBoxes: await L.formsBoxes(tab), scriptErrors: errs.splice(0)});
    await snap(page, 'a5-step5');

    // 6. "Setup" › "Date & Time", "French".
    fact('step6-dateTime', await L.dateTimeFrench(page));
    fact('step6-scriptErrors', errs.splice(0));
    await snap(page, 'a5-step6');

    // Control: a page loaded with French as a form language; untick, re-tick, "Date & Time".
    await tab.goto();
    errs.splice(0);
    const cUntick = await tab.pressWebsite('fr_CA', 'formLocale');
    const cTick = await tab.pressWebsite('fr_CA', 'formLocale');
    await L.sleep(1500);
    fact('control-untick-retick', {statuses: [cUntick.response.status(), cTick.response.status()], formsBoxes: await L.formsBoxes(tab), scriptErrors: errs.splice(0)});
    fact('control-dateTime', await L.dateTimeFrench(page));
    fact('control-scriptErrors', errs.splice(0));
    await snap(page, 'a5-control');
    await tab.goto();
    }
});
