// Issue report walk: docs/issues/U57-A7-create-context-one-language-script-error.md
// (spec U57 register A7). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
//   control and neighbour first, on the dataset's two-language site:
//     `admin` opens Administration › Hosted Journals (Presses, Servers) ›
//     "Create Journal", fills the form (path u57w53n), ticks English under
//     "Languages", chooses French as "Primary locale", presses "Save" (the
//     form refuses it: an error under "Primary locale"), ticks French under
//     "Languages" (the error must go: the code the fix touches is there for
//     this), and closes the window unsaved;
//   then the Steps: "Site Settings" › "Site Setup" › "Languages", French
//     disabled ("Disable" › "OK"); "Create Journal" again, each field filled
//     once (u57w53), "Save".
// The page's script failures (uncaught, and those Vue's error handler logs to
// the console) are counted per step. The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w53 --dataset 1 --reset
//   PROBE_FEATURE=issues-w53 PROBE_AGENT=w53 node bin/probe.js all shared/playwright/checks/issues/create-context-one-language-script-error/walk.js
//   PATH=… PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w53-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w53-3_5 PROBE_AGENT=w53 node bin/probe.js all shared/playwright/checks/issues/create-context-one-language-script-error/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs omp ops), run with PROBE_RUN=fix.
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {watchScriptErrors, openCreateForm, formLabels, fieldSteps, disableSiteLanguage} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`);
    };
    let n = 0;
    const snap = async (page, name) => record(`${String(++n).padStart(2, '0')}-${name}`, await screen(page));
    const {page, close} = await launch(app);
    const errs = watchScriptErrors(page);
    const rel = (u) => String(u).replace(app.baseURL, '');
    try {
        await signIn(page, 'admin');
        await idle(page);

        // ---- control and neighbour: the two-language site
        {
            const win = await openCreateForm(page, app);
            fact('control-open', {labels: await formLabels(win), errors: errs.since()});
            await snap(page, 'two-languages-create-form');
            const perField = {};
            for (const [label, act] of fieldSteps(win, {name: 'u57w53n Journal', path: 'u57w53n'})) {
                await act();
                await idle(page);
                perField[label] = errs.since();
            }
            fact('control-fields', perField);
            await win.setBox(win.languageBox('en'), true);
            await win.setBox(win.primaryChoice('fr_CA'), true);
            fact('control-languages', errs.since());
            const r = await win.pressSave();
            await idle(page);
            await win.error('primaryLocale').waitFor({timeout: 20_000}).catch(() => {});
            fact('neighbour-save-refused', {status: r.status(), errors: await win.errorMap(), script: errs.since()});
            await snap(page, 'two-languages-primary-refused');
            await win.setBox(win.languageBox('fr_CA'), true);
            await idle(page);
            await win.error('primaryLocale').waitFor({state: 'hidden', timeout: 5_000}).catch(() => {});
            fact('neighbour-after-french-ticked', {errors: await win.errorMap(), script: errs.since()});
            await snap(page, 'two-languages-french-ticked');
            fact('control-closed', {asked: await win.close(), script: errs.since()});
        }

        // ---- the Steps: the one-language site
        fact('step1-3-disable-french', await disableSiteLanguage(page, 'fr_CA'));    // 1-3
        await snap(page, 'site-languages-french-disabled');
        errs.since();
        const win = await openCreateForm(page, app);                                  // 4
        fact('step4-open', {labels: await formLabels(win), languagesField: await win.languageBoxes.count(), primaryField: await win.primaryChoices.count(), errors: errs.since()});
        await snap(page, 'one-language-create-form');
        const perField = {};
        let step = 5;
        for (const [label, act] of fieldSteps(win, {name: 'u57w53 Journal', path: 'u57w53'})) { // 5-9
            await act();
            await idle(page);
            perField[`${step}-${label}`] = errs.since();
            if (label !== 'contact name') step++;
        }
        fact('step5-9-fields', perField);
        fact('step5-9-count', Object.values(perField).reduce((s, e) => s + e.length, 0));
        await snap(page, 'one-language-create-form-filled');
        const r = await win.pressSave();                                              // 10
        await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: 20_000}).catch(() => {});
        await idle(page);
        fact('step10-save', {status: r.status(), landed: rel(page.url()), errors: errs.since()});
        await snap(page, 'after-save');
        fact('all-script-errors', errs.all.length);
    } finally {
        record('facts', facts);
        await close();
    }
});
