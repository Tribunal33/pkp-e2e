// Issue report docs/issues/U57-A1-site-language-change-unticks-submission-languages.md (U57 A1):
// the report's Steps to reproduce, walked through the screens on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//   steps 1-7   rvaca adds German and Italian to "Submission Languages" and takes French
//               (Canada) off it, ticks German's "Submissions", makes Italian the "Default",
//               reads "Make a Submission"
//   steps 8-9   admin installs Spanish (Spain) through "Install Locale"
//   step 10     rvaca reads "Submission Languages" again
//   steps 11-14 the dataset's author starts a submission: what "Make a Submission" offers,
//               and the language the new submission gets (its "Details" step, its record)
//   steps 15-17 control: admin disables French (Canada) on the site; rvaca's "Website
//               Languages" must lose the French row (the journal's interface languages still
//               follow the site, with the fix in and out)
//
// Reset first:  npm run fleet-prep -- --feature issues-u1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u1 PROBE_AGENT=u1 node bin/probe.js all shared/playwright/checks/issues/site-language-change-unticks-submission-languages/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u1-3_5 PROBE_AGENT=u1 node bin/probe.js all shared/playwright/checks/issues/site-language-change-unticks-submission-languages/walk.js
// Facts: .reports/<feature>/u1/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const {JournalLanguagesTab, SiteLanguagesList, noticeDuring} = require('../../../pages/LanguagesPages.js');
    const fact = (k, v) => { record('walk-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 600)); };
    const snap = async (page, name) => { record(name, await screen(page)); await shot(page, name).catch(() => {}); };
    const settingsRow = () => {
        const t = app.contextTables;
        try {
            return sql(app, `select setting_name, setting_value from ${t.settings} where setting_name like 'supported%' order by 1`);
        } catch (e) { return String(e.message).slice(0, 200); }
    };
    const {page} = await launch(app);
    const tab = new JournalLanguagesTab(page, app.contextPath, {locale: 'en'});
    const site = new SiteLanguagesList(page);
    const readRows = async () => ({
        en: await L.submissionRow(tab, 'en'),
        fr_CA: await L.submissionRow(tab, 'fr_CA'),
        de: await L.submissionRow(tab, 'de'),
        it: await L.submissionRow(tab, 'it'),
    });

    // Steps 1-2
    await signIn(page, 'rvaca', {contextPath: app.contextPath});
    await tab.goto();
    fact('step2-rows', await readRows());

    // Steps 3-4
    const win = await tab.openAddRemove();
    await win.box('de').check();
    await win.box('it').check();
    await win.box('fr_CA').uncheck();
    await noticeDuring(page, 'Submission locales updated.', () => win.save());
    fact('step4-rows', await readRows());

    // Step 5
    const s5 = await tab.pressSubmission('de', 'submissionLocale');
    fact('step5', {status: s5.response && s5.response.status(), alerts: s5.alerts, rows: await readRows()});

    // Step 6
    const s6 = await tab.pressSubmission('it', 'defaultSubmissionLocale');
    fact('step6', {status: s6.response && s6.response.status(), alerts: s6.alerts, rows: await readRows()});
    await snap(page, 'step6-submission-languages');
    fact('step6-db', settingsRow());

    // Step 7
    fact('step7-start-page', await L.startPageLanguages(page, app));
    await snap(page, 'step7-start-page');

    // Steps 8-9
    await signOut(page);
    await signIn(page, 'admin');
    await site.goto();
    const inst = await site.openInstall();
    await inst.box('es').check();
    await noticeDuring(page, 'All selected locale(s) installed and activated.', () => inst.save());
    fact('step9-site-codes', await site.codes());
    await snap(page, 'step9-site-languages');

    // Steps 10-11
    await signOut(page);
    await signIn(page, 'rvaca', {contextPath: app.contextPath});
    await tab.goto();
    fact('step10-rows', await readRows());
    await snap(page, 'step10-submission-languages');
    fact('step10-db', settingsRow());

    // Steps 11-14: the author
    await signOut(page);
    await signIn(page, L.AUTHOR[app.name].username, {contextPath: app.contextPath});
    fact('step12-start-page', await L.startPageLanguages(page, app));
    await snap(page, 'step12-start-page');
    const begun = await L.beginAndReadDetails(page, app, 'u57u1 language check');
    await snap(page, 'step14-details');
    fact('step14-details', begun);
    fact('step14-db', sql(app, `select submission_id, locale from submissions where submission_id = ${Number(begun.id)}`));

    // Control: steps 15-17
    await signOut(page);
    await signIn(page, 'admin');
    await site.goto();
    await site.enableBox('fr_CA').click();
    await site.question('Disable').waitFor({timeout: 30_000});
    await noticeDuring(page, 'Locale disabled', () => site.answer('Disable', 'OK'));
    await signOut(page);
    await signIn(page, 'rvaca', {contextPath: app.contextPath});
    await tab.goto();
    fact('step17-website-codes', await tab.website.codes());
    fact('step17-submission-rows', await readRows());
    await snap(page, 'step17-languages');
    fact('step17-db', settingsRow());
    await idle(page);
});
