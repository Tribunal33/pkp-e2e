// @ts-check
/**
 * @file playwright/tests/serial/U57-languages-and-locales.spec.js
 *
 * Languages & locales — OMP suite, site part: scenarios 1–3 (all common),
 * in OMP vocabulary ("Hosted Presses", the Settings wizard's "Setup", "hosted
 * presses", "OMP"). Scenarios 4–9 run on scratch presses in
 * `../U57-languages-and-locales.spec.js`.
 * Spec: docs/specs/U57-languages-and-locales.md
 *
 * Serial project, alone (PRINCIPLES A7, A9): each scenario changes the
 * site's own language list, which every press of the install reads and
 * every change saves again (Rules 3a, 3c), so each test carries `@solo`
 * and runs by itself in the `omp-solo` project after the serial one
 * (harness.md "Project chain"; `omp-serial` greps `@solo` out). Each test
 * puts back what it changed in a `finally`, even when it fails midway:
 * English the site's primary language again first (scenario 3), then
 * German removed through its row's "Remove" (footnote s). Each also starts
 * from the site as installed, taking off a German a failed earlier run
 * left behind.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞
 * (no press here holds a submission language the site lacks), A6 🐞, A7
 * 🐞, A10 ❓ (S3's first visitor reads the site's home in German; the
 * presses' names on it are not read), A12 ❓ (the menu's names on "Site
 * Settings" are not read), A13 ❓ (S1 does not read the German template
 * boxes of a form-only German as empty, only that its own text is gone), A2, A3, A4, A5, A8, A9, A11 (the
 * parallel file's scenarios). OMP1 ✅ is read as the press's line under the
 * site's list. The spec's Coverage section records everything else left
 * out.
 *
 * Seeding (footnote s): no harness key installs a language, so scenarios 2
 * and 3 install German through "Install Locale" before their steps and
 * seed their German presses after it (scratch presses from
 * `POST scenarios/context`, their languages through `context.*Locales`
 * and `context.primaryLocale`); throwaway accounts come from the same
 * request (the username twice as password). The Site Administrator is
 * `admin`. Every signed-in actor is opened through `asUser`; a visitor is
 * a browser context with an empty storage state and a language of its own
 * (`Accept-Language`, footnote s). A site change re-saves every context:
 * seconds on a fresh install, minutes on a fleet after a full run (an
 * install 145 s and a removal 62 s with 457 journals on OJS), so every
 * wait across one allows `SITE_CHANGE` (eight minutes) and each test as
 * many of them as it makes changes, its `finally` included. Each test also
 * starts by putting back what a failed earlier run left (`restore()`).
 */
const {test: base, expect} = require('../../support/fixtures.js');
const {AdministrationPage} = require('../../../../../shared/playwright/pages/AdminPages.js');
const {ProfilePage} = require('../../../../../shared/playwright/pages/ProfilePage.js');
const {WorkflowEmailsSettingsPage} = require('../../../../../shared/playwright/pages/EmailsPages.js');
const {
    SiteLanguagesList,
    JournalLanguagesTab,
    LanguageMenu,
    openWizardLanguages,
    noticeDuring,
    SITE_CHANGE,
} = require('../../../../../shared/playwright/pages/LanguagesPages.js');

// ---- the OMP words ----------------------------------------------------------------
const HOSTED = 'Hosted Presses';
const WIZARD_TAB = 'Setup';
const INSTALL_SENTENCE =
    'Select any additional locales to install support for in this system. Locales must be installed before they can be used by hosted presses. See the OMP documentation for information on adding support for new languages.';
const AFFECTS = 'This may affect any hosted presses currently using the locale.';
const ACK_EMAIL = 'Submission Confirmation';
/** The line under the site's list: a press's opens with an asterisk (register OMP1 ✅). */
const MAYBE_INCOMPLETE = '* Marked locales may be incomplete.';

// ---- the words the three apps share --------------------------------------------------
const INSTALLED = 'All selected locale(s) installed and activated.';
const REMOVE_Q = `Are you sure you want to uninstall this locale? ${AFFECTS}`;
const DISABLE_Q = `Are you sure you want to disable this locale? ${AFFECTS}`;
const PRIMARY_Q =
    "Are you sure you want to change the site primary locale? Users' names, which are required in the site's primary locale, will be copied from the existing primary locale where they are missing.";
const CANT_DISABLE = "This locale is the primary language of the site. You can't disable it until you choose another primary locale.";
const ENABLED = 'Locale enabled.';
const DISABLED = 'Locale disabled.';
const UNINSTALLED = 'German/Deutsch locale uninstalled.';
const PRIMARY_DEFINED = 'German/Deutsch defined as primary locale.';
const SAVED = 'Locale settings saved.';
const LEAVE = 'The data on this form has changed. Do you wish to continue without saving?';
const OUR_TEXT = 'Unser Text.';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u57s${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function person(username, givenName, familyName, roles) {
    return {username, givenName, familyName, roles};
}

/** A signed-in page for an actor (a fresh `asUser` context). */
async function signedIn(asUser, username) {
    return (await asUser(username)).newPage();
}

/** The page's `<html lang>`. */
async function pageLang(page) {
    return page.evaluate(() => document.documentElement.getAttribute('lang'));
}

/** The lines of the initials menu as `[text, ticked]` pairs, headings as `[text, 'heading']`. */
const menuLines = (items) => items.map((i) => [i.text, i.heading ? 'heading' : i.ticked]);

/** The codes of a list, sorted (the list's own order is not a claim here). */
const sortedCodes = async (grid) => (await grid.codes()).sort();

/** The site's home page's address, optionally after a language. */
const siteHome = (locale) => new RegExp(`/index\\.php/index/${locale}(/index)?/?$`);

/**
 * Settings › Workflow › "Emails" › "Add and edit templates", the email's
 * "Edit" and its default template's "Edit Template" window (U56 scenario
 * 5's way in); returns the Manage Emails page object with the window open.
 */
async function openDefaultTemplate(page, contextPath, email) {
    const tab = new WorkflowEmailsSettingsPage(page, contextPath);
    await tab.goto();
    const manage = await tab.openManageEmails();
    const opened = await manage.openEmail(email);
    if (opened.kind === 'several') {
        const rows = await manage.templateRowsRead(opened.window);
        const byDefault = rows.find((r) => r.badges.includes('Default')) || rows[0];
        await manage.openTemplate(opened.window, byDefault.name);
    }
    return manage;
}

/** Visitors: browser contexts with no session and a language of their own. */
const test = base.extend({
    newVisitor: async ({browser, baseURL}, use) => {
        const made = [];
        await use(async ({language}) => {
            const context = await browser.newContext({
                baseURL,
                storageState: {cookies: [], origins: []},
                reducedMotion: 'reduce',
                locale: language,
                extraHTTPHeaders: {'Accept-Language': language},
            });
            made.push(context);
            return context.newPage();
        });
        for (const context of made) {
            await context.close().catch(() => {});
        }
    },
});

test.describe('languages and locales: the site', () => {
    test('S1: installing and removing a site language @solo', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(6 * SITE_CHANGE);
        const tag = makeTag(1, testInfo);
        const manager = `${tag}mg`;
        await ompApi.createContext({tag, users: [person(manager, 'Mona', 'Manager', ['manager'])]});
        const ap = await signedIn(asUser, 'admin');
        const mp = await signedIn(asUser, manager);
        const site = new SiteLanguagesList(ap);
        const tab = new JournalLanguagesTab(mp, tag);
        await site.restore();
        try {
            // Administration's "Change Language": the site's languages, each
            // named in its own language, the tick beside the one being read,
            // the switch both ways (Fields; Rule 20).
            const admin = new AdministrationPage(ap);
            await admin.goto();
            const menu = new LanguageMenu(ap);
            expect(menuLines(await menu.read()).slice(0, 3)).toEqual([
                ['Change Language', 'heading'],
                ['English', true],
                ['français', false],
            ]);
            await menu.choose('français', 'fr_CA');
            await expect(ap).toHaveURL(/\/index\.php\/index\/fr_CA\/admin/);
            expect(await pageLang(ap)).toMatch(/^fr/);
            expect(menuLines(await menu.read()).slice(0, 3)).toEqual([
                ['Changer la langue', 'heading'],
                ['English', false],
                ['français', true],
            ]);
            await menu.choose('English', 'en');
            await expect(ap).toHaveURL(/\/index\.php\/index\/en\/admin/);
            await admin.expectOpen();

            // The site's list (Fields; Rules 5, 6).
            await site.gotoFromAdministration();
            await expect(site.title).toHaveText('Languages');
            expect(await site.columns()).toEqual(['Enable', 'Locale', 'Code', 'Primary locale']);
            expect(await sortedCodes(site)).toEqual(['en', 'fr_CA']);
            await expect(site.row('en')).toContainText('English/English');
            await expect(site.enableBox('en')).toBeChecked();
            await expect(site.primaryRadio('en')).toBeChecked();
            await expect(site.asterisk('en')).toHaveCount(0);
            await expect(site.row('fr_CA')).toContainText('French/français');
            expect(await site.cellTexts('fr_CA')).toContain('fr_CA');
            await expect(site.enableBox('fr_CA')).toBeChecked();
            await expect(site.primaryRadio('fr_CA')).not.toBeChecked();
            await expect(site.asterisk('fr_CA')).toHaveText('*');
            await expect(site.arrow('fr_CA')).toHaveCount(1);
            await expect(site.arrow('en')).toHaveCount(0);
            expect(await site.openRowActions('fr_CA')).toEqual(['Remove']);
            await expect(site.footLine(MAYBE_INCOMPLETE)).toBeVisible();

            // "Install Locale" left unsaved: the leave question, "Cancel"
            // keeps the window, "OK" closes it, nothing installed (Fields).
            let win = await site.openInstall();
            await expect(win.dialog).toBeVisible();
            await expect(win.group).toBeVisible();
            expect(await win.text()).toContain(`Available Locales ${INSTALL_SENTENCE}`);
            await expect(win.boxByLabel('German/Deutsch (de)')).toBeVisible();
            await expect(win.box('de')).toHaveCount(1);
            await expect(win.box('en')).toHaveCount(0);
            await expect(win.box('fr_CA')).toHaveCount(0);
            await expect(win.saveButton).toBeVisible();
            await expect(win.cancelButton).toBeVisible();
            await win.box('de').check();
            await win.box('de').blur();
            expect(await win.closeAnswering('dismiss')).toBe(LEAVE);
            await expect(win.form).toBeVisible();
            expect(await win.closeAnswering('accept')).toBe(LEAVE);
            await expect(win.form).toBeHidden();
            expect(await sortedCodes(site)).toEqual(['en', 'fr_CA']);

            // "Save" with nothing ticked: the notice, nothing added (Rule 2).
            win = await site.openInstall();
            const empty = await noticeDuring(ap, INSTALLED, () => win.save(), {timeout: SITE_CHANGE});
            expect(empty.status()).toBe(200);
            await site.reload();
            expect(await sortedCodes(site)).toEqual(['en', 'fr_CA']);

            // German installed: enabled, not primary, with the asterisk (Rules 2, 6).
            win = await site.openInstall();
            await win.box('de').check();
            const installed = await noticeDuring(ap, INSTALLED, () => win.save(), {timeout: SITE_CHANGE});
            expect(installed.status()).toBe(200);
            await expect(site.row('de')).toContainText('German/Deutsch');
            expect(await site.cellTexts('de')).toContain('de');
            await expect(site.enableBox('de')).toBeChecked();
            await expect(site.primaryRadio('de')).not.toBeChecked();
            await expect(site.asterisk('de')).toHaveText('*');

            // The press's list: a German row with nothing ticked (Rule 2).
            await tab.goto();
            await expect(tab.website.row('de')).toContainText('German/Deutsch');
            await expect(tab.website.cell('de', 'uiLocale')).not.toBeChecked();
            await expect(tab.website.cell('de', 'formLocale')).not.toBeChecked();

            // The German email texts: a "German" button once German is a
            // form language; a German body of the press's own (Side
            // effects; U56 Rule 20).
            const forms = await noticeDuring(mp, SAVED, () => tab.pressWebsite('de', 'formLocale'));
            expect(forms.response.status()).toBe(200);
            // (Its German boxes opening empty is A13's, not read.)
            let manage = await openDefaultTemplate(mp, tag, ACK_EMAIL);
            await expect(manage.languageButton('German')).toBeVisible();
            await manage.languageButton('German').click();
            await expect(manage.bodyFrame('de')).toBeVisible();
            await manage.typeBody(OUR_TEXT, {locale: 'de'});
            await expect.poll(() => manage.bodyHtml('de')).toContain(OUR_TEXT);
            await manage.saveTemplate();
            manage = await openDefaultTemplate(mp, tag, ACK_EMAIL);
            await manage.languageButton('German').click();
            await expect.poll(() => manage.bodyHtml('de')).toBe(`<p>${OUR_TEXT}</p>`);

            // "Cancel" on "Remove": the row stays (Rules 3, 5).
            await site.goto();
            await site.pressRemove('de');
            await expect(site.question('Remove')).toContainText(REMOVE_Q);
            await expect(site.questionButton('Remove', 'OK')).toBeVisible();
            await site.answer('Remove', 'Cancel');
            await expect(site.row('de')).toBeVisible();

            // German removed: the notice, the row gone, gone from the
            // press's list (Rules 3a, 5).
            await site.pressRemove('de');
            const removed = await noticeDuring(ap, UNINSTALLED, () => site.answer('Remove', 'OK'), {timeout: SITE_CHANGE});
            expect(removed.status()).toBe(200);
            await expect(site.row('de')).toHaveCount(0);
            await expect(site.row('en')).toBeVisible();
            await tab.goto();
            await expect(tab.website.row('en')).toBeVisible();
            await expect(tab.website.row('de')).toHaveCount(0);

            // German installed again: offered again, back on the press's
            // list unticked, and its German body the application's default
            // (Rules 2, 5; Side effects).
            await site.goto();
            win = await site.openInstall();
            await expect(win.boxByLabel('German/Deutsch (de)')).toBeVisible();
            await win.box('de').check();
            const again = await noticeDuring(ap, INSTALLED, () => win.save(), {timeout: SITE_CHANGE});
            expect(again.status()).toBe(200);
            await tab.goto();
            await expect(tab.website.row('de')).toContainText('German/Deutsch');
            await expect(tab.website.cell('de', 'uiLocale')).not.toBeChecked();
            await expect(tab.website.cell('de', 'formLocale')).not.toBeChecked();
            const formsAgain = await noticeDuring(mp, SAVED, () => tab.pressWebsite('de', 'formLocale'));
            expect(formsAgain.response.status()).toBe(200);
            // The press's own German text is gone (whether the box is empty
            // is A13's, not read); the English "Body" is the default text.
            manage = await openDefaultTemplate(mp, tag, ACK_EMAIL);
            await expect(manage.languageButton('German')).toBeVisible();
            await manage.languageButton('German').click();
            await expect(manage.bodyFrame('de')).toBeVisible();
            await expect(manage.bodyFrame('en')).toContainText('Thank you for your submission');
            expect(await manage.bodyHtml('de')).not.toContain(OUR_TEXT);

            // Control: German installed, "Install Locale" no longer offers it (Fields).
            await site.goto();
            win = await site.openInstall();
            await expect(win.box('es')).toHaveCount(1);
            await expect(win.box('de')).toHaveCount(0);
            await win.cancel();
        } finally {
            await new SiteLanguagesList(ap).restore();
        }
    });

    test('S2: disabling and enabling a site language @solo', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(5 * SITE_CHANGE);
        const tagA = makeTag(2, testInfo);
        const tagB = `${tagA}de`;
        const ap = await signedIn(asUser, 'admin');
        const site = new SiteLanguagesList(ap);
        const wizardLabels = {hostedLabel: HOSTED, setupTab: WIZARD_TAB};
        await site.restore();
        try {
            // Given: German installed and enabled; the first press with
            // English and German everywhere, the second German-primary.
            const installed = await site.install(['de']);
            expect(installed.status()).toBe(200);
            await ompApi.createContext({
                tag: tagA,
                context: {supportedLocales: ['en', 'de'], supportedFormLocales: ['en', 'de'], supportedSubmissionLocales: ['en', 'de']},
            });
            await ompApi.createContext({tag: tagB, context: {primaryLocale: 'de', supportedLocales: ['de', 'en']}});

            // The Settings wizard's "Languages" (Rule 7).
            let wizard = await openWizardLanguages(ap, tagA, wizardLabels);
            await expect(ap.getByRole('heading', {name: 'Settings Wizard', exact: true})).toBeVisible();
            await expect(wizard.website.cell('de', 'uiLocale')).toBeChecked();
            await expect(wizard.website.cell('de', 'formLocale')).toBeChecked();
            await expect(wizard.submission.cell('de', 'submissionLocale')).toBeChecked();
            await expect(wizard.submission.cell('de', 'submissionMetadataLocale')).toBeChecked();

            // "Cancel" on "Disable": German still ticked after a reload (Rule 3).
            await site.goto();
            await site.enableBox('de').click();
            await expect(site.question('Disable')).toContainText(DISABLE_Q);
            await expect(site.questionButton('Disable', 'OK')).toBeVisible();
            await site.answer('Disable', 'Cancel');
            await site.reload();
            await expect(site.enableBox('de')).toBeChecked();

            // German disabled: the notice, its radio grayed out (Fields; Rules 3, 4).
            await site.enableBox('de').click();
            await expect(site.question('Disable')).toBeVisible();
            const disabled = await noticeDuring(ap, DISABLED, () => site.answer('Disable', 'OK'), {timeout: SITE_CHANGE});
            expect(disabled.status()).toBe(200);
            await expect(site.enableBox('de')).not.toBeChecked();
            await expect(site.primaryRadio('de')).toBeDisabled();
            await expect(site.primaryRadio('fr_CA')).toBeEnabled();

            // The first press: no German row on "Website Languages"; the
            // "Submission Languages" row stays, unticked (Rule 3a).
            wizard = await openWizardLanguages(ap, tagA, wizardLabels);
            await expect(wizard.website.row('en')).toBeVisible();
            await expect(wizard.website.row('de')).toHaveCount(0);
            await expect(wizard.submission.row('de')).toBeVisible();
            await expect(wizard.submission.cell('de', 'submissionLocale')).not.toBeChecked();
            await expect(wizard.submission.cell('de', 'submissionMetadataLocale')).not.toBeChecked();

            // The German press: English its primary language now (Rule 3a).
            wizard = await openWizardLanguages(ap, tagB, wizardLabels);
            await expect(wizard.website.cell('en', 'contextPrimary')).toBeChecked();
            await expect(wizard.website.row('de')).toHaveCount(0);

            // German enabled again: no question; the first press's German
            // row back with nothing ticked (Rules 3, 3a).
            await site.goto();
            const enabled = await noticeDuring(
                ap,
                ENABLED,
                () => site.press('de', 'enable', {endpoint: /admin-language-grid\/enable-locale/, timeout: SITE_CHANGE}),
                {timeout: SITE_CHANGE}
            );
            expect(enabled.status()).toBe(200);
            await expect(site.question('Disable')).toHaveCount(0);
            await expect(site.enableBox('de')).toBeChecked();
            wizard = await openWizardLanguages(ap, tagA, wizardLabels);
            await expect(wizard.website.row('de')).toBeVisible();
            await expect(wizard.website.cell('de', 'uiLocale')).not.toBeChecked();
            await expect(wizard.website.cell('de', 'formLocale')).not.toBeChecked();

            // Control: the site's primary language cannot be disabled (Rule 3b).
            await site.goto();
            await site.enableBox('en').click();
            await expect(site.question('Disable')).toContainText(DISABLE_Q);
            await noticeDuring(ap, CANT_DISABLE, () => site.answer('Disable', 'OK'), {timeout: SITE_CHANGE});
            await site.reload();
            await expect(site.enableBox('en')).toBeChecked();
            await expect(site.primaryRadio('en')).toBeChecked();
        } finally {
            await new SiteLanguagesList(ap).restore();
        }
    });

    test("S3: the site's primary language @solo", async ({asUser, ompApi, newVisitor}, testInfo) => {
        test.setTimeout(5 * SITE_CHANGE);
        const tag = makeTag(3, testInfo);
        const nora = `${tag}nora`;
        const ap = await signedIn(asUser, 'admin');
        const site = new SiteLanguagesList(ap);
        await site.restore();
        try {
            // Given: German installed and enabled; Nora with English names only.
            const installed = await site.install(['de']);
            expect(installed.status()).toBe(200);
            await ompApi.createContext({tag, users: [person(nora, 'Nora', 'Lindqvist', ['reader'])]});

            // "Cancel": English stays selected (Rules 3, 4).
            await site.goto();
            await site.primaryRadio('de').click();
            await expect(site.question('Primary locale')).toContainText(PRIMARY_Q);
            await expect(site.questionButton('Primary locale', 'OK')).toBeVisible();
            await site.answer('Primary locale', 'Cancel');
            await expect(site.primaryRadio('en')).toBeChecked();
            await expect(site.primaryRadio('de')).not.toBeChecked();

            // German made primary: the notice; German's row has no arrow,
            // English's offers "Remove" (Rules 4, 5).
            await site.primaryRadio('de').click();
            await expect(site.question('Primary locale')).toBeVisible();
            const primary = await noticeDuring(ap, PRIMARY_DEFINED, () => site.answer('Primary locale', 'OK'), {timeout: SITE_CHANGE});
            expect(primary.status()).toBe(200);
            await site.reload();
            await expect(site.primaryRadio('de')).toBeChecked();
            await expect(site.arrow('de')).toHaveCount(0);
            await expect(site.arrow('en')).toHaveCount(1);
            expect(await site.openRowActions('en')).toEqual(['Remove']);

            // The first visitor, preferring Japanese: the site's home in
            // German (Rules 4, 17, 18; A10 not read).
            const japanese = await newVisitor({language: 'ja'});
            await japanese.goto('/index.php/index');
            await expect(japanese).toHaveURL(siteHome('de'));
            expect(await pageLang(japanese)).toMatch(/^de/);

            // Nora's names copied into German (Side effects).
            const np = await signedIn(asUser, nora);
            const profile = new ProfilePage(np, null);
            await np.goto(profile.url('identity'));
            await expect(profile.form('identity')).toBeVisible({timeout: 30_000});
            await expect(profile.givenName('de')).toHaveValue('Nora');
            await expect(profile.familyName('de')).toHaveValue('Lindqvist');
            await expect(profile.givenName('en')).toHaveValue('Nora');

            // Control: the second visitor, asking for "en", reads English (Rule 18).
            const english = await newVisitor({language: 'en'});
            await english.goto('/index.php/index');
            await expect(english).toHaveURL(siteHome('en'));
            expect(await pageLang(english)).toMatch(/^en/);
        } finally {
            await new SiteLanguagesList(ap).restore();
        }
    });
});
