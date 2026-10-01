// Kept walk for docs/issues/U44-A11-urn-settings-pattern-script-error.md (spec U44 register A11).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens, as `rvaca`:
//   Settings › Website › "Plugins": tick "URN", its "Settings"; tick the first kind ("Articles" / "Monographs")
//   under the default choice (control); choose "Use the pattern entered below…"; untick and tick the kind again;
//   tick "Check Number"; fill prefix, the kind's pattern, namespace, resolver; "Save"; open "Settings" again.
// Records every uncaught page error per step and whether each pattern box can be typed in. No assertions.
// Run (main):  PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/urn-settings-pattern-script-error/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all …
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    if (!L.KINDS[app.name]) { fact('surface', 'no URN plugin on this app'); record('w-facts', facts); return; }
    const {page, close} = await launch(app);
    const errs = L.watchErrors(page);
    const kind = L.KINDS[app.name].find((k) => k.enable === 'enablePublicationURN'); // OJS "Articles", OMP "Monographs"
    try {
        // 1-4.
        await signIn(page, 'rvaca');
        errs.since();
        fact('step1-4: window open', await L.openUrnSettings(page, app, 'w-01-window-open'));
        fact('step4: errors on opening', errs.since());
        fact('step4: boxes', await L.boxStates(page, app));
        // 5: control under the default choice.
        fact('step5: tick kind (default choice)', await L.press(page, app, errs, `tick ${kind.kind}`, L.kindBox(page, kind)));
        // 6: the pattern choice.
        fact('step6: choose pattern', await L.press(page, app, errs, 'pattern choice', L.choice(page, 'pattern')));
        await L.snap(page, 'w-02-pattern-chosen');
        // 7: untick and tick the kind again.
        fact('step7a: untick kind', await L.press(page, app, errs, `untick ${kind.kind}`, L.kindBox(page, kind)));
        fact('step7b: tick kind', await L.press(page, app, errs, `tick ${kind.kind}`, L.kindBox(page, kind)));
        // 8: "Check Number".
        fact('step8: tick Check Number', await L.press(page, app, errs, 'Check Number', L.checkNo(page)));
        await L.snap(page, 'w-03-after-check-number');
        // 9-10: fill and "Save".
        const f = L.form(page);
        await f.locator('input[name="urnPrefix"]').fill('urn:nbn:de:0000-');
        await f.locator(`input[name="${kind.box}"]`).fill(kind.pattern);
        await f.locator('select[name="urnNamespace"]').selectOption('urn:nbn:de');
        await f.locator('input[name="urnResolver"]').fill('https://nbn-resolving.de/');
        errs.since();
        const s = await L.save(page, app, 'w-04-saved');
        fact('step10: Save', {saveStatus: s.saveStatus, windowOpen: s.windowOpen, top: s.top, notices: s.notices, errors: errs.since()});
        // 11: open "Settings" again (the stored choice is the pattern one).
        fact('step11: window reopened', await L.openUrnSettings(page, app, 'w-05-window-reopened'));
        fact('step11: errors on opening', errs.since());
        fact('step11: boxes', await L.boxStates(page, app));
        fact('step11: pattern chosen', await L.choice(page, 'pattern').isChecked());
    } finally {
        fact('all page errors', errs.all);
        record('w-facts', facts);
        await close();
    }
});
