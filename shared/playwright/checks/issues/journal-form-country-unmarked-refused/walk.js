// Issue report docs/issues/U59-A1-journal-form-country-unmarked-refused.md (U59 A1, U07 A11):
// the report's Steps to reproduce, walked through the screens on PKP's default test datasets
// (a dataset fleet, harness.md "Dataset fleets"). The script builds nothing.
//   (default)  Creating, on the dataset of the version: as `admin`, Hosted Journals › "Create
//              Journal", the Required marks read, the form filled without "Country", "Save";
//              then "Iceland" picked and "Save" again (the typed values kept). Then Settings ›
//              Journal › "Masthead" of `publicknowledge`: its "Country" mark.
//   edit       Editing: the precondition as the Steps give it (signed in as `admin` on Hosted
//              Journals, the browser console's request "Create Journal" sends, without `country`:
//              "u59a No Country", path `u59anc`), then its "Edit", "Enable…" unticked, "Save";
//              then "Iceland", "Save".
//   neighbour  (the fix's check): the same precondition, then as `admin` the new journal's
//              Settings › Journal › "Masthead", "Save" with no country: refused, nothing stored.
//
// Run (main):   npm run fleet-prep -- --feature issues-u59a --dataset 1 --reset   (before each mode)
//               PROBE_FEATURE=issues-u59a PROBE_AGENT=u59a node bin/probe.js all shared/playwright/checks/issues/journal-form-country-unmarked-refused/walk.js [edit|neighbour]
// 3.5: the same with PKP_E2E_LINE=stable-3_5_0, feature issues-u59a-3_5, PROBE_RUN=r35.
// Facts: .reports/<feature>/u59a/a1-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const {SettingsPages} = require('../../../pages/ContextIdentityPages.js');
    const W = L.WORDS[app.name];
    const fact = (k, v) => {
        record('a1-facts', {[k]: v}, {merge: true});
        console.log('[a1]', app.name, k, JSON.stringify(v).slice(0, 900));
    };
    const snap = async (page, name) => {
        record(name, await screen(page));
        await shot(page, name).catch(() => {});
    };
    const marks = (form, prefix) =>
        L.requiredMarks(form, {
            title: `[id^="${prefix}-name-control"]`,
            initials: `[id^="${prefix}-acronym-control"]`,
            contactName: `#${prefix}-contactName-control`,
            contactEmail: `#${prefix}-contactEmail-control`,
            country: `#${prefix}-country-control`,
            path: `#${prefix}-urlPath-control`,
            languages: 'input[name="supportedLocales"]',
            primaryLocale: 'input[name="primaryLocale"]',
        });
    const {page} = await launch(app);

    const hosted = new HostedJournalsPage(page, W);

    // Editing precondition (modes `edit` and `neighbour`): a journal with no country, made as
    // the Steps say: signed in as admin on Hosted Journals, the browser console's request.
    const precondition = async () => {
        await signIn(page, 'admin');
        await hosted.goto();
        const made = await L.createWithoutCountry(page, `u59a No Country`, 'u59anc');
        fact('pre-created', {...made, stored: L.stored(app, 'u59anc')});
    };

    if (MODE === 'neighbour') {
        // The fix's check: the new journal's Settings › Journal › "Masthead", "Save" with no country.
        await precondition();
        const settings = new SettingsPages(page, 'u59anc');
        const masthead = await settings.openJournalTab('Masthead');
        fact('nb-masthead-opened', {
            countryMarked: (await marks(masthead.form, 'masthead')).country,
            countryChosen: await masthead.form.locator('#masthead-country-control').evaluate((s) => (s.selectedIndex < 0 ? '' : s.options[s.selectedIndex].text.trim())),
        });
        const res = await L.saveAndRead(page, masthead.form);
        fact('nb-masthead-save', {...res, after: L.stored(app, 'u59anc')});
        await snap(page, 'a1-nb-masthead');
        return;
    }

    if (MODE === 'edit') {
        await precondition();
        // 7: Hosted Journals (reloaded), the arrow of u59anc, "Edit".
        await hosted.goto();
        const win = await hosted.openEdit('u59anc');
        fact('step7-opened', {marks: await marks(win.form, 'context'), countryChosen: await win.countryChosen(), enabled: await win.enableBox.isChecked()});
        await snap(page, 'a1-step7');
        // 8: "Enable…" unticked.  9: "Save".
        await win.setBox(win.enableBox, false);
        const edited = await L.saveAndRead(page, win.form);
        await snap(page, 'a1-step9');
        fact('step9-save', {...edited, notices: (await screen(page)).notices, enabledBoxAfter: (await win.form.count()) ? await win.enableBox.isChecked() : null, stored: L.stored(app, 'u59anc')});
        if ((await win.form.count()) > 0 && edited.sent.some((x) => x.status >= 400)) {
            await win.country.selectOption({label: 'Iceland'});
            const again = await L.saveAndRead(page, win.form);
            fact('step9-iceland', {...again, stored: L.stored(app, 'u59anc')});
        } else {
            fact('step9-iceland', {skipped: 'saved at step 9'});
        }
        await win.close().catch(() => {});
        await signOut(page).catch(() => {});
        return;
    }

    // Creating. 1–3: sign in as admin, Hosted Journals, "Create Journal".
    await signIn(page, 'admin');
    await hosted.goto();
    let win = await hosted.openCreate();
    // 4: the Required marks.
    fact('step4-marks', await marks(win.form, 'context'));
    fact('step4-country', {chosen: await win.countryChosen(), options: await win.countryOptions.count(), description: L.flat(await win.country.locator('xpath=ancestor::div[contains(@class,"pkpFormField")][1]').innerText())});
    // 5: the form filled, "Country" left as it opened.
    await win.type(win.title('en'), `u59a ${W.noun}`);
    await win.type(win.initials('en'), 'U59A');
    await win.type(win.contactName, 'u59a Contact');
    await win.type(win.contactEmail, 'u59a@mailinator.com');
    await win.type(win.path, 'u59a');
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    // 6: "Save".
    const created = await L.saveAndRead(page, win.form);
    await snap(page, 'a1-step6');
    fact('step6-save', {...created, notices: (await screen(page)).notices, stored: L.stored(app, 'u59a')});
    // 7 (control): "Iceland", "Save" (only while the window is still open).
    if ((await win.form.count()) > 0) {
        await win.country.selectOption({label: 'Iceland'});
        const control = await L.saveAndRead(page, win.form);
        fact('step7-control', {...control, stored: L.stored(app, 'u59a')});
    } else {
        fact('step7-control', {skipped: 'the window left at step 6'});
    }

    // Comparison: Settings › Journal › "Masthead" of publicknowledge.
    const settings = new SettingsPages(page, app.contextPath);
    const masthead = await settings.openJournalTab('Masthead');
    fact('masthead-marks', {country: (await marks(masthead.form, 'masthead')).country, title: (await marks(masthead.form, 'masthead')).title});
    await snap(page, 'a1-masthead');
    await signOut(page).catch(() => {});
});
