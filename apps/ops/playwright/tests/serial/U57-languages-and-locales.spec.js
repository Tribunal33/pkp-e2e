// @ts-check
/**
 * @file playwright/tests/serial/U57-languages-and-locales.spec.js
 *
 * Languages & locales — OPS suite, the site-level half: scenarios 1–3 (all
 * common), in OPS vocabulary: "hosted servers", "OPS", Administration ›
 * "Hosted Servers", the Settings Wizard's "Server Settings" tab, the email
 * "Submission Acknowledgement (Pending Moderation)". Scenarios 4–9 run in
 * the parallel suite `../U57-languages-and-locales.spec.js`.
 * Spec: docs/specs/U57-languages-and-locales.md
 *
 * Serial project, alone (PRINCIPLES A7, A9): every scenario changes the
 * site's own language list, which every server of the install reads (Rules
 * 3a, 3c), and a site change re-saves every context (minutes on a fleet
 * after a full run: every wait across one allows `SITE_CHANGE`, each test
 * as many as it makes changes; each test also starts by putting back what
 * a failed earlier run left), so each test carries `@solo` and runs by itself in
 * the `ops-solo` project after the serial one (harness.md "Project
 * chain"). Each test puts back what it changed in a `finally`, even when it
 * fails midway, through the site's own list as the Site Administrator
 * (footnote s): English made the site's primary language again first, then
 * German removed. No harness key installs a site language, so German is
 * installed through "Install Locale" before scenarios 2 and 3 seed their
 * German servers.
 *
 * Deliberately NOT covered (register IDs; a 🐞 is never asserted as the
 * contract, a ❓ is parked, not a gap): A1 🐞 (scenario 2 reads the German
 * submission language unticked after the disable, which Rule 3a states;
 * the extra unticking of languages the site never enabled is not read),
 * A6 🐞, A10 ❓ (scenario 3's first visitor reads the site's home in
 * German, not the servers' names on it), A12 ❓ (the menu's names on "Site
 * Settings" are not read), A13 ❓ (scenario 1 reads the reinstalled German
 * template body only as no longer the server's own text), OMP1 (a press's line; OPS reads
 * "Marked locales may be incomplete." as the spec states). The spec's
 * Coverage section records everything else left out.
 *
 * Seeding (footnote s): the Site Administrator is `admin`; every other
 * account is a throwaway `users[]` entry of `POST scenarios/context`
 * (password the username twice), each scratch preprint server from the
 * same request, its languages set with `context.supportedLocales`,
 * `supportedFormLocales`, `supportedSubmissionLocales` and `primaryLocale`.
 * Signed-in actors are opened through `asUser`; a visitor is a browser
 * context with an empty storage state sending its own `Accept-Language`.
 * The notices at the top right are the admin's, read in `@solo` tests only
 * (parallel lesson 2).
 */
const {test: base, expect} = require('../../support/fixtures.js');
const {WorkflowEmailsSettingsPage} = require('../../../../../shared/playwright/pages/EmailsPages.js');
const {
    SiteLanguagesList,
    JournalLanguagesTab,
    LanguageMenu,
    openWizardLanguages,
    noticeDuring,
    pastModalSlot,
    SITE_CHANGE,
} = require('../../../../../shared/playwright/pages/LanguagesPages.js');

const T = 30_000;
const WIZARD = {hostedLabel: 'Hosted Servers', setupTab: 'Server Settings'};

// ---- the words ----------------------------------------------------------------------
const INSTALLED = 'All selected locale(s) installed and activated.';
const INSTALL_SENTENCE =
    'Select any additional locales to install support for in this system. Locales must be installed before they can be used by hosted servers. See the OPS documentation for information on adding support for new languages.';
const DISABLE_QUESTION = 'Are you sure you want to disable this locale? This may affect any hosted servers currently using the locale.';
const REMOVE_QUESTION = 'Are you sure you want to uninstall this locale? This may affect any hosted servers currently using the locale.';
const PRIMARY_QUESTION =
    "Are you sure you want to change the site primary locale? Users' names, which are required in the site's primary locale, will be copied from the existing primary locale where they are missing.";
const PRIMARY_REFUSED = "This locale is the primary language of the site. You can't disable it until you choose another primary locale.";
const FORM_CHANGED = 'The data on this form has changed. Do you wish to continue without saving?';
const INCOMPLETE = 'Marked locales may be incomplete.';
const SAVED = 'Locale settings saved.';
const ACK_EMAIL = 'Submission Acknowledgement (Pending Moderation)';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u57s${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account of the scratch server, named by the tag. */
function person(tag, key, givenName, familyName, roles) {
    return {username: `${tag}${key}`, givenName, familyName, email: `${tag}${key}@mail.test`, roles};
}

/** A signed-in page for an actor (a fresh `asUser` context). */
async function signedIn(asUser, username) {
    return (await asUser(username)).newPage();
}

/** Visitors: browser contexts with no session, preferring a language. */
const test = base.extend({
    newVisitor: async ({browser, baseURL}, use) => {
        const made = [];
        await use(async ({acceptLanguage} = {}) => {
            const options = {baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'};
            if (acceptLanguage) {
                options.locale = acceptLanguage;
                options.extraHTTPHeaders = {'Accept-Language': acceptLanguage};
            }
            const context = await browser.newContext(options);
            made.push(context);
            return context.newPage();
        });
        for (const context of made) {
            await context.close();
        }
    },
});

/** Answer an open site question "OK": the list's save (200) and its notice. */
async function answerOk(list, title, noticeText) {
    await noticeDuring(
        list.page,
        noticeText,
        async () => {
            const response = await list.answer(title, 'OK');
            expect(response && response.status(), `"${title}" saves`).toBe(200);
        },
        {timeout: SITE_CHANGE}
    );
}

/** "Save" in the "Install Locale" window: the install (200), its notice, the window closed. */
async function saveInstall(win) {
    await noticeDuring(
        win.page,
        INSTALLED,
        async () => {
            const response = await win.save();
            expect(response.status(), 'the install answers').toBe(200);
        },
        {timeout: SITE_CHANGE}
    );
}

/** Install languages through "Install Locale" (a scenario's given): 200 and the notice. */
async function install(list, codes) {
    await noticeDuring(
        list.page,
        INSTALLED,
        async () => {
            const response = await list.install(codes);
            expect(response.status(), 'the install answers').toBe(200);
        },
        {timeout: SITE_CHANGE}
    );
}

/** Press a box of a server's "Website Languages" that saves: 200 and "Locale settings saved.". */
async function pressWebsite(tab, code, column) {
    await noticeDuring(
        tab.page,
        SAVED,
        async () => {
            const {response, alerts} = await tab.pressWebsite(code, column);
            expect(alerts, 'no alert').toEqual([]);
            expect(response.status()).toBe(200);
        },
        {timeout: SITE_CHANGE}
    );
}

/**
 * Put the site back as installed (a test's `finally`): English the primary
 * language again, then German removed, through the list as the admin does.
 */
async function restoreSite(page) {
    const list = new SiteLanguagesList(page);
    await list.makePrimaryIfNot('en');
    await list.removeIfInstalled('de');
    await list.goto();
    expect((await list.codes()).sort(), 'the site as installed').toEqual(['en', 'fr_CA']);
    await expect(list.primaryRadio('en')).toBeChecked();
}

/** The email's default template in "Edit Template", from Settings › Workflow › "Emails". */
async function openAckTemplate(page, contextPath) {
    const tab = new WorkflowEmailsSettingsPage(page, contextPath);
    await tab.goto();
    const manage = await tab.openManageEmails();
    const opened = await manage.openEmail(ACK_EMAIL);
    if (opened.kind === 'several') {
        const [defaultRow] = await manage.templateRowsRead(opened.window);
        await manage.openTemplate(opened.window, defaultRow.name);
    }
    return manage;
}

/** Text of an HTML value without tags. */
const plain = (value) => (value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

test.describe('languages and locales: the site', () => {
    test('S1: installing and removing a site language @solo', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(6 * SITE_CHANGE);
        const tag = makeTag(1, testInfo);
        const manager = person(tag, 'mg', 'Mona', 'Manager', ['manager']);
        await opsApi.createContext({tag, users: [manager]});
        const ap = await signedIn(asUser, 'admin');
        const mp = await signedIn(asUser, manager.username);
        const list = new SiteLanguagesList(ap);
        const tab = new JournalLanguagesTab(mp, tag);
        await restoreSite(ap);
        try {
            // Administration's "Change Language": the site's languages, each
            // named in its own language on Administration's own page (Fields;
            // Rule 20).
            const menu = new LanguageMenu(ap);
            await ap.goto('/index.php/index/en/admin');
            await expect(ap.locator('main h1').first()).toHaveText('Administration');
            expect((await menu.read()).slice(0, 3)).toEqual([
                {text: 'Change Language', ticked: null, heading: true},
                {text: 'English', ticked: true, heading: false},
                {text: 'français', ticked: false, heading: false},
            ]);
            await menu.choose('français', 'fr_CA');
            await expect(ap).toHaveURL(/\/index\.php\/index\/fr_CA\/admin$/);
            await expect(ap.locator('html')).toHaveAttribute('lang', 'fr-CA');
            await expect(ap.locator('main h1').first()).toHaveText('Administration');
            expect((await menu.read()).slice(0, 3)).toEqual([
                {text: 'Changer la langue', ticked: null, heading: true},
                {text: 'English', ticked: false, heading: false},
                {text: 'français', ticked: true, heading: false},
            ]);
            await menu.choose('English', 'en');
            await expect(ap).toHaveURL(/\/index\.php\/index\/en\/admin$/);
            await expect(ap.locator('html')).toHaveAttribute('lang', 'en');
            expect((await menu.read())[0]).toEqual({text: 'Change Language', ticked: null, heading: true});

            // The site's list (Fields; Rules 5, 6).
            await list.goto();
            await expect(list.title).toHaveText('Languages');
            expect(await list.columns()).toEqual(['Enable', 'Locale', 'Code', 'Primary locale']);
            expect((await list.codes()).sort()).toEqual(['en', 'fr_CA']);
            expect(await list.localeAndCode('en')).toEqual({locale: 'English/English', code: 'en'});
            await expect(list.enableBox('en')).toBeChecked();
            await expect(list.primaryRadio('en')).toBeChecked();
            await expect(list.arrow('en')).toHaveCount(0);
            expect(await list.localeAndCode('fr_CA')).toEqual({locale: 'French/français *', code: 'fr_CA'});
            await expect(list.enableBox('fr_CA')).toBeChecked();
            await expect(list.primaryRadio('fr_CA')).not.toBeChecked();
            expect(await list.openRowActions('fr_CA')).toEqual(['Remove']);
            await expect(list.footLine(INCOMPLETE)).toBeVisible();

            // "Install Locale" left unsaved (Fields).
            let win = await list.openInstall();
            await expect(win.dialog.getByRole('heading', {name: 'Install Locale'})).toBeVisible();
            await expect(win.group).toContainText(INSTALL_SENTENCE);
            await expect(win.boxByLabel('German/Deutsch (de)')).toBeVisible();
            await expect(win.box('es')).toHaveCount(1);
            await expect(win.box('en')).toHaveCount(0);
            await expect(win.box('fr_CA')).toHaveCount(0);
            await expect(win.cancelButton).toBeVisible();
            await expect(win.saveButton).toBeVisible();
            await win.box('de').check();
            await win.box('de').blur();
            expect(await win.closeAnswering('dismiss')).toBe(FORM_CHANGED);
            await expect(win.form).toBeVisible();
            expect(await win.closeAnswering('accept')).toBe(FORM_CHANGED);
            await expect(win.form).toBeHidden({timeout: T});
            expect((await list.codes()).sort()).toEqual(['en', 'fr_CA']);

            // "Save" with nothing ticked (Rule 2).
            win = await list.openInstall();
            await expect(win.box('de')).not.toBeChecked();
            await saveInstall(win);
            await list.goto();
            expect((await list.codes()).sort()).toEqual(['en', 'fr_CA']);

            // German installed (Rules 2, 6).
            win = await list.openInstall();
            await win.box('de').check();
            await saveInstall(win);
            await list.goto();
            expect((await list.codes()).sort()).toEqual(['de', 'en', 'fr_CA']);
            expect(await list.localeAndCode('de')).toEqual({locale: 'German/Deutsch *', code: 'de'});
            await expect(list.enableBox('de')).toBeChecked();
            await expect(list.primaryRadio('de')).not.toBeChecked();

            // The server's list (Rule 2).
            await tab.goto();
            await expect(tab.website.row('de')).toContainText('German/Deutsch');
            await expect(tab.website.cell('de', 'uiLocale')).not.toBeChecked();
            await expect(tab.website.cell('de', 'formLocale')).not.toBeChecked();

            // The German email texts (Side effects; U56 Rule 20).
            await pressWebsite(tab, 'de', 'formLocale');
            await expect(tab.website.cell('de', 'formLocale')).toBeChecked();
            let manage = await openAckTemplate(mp, tag);
            await expect(manage.languageButton('German')).toBeVisible();
            await manage.languageButton('German').click();
            await manage.typeBody('Unser Text.', {locale: 'de'});
            await manage.saveTemplate();

            // "Cancel" on "Remove" (Rules 3, 5).
            await list.goto();
            await list.pressRemove('de');
            const q = list.question('Remove');
            await expect(q.getByRole('heading', {name: 'Remove'})).toBeVisible();
            await expect(q).toContainText(REMOVE_QUESTION);
            await expect(list.questionButton('Remove', 'OK')).toBeVisible();
            await list.answer('Remove', 'Cancel');
            await expect(list.row('de')).toBeVisible();

            // German removed (Rules 3a, 5).
            await list.pressRemove('de');
            await answerOk(list, 'Remove', 'German/Deutsch locale uninstalled.');
            await expect(list.row('de')).toHaveCount(0);
            await list.goto();
            expect((await list.codes()).sort()).toEqual(['en', 'fr_CA']);
            await tab.goto();
            await expect(tab.website.row('en')).toBeVisible();
            await expect(tab.website.row('de')).toHaveCount(0);

            // German installed again: the server's own text gone (Rules 2, 5; Side effects).
            win = await list.openInstall();
            await expect(win.box('de')).toHaveCount(1);
            await win.box('de').check();
            await saveInstall(win);
            await tab.goto();
            await expect(tab.website.row('de')).toBeVisible();
            await expect(tab.website.cell('de', 'uiLocale')).not.toBeChecked();
            await expect(tab.website.cell('de', 'formLocale')).not.toBeChecked();
            await pressWebsite(tab, 'de', 'formLocale');
            manage = await openAckTemplate(mp, tag);
            await manage.languageButton('German').click();
            // Only that the server's own text is gone is read: whether the
            // German box is empty rests on A13.
            expect(plain(await manage.bodyHtml('de'))).not.toContain('Unser Text.');

            // Control: "Install Locale" no longer offers German (Fields).
            await list.goto();
            win = await list.openInstall();
            await expect(win.box('es')).toHaveCount(1);
            await expect(win.box('de')).toHaveCount(0);
            await win.cancel();
        } finally {
            await restoreSite(ap);
        }
    });

    test('S2: disabling and enabling a site language @solo', async ({asUser, opsApi}, testInfo) => {
        test.setTimeout(5 * SITE_CHANGE);
        const tag1 = makeTag(2, testInfo);
        const tag2 = `${tag1}d`;
        const ap = await signedIn(asUser, 'admin');
        const list = new SiteLanguagesList(ap);
        await restoreSite(ap);
        try {
            // The given: German installed, then the two servers (footnote s).
            await install(list, ['de']);
            await opsApi.createContext({
                tag: tag1,
                context: {supportedLocales: ['en', 'de'], supportedFormLocales: ['en', 'de'], supportedSubmissionLocales: ['en', 'de']},
            });
            await opsApi.createContext({tag: tag2, context: {primaryLocale: 'de', supportedLocales: ['de', 'en']}});

            // The Settings wizard (Rule 7).
            let wizard = await openWizardLanguages(ap, tag1, WIZARD);
            await expect(ap.locator('main h1').first()).toHaveText('Settings Wizard');
            await expect(wizard.website.cell('de', 'uiLocale')).toBeChecked();
            await expect(wizard.website.cell('de', 'formLocale')).toBeChecked();
            await expect(wizard.submission.cell('de', 'submissionLocale')).toBeChecked();
            await expect(wizard.submission.cell('de', 'submissionMetadataLocale')).toBeChecked();

            // "Cancel" on "Disable" (Rule 3).
            await list.goto();
            await list.enableBox('de').click();
            await expect(list.question('Disable')).toContainText(DISABLE_QUESTION);
            await expect(list.questionButton('Disable', 'OK')).toBeVisible();
            await list.answer('Disable', 'Cancel');
            await list.reload();
            await expect(list.enableBox('de')).toBeChecked();

            // German disabled (Fields; Rules 3, 4).
            await list.enableBox('de').click();
            await expect(list.question('Disable')).toBeVisible();
            await answerOk(list, 'Disable', 'Locale disabled.');
            await expect(list.enableBox('de')).not.toBeChecked();
            await expect(list.primaryRadio('de')).toBeDisabled();
            await expect(list.primaryRadio('fr_CA')).toBeEnabled();

            // The first server (Rule 3a).
            wizard = await openWizardLanguages(ap, tag1, WIZARD);
            await expect(wizard.website.row('en')).toBeVisible();
            await expect(wizard.website.row('de')).toHaveCount(0);
            await expect(wizard.submission.row('de')).toBeVisible();
            await expect(wizard.submission.cell('de', 'submissionLocale')).not.toBeChecked();
            await expect(wizard.submission.cell('de', 'submissionMetadataLocale')).not.toBeChecked();

            // The German server: English its primary language (Rule 3a).
            wizard = await openWizardLanguages(ap, tag2, WIZARD);
            await expect(wizard.website.cell('en', 'contextPrimary')).toBeChecked();
            await expect(wizard.website.row('de')).toHaveCount(0);

            // German enabled again, with no question (Rules 3, 3a).
            await list.goto();
            const questions = [];
            const onDialog = (d) => {
                questions.push(d.message());
                d.dismiss().catch(() => {});
            };
            ap.on('dialog', onDialog);
            await noticeDuring(
                ap,
                'Locale enabled.',
                async () => {
                    const response = await list.press('de', 'enable', {endpoint: /admin-language-grid\//, timeout: SITE_CHANGE});
                    expect(response.status()).toBe(200);
                },
                {timeout: SITE_CHANGE}
            );
            ap.off('dialog', onDialog);
            expect(questions).toEqual([]);
            await expect(list.question('Disable')).toHaveCount(0);
            await expect(list.enableBox('de')).toBeChecked();
            wizard = await openWizardLanguages(ap, tag1, WIZARD);
            await expect(wizard.website.row('de')).toBeVisible();
            await expect(wizard.website.cell('de', 'uiLocale')).not.toBeChecked();
            await expect(wizard.website.cell('de', 'formLocale')).not.toBeChecked();

            // Control: the site's primary language cannot be disabled (Rule 3b).
            await list.goto();
            await list.enableBox('en').click();
            await expect(list.question('Disable')).toBeVisible();
            await answerOk(list, 'Disable', PRIMARY_REFUSED);
            await list.reload();
            await expect(list.enableBox('en')).toBeChecked();
            await expect(list.primaryRadio('en')).toBeChecked();
        } finally {
            await restoreSite(ap);
        }
    });

    test('S3: the site\'s primary language @solo', async ({asUser, opsApi, newVisitor}, testInfo) => {
        test.setTimeout(5 * SITE_CHANGE);
        const tag = makeTag(3, testInfo);
        const nora = {username: `${tag}nora`, givenName: 'Nora', familyName: 'Lindqvist', email: `${tag}nora@mail.test`, roles: ['reader']};
        const ap = await signedIn(asUser, 'admin');
        const list = new SiteLanguagesList(ap);
        await restoreSite(ap);
        try {
            // The given: German installed, then Nora's server (footnote s).
            await install(list, ['de']);
            await opsApi.createContext({tag, users: [nora]});

            // "Cancel" (Rules 3, 4).
            await list.goto();
            await list.primaryRadio('de').click();
            await expect(list.question('Primary locale')).toContainText(PRIMARY_QUESTION);
            await expect(list.questionButton('Primary locale', 'OK')).toBeVisible();
            await list.answer('Primary locale', 'Cancel');
            await expect(list.primaryRadio('en')).toBeChecked();
            await expect(list.primaryRadio('de')).not.toBeChecked();

            // German made primary (Rules 4, 5).
            await pastModalSlot(ap);
            await list.primaryRadio('de').click();
            await expect(list.question('Primary locale')).toBeVisible();
            await answerOk(list, 'Primary locale', 'German/Deutsch defined as primary locale.');
            await list.goto();
            await expect(list.primaryRadio('de')).toBeChecked();
            await expect(list.arrow('de')).toHaveCount(0);
            expect(await list.openRowActions('en')).toEqual(['Remove']);

            // The first visitor, preferring Japanese: the site's home in German (Rules 4, 17, 18).
            const v1 = await newVisitor({acceptLanguage: 'ja'});
            await v1.goto('/index.php/index');
            await expect(v1).toHaveURL(/\/index\.php\/index\/de(\/index)?\/?$/);
            await expect(v1.locator('html')).toHaveAttribute('lang', 'de');

            // Nora's names, copied into German (Side effects).
            const np = await signedIn(asUser, nora.username);
            await np.goto('/index.php/index/user/profile');
            await expect(np.locator('input[name="givenName[de]"]')).toHaveValue('Nora', {timeout: T});
            await expect(np.locator('input[name="familyName[de]"]')).toHaveValue('Lindqvist');
            await expect(np.locator('input[name="givenName[en]"]')).toHaveValue('Nora');

            // Control: the second visitor ("en") reads English (Rule 18).
            const v2 = await newVisitor({acceptLanguage: 'en'});
            await v2.goto('/index.php/index');
            await expect(v2).toHaveURL(/\/index\.php\/index\/en(\/index)?\/?$/);
            await expect(v2.locator('html')).toHaveAttribute('lang', 'en');
        } finally {
            await restoreSite(ap);
        }
    });
});
