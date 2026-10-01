// Issue report docs/issues/U57-A7-create-journal-one-language-script-error.md (U57 A7):
// the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//   steps      1–6: as `admin`, French's "Enable" unticked on Site Settings › "Site Setup" ›
//              "Languages", then Hosted Journals › "Create Journal" typed field by field, "Save"
//   control    French enabled again; the same window, the same fields typed, closed unsaved
//   neighbour  (the fix's): on the two-language site, "Languages" English only and
//              "Primary locale" French, "Save" → the red reason under "Primary locale";
//              then French ticked under "Languages" → the reason goes (what the watcher is for)
//
// Reset first:  npm run fleet-prep -- --feature issues-u3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u3 PROBE_AGENT=u3 node bin/probe.js all shared/playwright/checks/issues/create-journal-one-language-script-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u3-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u3-3_5 PROBE_AGENT=u3 node bin/probe.js all shared/playwright/checks/issues/create-journal-one-language-script-error/walk.js
// Facts: .reports/<feature>/u3/a7-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const {SiteLanguagesList} = require('../../../pages/LanguagesPages.js');
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const W = L.WORDS[app.name];
    const fact = (k, v) => { record('a7-facts', {[k]: v}, {merge: true}); console.log('[a7]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);
    const site = new SiteLanguagesList(page);
    const hosted = new HostedJournalsPage(page, W);

    // 1. Sign in as admin.  2–3. Site Settings › "Site Setup" › "Languages": French "Enable" off.
    await signIn(page, 'admin');
    await site.goto();
    fact('step3-disable', await L.setEnabled(site, 'fr_CA', false));
    errs.splice(0);

    // 4. Hosted Journals › "Create Journal".
    await hosted.goto();
    let win = await hosted.openCreate();
    fact('step4-opened', {languageFields: await win.languageBoxes.count(), primaryFields: await win.primaryChoices.count(), scriptErrors: errs.splice(0)});

    // 5. Each field, typed key by key as a person does (`pasted` as the argument: each box
    //    takes its whole value at once, as a paste or the browser's autofill does).
    fact('step5-fields', await L.fillCounting(win, errs, {name: `u57u3 ${W.noun}`, initials: 'U57U3', path: 'u57u3', email: 'u57u3@mailinator.com'}, {typed: process.argv[2] !== 'pasted'}));
    await snap(page, 'a7-step5');

    // 6. "Save".
    const saved = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: L.T}).catch(() => {});
    fact('step6-save', {status: saved.status(), landed: page.url().replace(app.baseURL, ''), scriptErrors: errs.splice(0)});
    await snap(page, 'a7-step6');

    // Control: French enabled again, the same window and fields, closed unsaved.
    await site.goto();
    fact('control-enable', await L.setEnabled(site, 'fr_CA', true));
    await hosted.goto();
    errs.splice(0);
    win = await hosted.openCreate();
    fact('control-opened', {languageFields: await win.languageBoxes.count(), primaryFields: await win.primaryChoices.count(), scriptErrors: errs.splice(0)});
    fact('control-fields', await L.fillCounting(win, errs, {name: `u57u3 ${W.noun} B`, initials: 'U57U3B', path: 'u57u3b', email: 'u57u3@mailinator.com'}));

    // Neighbour: "Languages" English only, "Primary locale" French, "Save", then French ticked.
    fact('neighbour', await L.primaryNotInLanguages(win, errs));
    await snap(page, 'a7-neighbour');
    await win.close().catch(() => {});
});
