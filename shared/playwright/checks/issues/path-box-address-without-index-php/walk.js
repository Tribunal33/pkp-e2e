// Issue report docs/issues/U59-A3-path-box-address-without-index-php.md (U59 A3):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"; the dataset's config keeps restful_urls Off).
//   (default)  the site's address (where it lands), then as `admin`: Hosted Journals › the
//              dataset journal's "Edit" (the address in front of "Path"), "Create Journal" (the
//              same), the row's "Settings wizard" › the journal tab (the same), then the shown
//              address followed by the path typed into the address bar.
//   neighbour  (the fix's): "Create Journal" u59d (path `u59d`, Iceland) saved through the screen;
//              the wizard it leads to shows the path box's address and the saved path `u59d`;
//              that address followed by `u59d` opens the new journal's home page.
//              Nothing is built by the kit in either mode.
//
// Reset first:  npm run fleet-prep -- --feature issues-u59d --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u59d PROBE_AGENT=u59d node bin/probe.js all shared/playwright/checks/issues/path-box-address-without-index-php/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u59d-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u59d-3_5 PROBE_AGENT=u59d node bin/probe.js all shared/playwright/checks/issues/path-box-address-without-index-php/walk.js
// Facts: .reports/<feature>/u59d/a3-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const W = L.WORDS[app.name];
    const fact = (k, v) => {
        record('a3-facts', {[k]: v}, {merge: true});
        console.log('[a3]', app.name, k, JSON.stringify(v).slice(0, 900));
    };
    const snap = async (page, name) => {
        record(name, await screen(page));
        await shot(page, name).catch(() => {});
    };
    const base = app.baseURL.replace(/\/$/, '');
    const {page} = await launch(app);
    const hosted = new HostedJournalsPage(page, W);

    if (MODE === 'neighbour') {
        await signIn(page, 'admin');
        await hosted.goto();
        const win = await hosted.openCreate();
        fact('nb-create-prefix', await L.readPathPrefix(win.form));
        await win.type(win.title('en'), `u59d ${W.noun}`);
        await win.type(win.initials('en'), 'U59D');
        await win.type(win.contactName, 'u59d Contact');
        await win.type(win.contactEmail, 'u59d@mailinator.com');
        await win.country.selectOption({label: 'Iceland'});
        await win.type(win.path, 'u59d');
        if (await win.languageBox('en').count()) {
            await win.setBox(win.languageBox('en'), true);
            await win.setBox(win.primaryChoice('en'), true);
        }
        let status = null;
        try {
            status = (await win.pressSave()).status();
        } catch (e) {
            status = `no answer: ${L.flat(e.message, 120)}`;
        }
        const landed = await page
            .waitForURL(/\/admin\/wizard\/\d+/, {timeout: L.T, waitUntil: 'commit'})
            .then(() => true)
            .catch(() => false);
        await idle(page).catch(() => {});
        const {table} = app.contextTables;
        fact('nb-create-save', {status, landedOnWizard: landed, stored: sql(app, `SELECT path FROM ${table} WHERE path LIKE 'u59d%'`)});
        let shown = null;
        if (landed) {
            const {SettingsWizardPage} = require('../../../pages/HostedJournalsPages.js');
            const wizard = new SettingsWizardPage(page, W.wizard);
            await wizard.expectOpen();
            const form = await wizard.journalForm();
            shown = await L.readPathPrefix(form.form);
            fact('nb-wizard-prefix', shown);
            await snap(page, 'a3-nb-wizard');
        }
        if (shown && shown.prefix) fact('nb-open-shown', await L.openTyped(page, `${shown.prefix}${shown.value}`));
        await snap(page, 'a3-nb-open');
        await signOut(page).catch(() => {});
        return;
    }

    // 1: the site's address; with one journal it opens that journal.
    fact('step1-site', await L.openTyped(page, `${base}/`));
    await snap(page, 'a3-step1');

    // 2–3: sign in as admin, Hosted Journals.
    await signIn(page, 'admin');
    await hosted.goto();

    // 4–5: the dataset journal's "Edit": the address in front of "Path".
    let win = await hosted.openEdit(app.contextPath);
    const edit = await L.readPathPrefix(win.form);
    fact('step5-edit-prefix', edit);
    await snap(page, 'a3-step5');
    await win.close().catch((e) => fact('step5-close', L.flat(e.message, 200)));

    // 6: "Create Journal": the same.
    win = await hosted.openCreate();
    fact('step6-create-prefix', await L.readPathPrefix(win.form));
    await snap(page, 'a3-step6');
    await win.close().catch((e) => fact('step6-close', L.flat(e.message, 200)));

    // 7: the row's "Settings wizard" › the journal tab: the same.
    const wizard = await hosted.openWizard(app.contextPath, W.wizard);
    const form = await wizard.journalForm();
    fact('step7-wizard-prefix', await L.readPathPrefix(form.form));
    await snap(page, 'a3-step7');

    // 8: the shown address followed by the path, typed into the address bar.
    if (edit.prefix) fact('step8-open-shown', await L.openTyped(page, `${edit.prefix}${edit.value}`));
    await snap(page, 'a3-step8');
    await signOut(page).catch(() => {});
});
