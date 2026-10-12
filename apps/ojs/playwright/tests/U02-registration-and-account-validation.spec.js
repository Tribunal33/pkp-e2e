// @ts-check
/**
 * @file playwright/tests/U02-registration-and-account-validation.spec.js
 *
 * Registration & account validation — OJS suite, one test per canonical
 * scenario the spec runs on OJS (scenarios 1–8, all common; the spec lists
 * no OJS-specific scenario).
 * Spec: docs/specs/U02-registration-and-account-validation.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞,
 * A2 🐞, A3 🐞, A4 🐞, A5 ❓, A6 🐞, A7 ❓. Where a test passes through one
 * (S7 walks the two activation pages, S5 opens the site-level page beside a
 * closed journal, S7 sets the support contact first) it asserts the effect
 * the spec states and leaves the finding's own claim unasserted either way.
 * The spec's Coverage section records everything else left out.
 *
 * Isolation: every registration uses a throwaway username (`u02<scenario>ojs…`)
 * on the seeded journal or on a scratch journal; settings change only on
 * scratch journals, through the manager's own screens. Every registration,
 * and every sign-in that follows one, happens in a browser context the test
 * opens itself, never through the shared .auth cache. S6's two reviewing
 * interests carry the test's tag: a word two accounts typed on the
 * site-level page is stored once per account (Rule 8). Mailpit reads are
 * scoped by the throwaway address (PRINCIPLES A8). S7 navigates explicitly
 * to the validation-variant server (`variants.validation`, PRINCIPLES D9),
 * which shares the fleet's database. No hard-coded waits.
 */
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {
    RegisterPage,
    RegistrationCompletePage,
    ProfileRolesTab,
    ProfileNotificationsTab,
    ProfileNameTabs,
    ActivationPage,
    PUBLIC_ANNOUNCEMENT_SETTINGS,
    siteHeader,
    loginFormRegisterLink,
} = require('../pages/RegistrationPages.js');
const {waitForContextSettingsSave} = require('../pages/PublicationMetadataPages.js');
const {expectTextsInAnyOrder} = require('../../../../shared/playwright/support/order.js');

const JOURNAL = 'publicknowledge';
const JOURNAL_NAME = 'Journal of Public Knowledge';
const CONSENT_ERROR = 'You must agree to the terms of the privacy statement.';
const USERNAME_TAKEN = 'The selected username is already in use by another user.';
const EMAIL_TAKEN = 'The selected email address is already in use by another user.';
const PASSWORDS_MISMATCH = 'The passwords do not match.';
const PASSWORD_TOO_SHORT = 'The password must be at least 6 characters.';
const SPAM_CHECK_ERROR = 'You must complete the validation check used to prevent spam submissions.';
const ACCESS_DENIED = 'The current role does not have access to this operation.';
const CLOSED_MESSAGE = 'This journal is currently not accepting user registrations.';
const CLOSED_OPTION = /^The Journal Manager will register all user accounts/;
const CONTEXT_CONSENT =
    "Yes, I agree to have my data collected and stored according to this journal's privacy statement.";
// Site-level page: the role boxes under a default journal, and the words a
// screen reader reads before them (not on screen).
const SITE_ROLE_BOXES = ['Reader', 'Reviewer'];
const ROLES_PROMPT = 'Request the following roles.';
const AWAITING_VERIFICATION = 'Registration awaiting verification';
const VALIDATION_INTRO =
    'but before you can start using it, you need to validate your email account. To do this, simply follow the link below:';
const ACTIVATION_LINK = /https?:\/\/[^\s<>"']+\/invitation\/accept\?[^\s<>"']+/;

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u02${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway registrant: the tag doubles as a valid username. */
function registrant(tag) {
    return {username: tag, email: `${tag}@mail.test`, password: `Pass${tag}`};
}

/** A fresh, explicitly-anonymous context (never inherits cached storage state). */
async function anonContext(browser, baseURL, options = {}) {
    return browser.newContext({baseURL, storageState: {cookies: [], origins: []}, ...options});
}

/**
 * Fill the whole journal-level form for a fresh registrant and tick the
 * privacy consent; the caller presses "Register".
 */
async function fillJournalForm(register, who, profile = {}) {
    await register.fillProfile(profile);
    await register.fillLogin(who);
    await register.privacyConsent.check();
}

/** The scratch journal's Settings screen, one tab, as the manager. */
async function openSettingsTab(managerPage, contextPath, screen, tabId) {
    await managerPage.goto(`/index.php/${contextPath}/management/settings/${screen}`);
    await managerPage.locator(`#${tabId}-button`).click();
}

/** Press the Save of the Vue settings form holding `anchor`, wait for the write and "Saved". */
async function saveSettingsForm(managerPage, anchor) {
    const saved = waitForContextSettingsSave(managerPage);
    await managerPage
        .locator('form')
        .filter({has: anchor})
        .getByRole('button', {name: 'Save', exact: true})
        .click();
    await saved;
    await expect(managerPage.locator('[role="status"]:has-text("Saved")')).toBeVisible({
        timeout: 30_000,
    });
}

/**
 * On a server with the ALTCHA check on, the Login form's widget verifies on
 * submit and posts the form itself (spec, "Spam check"); wait only for the
 * widget's script to be live before pressing.
 */
async function spamCheckReady(page) {
    if ((await page.locator('altcha-widget').count()) > 0) {
        await page.waitForFunction(() => !!customElements.get('altcha-widget'), undefined, {
            timeout: 30_000,
        });
    }
}

/** Sign in on a Login page of the validation-variant server (ALTCHA on). */
async function signInWithSpamCheck(page, loginUrl, who) {
    const loginPage = new LoginPage(page);
    await page.goto(loginUrl);
    await loginPage.expectForm();
    await loginPage.usernameInput.fill(who.username);
    await loginPage.fillPassword(who.password);
    await spamCheckReady(page);
    await loginPage.submitButton.click();
}

/**
 * The one "Validate Your Account" message for an address: its summary, and
 * the activation link it carries, unescaped (Rule 12).
 */
async function validationMail(pkpMail, email, origin) {
    const summary = await pkpMail.find({to: email, subject: 'Validate Your Account'});
    const full = await pkpMail.fullMessage(summary.ID);
    const body = full.Text || full.HTML;
    expect(body).toContain(VALIDATION_INTRO);
    const match = body.match(ACTIVATION_LINK);
    expect(match, 'activation link present in the email').toBeTruthy();
    const link = match[0].replace(/&amp;/g, '&');
    expect(link.startsWith(origin)).toBe(true);
    return {summary, body, link};
}

test.describe('registration & account validation', () => {
    test('S1: register with a journal and land on the completion page', {tag: '@smoke'}, async ({page, browser, baseURL, pkpMail}, testInfo) => {
        test.slow();
        const who = registrant(makeTag('s1', testInfo));

        // From the journal's homepage, the header's "Register" opens the form
        // (Rule 1).
        await page.goto(`/index.php/${JOURNAL}`);
        await siteHeader(page).getByRole('link', {name: 'Register', exact: true}).click();
        const register = new RegisterPage(page, JOURNAL);
        await register.expectForm();
        await expect(page).toHaveURL(/\/user\/register/);
        await expect(page.getByText('Required fields are marked with an asterisk: *')).toBeVisible();

        // The notification box arrives unticked and is left so (Rule 6); the
        // privacy consent beside it is ticked by fillJournalForm.
        await expect(register.emailConsent).toBeVisible();
        await expect(register.emailConsent).not.toBeChecked();
        await fillJournalForm(register, who);
        await expect(register.emailConsent).not.toBeChecked();
        await register.submitButton.click();

        // "Registration complete" with its three links and no "View
        // Submissions" (Rules 9–10).
        const complete = new RegistrationCompletePage(page);
        await complete.expectOpen();
        await complete.expectLinks(['Make a New Submission', 'Edit My Profile', 'Continue Browsing']);
        await expect(complete.link('View Submissions')).toHaveCount(0);

        // Signed in at once: the header shows the username where "Register"
        // and "Login" were.
        await expect(siteHeader(page)).toContainText(who.username);
        await expect(siteHeader(page).getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);
        await expect(siteHeader(page).getByRole('link', {name: 'Login', exact: true})).toHaveCount(0);

        // "Edit My Profile" › Roles: Reader ticked and nothing else (Rule 7).
        await complete.link('Edit My Profile').click();
        const roles = new ProfileRolesTab(page, JOURNAL);
        await roles.open();
        await expect(roles.roleBox('Reader')).toBeChecked();
        await expect(roles.roleBox('Reviewer')).not.toBeChecked();
        await expect(roles.roleBox('Author')).not.toBeChecked();
        await expect(roles.form.locator('input[type="checkbox"]:checked')).toHaveCount(1);

        // › Notifications: the journal's public-announcement emails switched
        // off ("Do not send me an email…" ticked on each Public Announcements
        // row), the in-app notifications themselves still on ("Enable these
        // types of notifications." ticked on every row); no other row's
        // email box is ticked, the positive control of the same read
        // (Rule 6).
        const notifications = new ProfileNotificationsTab(page, JOURNAL);
        await notifications.open();
        for (const setting of PUBLIC_ANNOUNCEMENT_SETTINGS) {
            const pair = notifications.pair(setting);
            await expect(pair.allow).toBeChecked();
            await expect(pair.email).toBeChecked();
        }
        await expect(notifications.checkedEmailBoxes()).toHaveCount(PUBLIC_ANNOUNCEMENT_SETTINGS.length);
        const allow = notifications.allowBoxes();
        expect(await allow.count()).toBeGreaterThan(PUBLIC_ANNOUNCEMENT_SETTINGS.length);
        for (let i = 0; i < (await allow.count()); i++) {
            await expect(allow.nth(i)).toBeChecked();
        }

        // The mail catcher: nothing for the new address, read after the
        // registration's own page loads have settled (mail goes out with the
        // "Register" press or not at all); S7's validation mail is the
        // positive control that the catcher receives this app's mail (Side
        // effects).
        expect(await pkpMail.count({to: who.email})).toBe(0);

        // The second visitor, in a browser of their own: a private address
        // typed signed out shows the Login page; the "Register" link below
        // the form carries the address into the Register form, and the
        // registration continues to the typed address, refused there, not
        // to the completion page (Rule 9).
        const second = registrant(makeTag('s1b', testInfo));
        const secondBrowser = await anonContext(browser, baseURL);
        try {
            const secondPage = await secondBrowser.newPage();
            await secondPage.goto(`/index.php/${JOURNAL}/en/dashboard/mySubmissions`);
            const loginPage = new LoginPage(secondPage);
            await loginPage.expectForm();
            await expect(secondPage).toHaveURL(/\/login/);
            await loginFormRegisterLink(secondPage).click();
            const secondRegister = new RegisterPage(secondPage, JOURNAL);
            await secondRegister.expectForm();
            await expect(secondRegister.sourceField).toHaveValue(/\/dashboard\/mySubmissions$/);
            await fillJournalForm(secondRegister, second);
            await secondRegister.submitButton.click();
            await expect(secondPage).toHaveURL(/\/user\/authorizationDenied/);
            await expect(secondPage.getByText(ACCESS_DENIED)).toBeVisible();
            await expect(new RegistrationCompletePage(secondPage).heading).toHaveCount(0);
            await expect(siteHeader(secondPage)).toContainText(second.username);
        } finally {
            await secondBrowser.close();
        }

        // The third visitor, in a browser of their own: the journal's French
        // Register page (fr_CA where "/en" sits, Rule 1). Only the form's
        // boxes are driven, never the French page's strings; the profile,
        // opened in English, shows the typed name and affiliation in its
        // [en] boxes, the copy into the site's primary language (Rule 16).
        const third = registrant(makeTag('s1c', testInfo));
        const thirdBrowser = await anonContext(browser, baseURL);
        try {
            const thirdPage = await thirdBrowser.newPage();
            const thirdRegister = new RegisterPage(thirdPage, JOURNAL);
            await thirdRegister.gotoLocale('fr_CA');
            await expect(thirdPage).toHaveURL(new RegExp(`/${JOURNAL}/fr_CA/user/register`));
            await expect(thirdRegister.form).toBeVisible();
            await fillJournalForm(thirdRegister, third, {
                givenName: 'Prénom',
                familyName: 'Nom',
                affiliation: 'Laboratoire FR',
            });
            await thirdRegister.submitButton.click();
            await expect(siteHeader(thirdPage)).toContainText(third.username);
            const profile = new ProfileNameTabs(thirdPage, JOURNAL);
            await profile.goto();
            await expect(profile.givenName('en')).toHaveValue('Prénom');
            await expect(profile.familyName('en')).toHaveValue('Nom');
            await profile.openContact();
            await expect(profile.affiliation('en')).toHaveValue('Laboratoire FR');
        } finally {
            await thirdBrowser.close();
        }
    });

    test('S2: the form refuses bad input', async ({page}, testInfo) => {
        const who = registrant(makeTag('s2', testInfo));
        const register = new RegisterPage(page, JOURNAL);
        await register.goto();
        await register.expectForm();
        await register.fillProfile();
        await register.privacyConsent.check();

        // A taken username in capitals, a taken email in capitals, a short
        // password and a different repeat: exactly three lines, in order
        // (Fields & validation, Rule 15).
        await register.fillLogin({
            username: 'Reader.Rosa',
            email: 'READER.ROSA@MAIL.TEST',
            password: 'abc',
            password2: 'abd',
        });
        await register.submitButton.click();
        await register.expectErrors([USERNAME_TAKEN, PASSWORDS_MISMATCH, EMAIL_TAKEN]);
        await expect(register.username).toHaveValue('Reader.Rosa');
        await expect(register.password).toHaveValue('');
        await expect(register.password2).toHaveValue('');

        // A fresh username and email with a password below the site minimum,
        // the same in both boxes: one line.
        await register.privacyConsent.setChecked(true);
        await register.fillLogin({username: who.username, email: who.email, password: 'abc'});
        await register.submitButton.click();
        await register.expectErrors([PASSWORD_TOO_SHORT]);
    });

    test('S3: register as a reviewer', async ({page}, testInfo) => {
        test.slow();
        const who = registrant(makeTag('s3', testInfo));
        const register = new RegisterPage(page, JOURNAL);
        await register.goto();
        await register.expectForm();
        await fillJournalForm(register, who);

        // The single reviewer box; "Reviewing interests" appears once it is
        // ticked (Rule 7).
        await expect(
            register.form.getByText(
                'Yes, I would like to be contacted with requests to review submissions to this journal.'
            )
        ).toBeVisible();
        await expect(register.reviewerOptin).toHaveCount(1);
        await expect(register.reviewerInterests).toBeHidden();
        await register.reviewerOptin.check();
        await expect(register.reviewerInterests).toBeVisible();
        await expect(register.reviewerInterests.getByText('Reviewing interests')).toBeVisible();
        await register.interests.fill('ethics, statistics');
        await register.submitButton.click();

        // The completion page now leads with "View Submissions", which opens
        // the reviewer's list headed "Action Required by me" (Rule 10).
        const complete = new RegistrationCompletePage(page);
        await complete.expectOpen();
        await complete.expectLinks([
            'View Submissions',
            'Make a New Submission',
            'Edit My Profile',
            'Continue Browsing',
        ]);
        await complete.link('View Submissions').click();
        await expect(page.getByRole('heading', {name: /^Action Required by me/})).toBeVisible({
            timeout: 30_000,
        });

        // Roles: Reviewer ticked, Reader not, both interests listed separately.
        const roles = new ProfileRolesTab(page, JOURNAL);
        await roles.goto();
        await expect(roles.roleBox('Reviewer')).toBeChecked();
        await expect(roles.roleBox('Reader')).not.toBeChecked();
        // In either order: the interests are read with no ORDER BY (fix list B).
        await expectTextsInAnyOrder(roles.interestChips, ['ethics', 'statistics']);
    });

    test('S4: privacy consent is required when a statement exists', async ({page, context, browser, baseURL, ojsApi, asUser}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const manager = `mgr${tag}`;
        const first = registrant(tag);
        const second = registrant(`${tag}b`);
        await ojsApi.createContext({tag, users: [{username: manager, roles: ['manager']}]});

        // A new journal comes with the default statement, so the box is there
        // and "privacy statement" opens the journal's page in a new tab
        // (Rule 5).
        const register = new RegisterPage(page, tag);
        await register.goto();
        await register.expectForm();
        await expect(register.privacyConsent).toBeVisible();
        const [statementTab] = await Promise.all([
            context.waitForEvent('page'),
            register.privacyStatementLink.click(),
        ]);
        await expect(statementTab.getByRole('heading', {name: 'Privacy Statement'})).toBeVisible();
        await expect(statementTab).toHaveURL(new RegExp(`/${tag}/(en/)?about/privacy`));
        await statementTab.close();

        // Unticked: refused with one line; ticked and retyped: complete.
        await register.fillProfile();
        await register.fillLogin(first);
        await register.submitButton.click();
        await register.expectErrors([CONSENT_ERROR]);
        await register.privacyConsent.check();
        await register.password.fill(first.password);
        await register.password2.fill(first.password);
        await register.submitButton.click();
        await new RegistrationCompletePage(page).expectOpen();

        // The Journal Manager empties the statement (Settings › Website ›
        // Setup › Privacy Statement) and saves.
        const managerPage = await (await asUser(manager)).newPage();
        await openSettingsTab(managerPage, tag, 'website', 'setup');
        await managerPage.locator('#privacy-button').click();
        const editorId = 'privacy-privacyStatement-control-en';
        await managerPage.waitForFunction(
            (id) => !!window.tinymce?.get(id)?.initialized,
            editorId,
            {timeout: 30_000}
        );
        await managerPage.evaluate((id) => {
            const editor = window.tinymce.get(id);
            editor.setContent('');
            editor.fire('change');
        }, editorId);
        await saveSettingsForm(managerPage, managerPage.locator(`#${editorId}`));

        // A visitor, signed out: the box is absent (the notification box beside
        // it is the positive control) and the same form registers without it.
        const visitor = await anonContext(browser, baseURL);
        try {
            const visitorPage = await visitor.newPage();
            const again = new RegisterPage(visitorPage, tag);
            await again.goto();
            await again.expectForm();
            await expect(again.emailConsent).toBeVisible();
            await expect(again.privacyConsent).toHaveCount(0);
            await again.fillProfile();
            await again.fillLogin(second);
            await again.submitButton.click();
            await new RegistrationCompletePage(visitorPage).expectOpen();
        } finally {
            await visitor.close();
        }
    });

    test('S5: closed registration', async ({page, ojsApi, asUser}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const disabledTag = `${tag}d`;
        const manager = `mgr${tag}`;
        await ojsApi.createContext({tag, users: [{username: manager, roles: ['manager']}]});
        // A second scratch journal, disabled since its creation.
        await ojsApi.createContext({tag: disabledTag, context: {enabled: false}});

        // The Journal Manager closes registration (Settings › Users & Roles ›
        // Site Access Options).
        const managerPage = await (await asUser(manager)).newPage();
        await openSettingsTab(managerPage, tag, 'access', 'access');
        const closedOption = managerPage.getByRole('radio', {name: CLOSED_OPTION});
        await expect(closedOption).toBeVisible({timeout: 30_000});
        await closedOption.check();
        await saveSettingsForm(managerPage, closedOption);

        // Still signed in, the closed journal's Register address: the
        // completion page, "Make a New Submission" included, never the
        // closed message or the form (Rule 4).
        const managerRegister = new RegisterPage(managerPage, tag);
        await managerRegister.goto();
        const managerComplete = new RegistrationCompletePage(managerPage);
        await managerComplete.expectOpen();
        await expect(managerComplete.link('Make a New Submission')).toBeVisible();
        await expect(managerPage.getByText(CLOSED_MESSAGE)).toHaveCount(0);
        await expect(managerRegister.form).toHaveCount(0);

        // The disabled journal's Register address: the completion page even
        // there, no Login form (Rules 2 and 4).
        const disabledRegister = new RegisterPage(managerPage, disabledTag);
        await disabledRegister.goto();
        await managerComplete.expectOpen();
        await expect(managerComplete.link('Make a New Submission')).toBeVisible();
        await expect(managerPage.locator('form#login')).toHaveCount(0);
        await expect(disabledRegister.form).toHaveCount(0);

        // The visitor, signed out, in a browser of their own: the header and
        // the Login page offer no "Register" (Rule 2); "Login" and "Forgot
        // your password?" are the positive controls.
        await page.goto(`/index.php/${tag}`);
        await expect(siteHeader(page).getByRole('link', {name: 'Login', exact: true})).toBeVisible();
        await expect(siteHeader(page).getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);
        await page.goto(`/index.php/${tag}/login`);
        await expect(page.locator('form#login')).toBeVisible();
        await expect(page.getByRole('main').getByRole('link', {name: 'Forgot your password?'})).toBeVisible();
        await expect(loginFormRegisterLink(page)).toHaveCount(0);
        await expect(page.getByRole('main').getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);

        // The typed Register address answers the closed page with a "Login"
        // link and no form.
        const register = new RegisterPage(page, tag);
        await register.goto();
        await expect(register.heading).toBeVisible();
        await expect(page.getByText(CLOSED_MESSAGE)).toBeVisible();
        await expect(page.getByRole('main').getByRole('link', {name: 'Login', exact: true})).toBeVisible();
        await expect(register.form).toHaveCount(0);

        // The disabled journal's Register address: the journal's Login page
        // instead, and its own "Register" links, the header's and the one
        // below the form, lead straight back to that Login page, with no
        // word that the journal is disabled (Rule 2).
        const loginPage = new LoginPage(page);
        const disabledLogin = new RegExp(`/index\\.php/${disabledTag}/(en/)?login/?(\\?|$)`);
        await new RegisterPage(page, disabledTag).goto();
        await expect(page).toHaveURL(disabledLogin);
        await loginPage.expectForm();
        await expect(page.locator('form#register')).toHaveCount(0);
        await expect(page.getByText(CLOSED_MESSAGE)).toHaveCount(0);
        await expect(page.getByRole('main')).not.toContainText(/disabled/i);
        await siteHeader(page).getByRole('link', {name: 'Register', exact: true}).click();
        await expect(page).toHaveURL(disabledLogin);
        await loginPage.expectForm();
        await expect(page.locator('form#register')).toHaveCount(0);
        await loginFormRegisterLink(page).click();
        await expect(page).toHaveURL(disabledLogin);
        await loginPage.expectForm();
        await expect(page.locator('form#register')).toHaveCount(0);
        await expect(page.getByRole('main')).not.toContainText(/disabled/i);

        // The site homepage's "Register" still opens the site-level page: the
        // seeded journal is still open.
        await page.goto('/index.php/index');
        await siteHeader(page).getByRole('link', {name: 'Register', exact: true}).click();
        const siteRegister = new RegisterPage(page, null);
        await siteRegister.expectForm();
        await expect(page).toHaveURL(/\/index\/(en\/)?user\/register/);
        await expect(siteRegister.contextsLegend).toBeVisible();
    });

    test('S6: register from the site homepage with roles in two journals', async ({page, browser, baseURL, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const who = registrant(tag);
        const second = registrant(`${tag}b`);
        const scratchName = `Scratch journal ${tag}`;
        const interests = [`glacier${tag}`, `ethics${tag}`];
        await ojsApi.createContext({tag, context: {name: {en: scratchName}}});

        // The site homepage (the journal list) › "Register" (Rule 1).
        await page.goto('/index.php/index');
        await siteHeader(page).getByRole('link', {name: 'Register', exact: true}).click();
        const register = new RegisterPage(page, null);
        await register.expectForm();
        await expect(register.contextsLegend).toBeVisible();

        // Both journals are listed by name, each with its role boxes under
        // the name. "Request the following roles." is not on screen: a
        // screen reader reads it before each journal's boxes.
        const seededBlock = register.contextBlock(JOURNAL_NAME);
        const scratchBlock = register.contextBlock(scratchName);
        await expect(seededBlock).toHaveCount(1);
        await expect(scratchBlock).toHaveCount(1);
        await register.expectContextListed(seededBlock, JOURNAL_NAME, SITE_ROLE_BOXES);
        await register.expectContextListed(scratchBlock, scratchName, SITE_ROLE_BOXES);
        await register.expectRolesPromptForScreenReaderOnly(seededBlock, ROLES_PROMPT, SITE_ROLE_BOXES);
        await register.expectRolesPromptForScreenReaderOnly(scratchBlock, ROLES_PROMPT, SITE_ROLE_BOXES);

        // Before anything is ticked: no consent line under either journal
        // (Rule 5); the role boxes themselves are on screen (the positive
        // control of the same read). The site has no statement of its own,
        // so no site consent box either.
        await expect(register.contextRoleBox(seededBlock, 'Reader')).toBeVisible();
        await expect(register.contextRoleBox(scratchBlock, 'Reviewer')).toBeVisible();
        await register.expectConsentHidden(seededBlock);
        await register.expectConsentHidden(scratchBlock);
        await expect(register.visibleConsentLines()).toHaveCount(0);
        await expect(register.siteConsent).toHaveCount(0);

        // Reader under one, Reviewer under the other; each journal's consent
        // line appears the moment a role is ticked (Rules 5, 8).
        const seededConsent = register.contextConsent(seededBlock);
        await register.contextRoleBox(seededBlock, 'Reader').check();
        await register.expectConsentShown(seededBlock);
        await expect(seededConsent).toContainText(CONTEXT_CONSENT);
        await register.expectConsentHidden(scratchBlock);
        await register.contextConsentBox(seededBlock).check();
        await register.contextRoleBox(scratchBlock, 'Reviewer').check();
        await register.expectConsentShown(scratchBlock);
        await register.contextConsentBox(scratchBlock).check();
        await expect(register.visibleConsentLines()).toHaveCount(2);

        // The interests box under "If you requested to be a reviewer on any
        // journal, please enter your subject interests.": empty as it
        // arrives, then two interests typed with a comma and a space between
        // them, each word carrying the test's tag so that no other account
        // holds it (Rule 8).
        await expect(register.siteInterests).toBeVisible();
        await expect(register.siteInterests).toHaveValue('');
        await register.siteInterests.fill(interests.join(', '));
        await expect(register.siteInterests).toHaveValue(`${interests[0]}, ${interests[1]}`);

        await register.fillProfile();
        await register.fillLogin(who);
        await register.submitButton.click();

        // Site-level completion: two links only, no "Make a New Submission"
        // and no "View Submissions" though a Reviewer role was ticked
        // (Rule 10).
        const complete = new RegistrationCompletePage(page);
        await complete.expectOpen();
        await complete.expectLinks(['Edit My Profile', 'Continue Browsing']);

        // "Edit My Profile" › Roles lists every journal; exactly the ticked
        // roles are held, in their journals (Rule 8).
        await complete.link('Edit My Profile').click();
        const roles = new ProfileRolesTab(page, null);
        await roles.open();
        const seededRoles = roles.journalSection(JOURNAL_NAME);
        const scratchRoles = roles.journalSection(scratchName);
        await expect(seededRoles.getByRole('checkbox', {name: 'Reader', exact: true})).toBeChecked();
        await expect(seededRoles.getByRole('checkbox', {name: 'Reviewer', exact: true})).not.toBeChecked();
        await expect(scratchRoles.getByRole('checkbox', {name: 'Reviewer', exact: true})).toBeChecked();
        await expect(scratchRoles.getByRole('checkbox', {name: 'Reader', exact: true})).not.toBeChecked();
        await expect(roles.checkedBoxes()).toHaveCount(2);

        // The same tab's "Reviewing interests": the two typed interests,
        // each listed once (Rule 8).
        await roles.expectInterests(interests);

        // The second visitor, in a browser of their own: the site-level page
        // with no journal and no role ticked shows no consent line and
        // registers with no consent at all (Rule 5); the completion page's
        // two links again; the Roles tab shows no role ticked in any journal
        // (Rule 8), the journals' boxes being there (the positive control).
        const secondBrowser = await anonContext(browser, baseURL);
        try {
            const secondPage = await secondBrowser.newPage();
            const secondRegister = new RegisterPage(secondPage, null);
            await secondRegister.goto();
            await secondRegister.expectForm();
            await expect(secondRegister.contextsLegend).toBeVisible();
            const secondSeeded = secondRegister.contextBlock(JOURNAL_NAME);
            const secondScratch = secondRegister.contextBlock(scratchName);
            await expect(secondRegister.contextRoleBox(secondSeeded, 'Reader')).toBeVisible();
            await expect(secondRegister.contextRoleBox(secondScratch, 'Reviewer')).toBeVisible();
            await expect(secondRegister.form.locator('input[type="checkbox"]:checked')).toHaveCount(0);
            await secondRegister.expectConsentHidden(secondSeeded);
            await secondRegister.expectConsentHidden(secondScratch);
            await expect(secondRegister.visibleConsentLines()).toHaveCount(0);
            await expect(secondRegister.siteConsent).toHaveCount(0);
            await secondRegister.fillProfile();
            await secondRegister.fillLogin(second);
            await secondRegister.submitButton.click();
            const secondComplete = new RegistrationCompletePage(secondPage);
            await secondComplete.expectOpen();
            await secondComplete.expectLinks(['Edit My Profile', 'Continue Browsing']);
            await expect(siteHeader(secondPage)).toContainText(second.username);

            // The Roles tab, through the profile address of the seeded
            // journal.
            const secondRoles = new ProfileRolesTab(secondPage, JOURNAL);
            await secondRoles.goto();
            await expect(secondRoles.roleBox('Reader')).toHaveCount(1);
            await expect(secondRoles.form.getByText(scratchName)).toHaveCount(1);
            expect(await secondRoles.allBoxes().count()).toBeGreaterThan(3);
            await expect(secondRoles.checkedBoxes()).toHaveCount(0);
        } finally {
            await secondBrowser.close();
        }
    });

    test('S7: email validation', async ({browser, baseURL, variants, ojsApi, asUser, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const manager = `mgr${tag}`;
        const who = registrant(tag);
        const second = registrant(`${tag}b`);
        const support = {name: `Support ${tag}`, email: `${tag}support@mail.test`};
        await ojsApi.createContext({tag, users: [{username: manager, roles: ['manager']}]});

        // The journal needs a technical support contact (Settings › Journal ›
        // Contact) to send the validation email (Rule 12; A6 is never driven).
        const managerPage = await (await asUser(manager)).newPage();
        await openSettingsTab(managerPage, tag, 'context', 'contact');
        const supportName = managerPage.locator('#contact-supportName-control');
        await expect(supportName).toBeVisible({timeout: 30_000});
        await supportName.fill(support.name);
        await managerPage.locator('#contact-supportEmail-control').fill(support.email);
        await saveSettingsForm(managerPage, supportName);

        // The validation-variant server (email validation and ALTCHA on;
        // same database).
        const origin = variants.validation;
        const journalLogin = `${origin}/index.php/${tag}/login`;

        // A browser without JavaScript: the form posts with no spam-check
        // answer and is refused with the one line, the password boxes
        // emptied; no account is created, which the same username's
        // registration below proves (Fields & validation, "Spam check").
        const noScript = await anonContext(browser, baseURL, {javaScriptEnabled: false});
        try {
            const page = await noScript.newPage();
            const register = new RegisterPage(page, tag, {origin});
            await register.goto();
            await register.expectForm();
            await fillJournalForm(register, who);
            await register.submitButton.click();
            await register.expectErrors([SPAM_CHECK_ERROR]);
            await expect(register.username).toHaveValue(who.username);
            await expect(register.password).toHaveValue('');
            await expect(new RegistrationCompletePage(page).heading).toHaveCount(0);
            await expect(page.getByRole('heading', {name: AWAITING_VERIFICATION})).toHaveCount(0);
        } finally {
            await noScript.close();
        }

        // The same visitor with JavaScript on, the same username and email.
        const visitor = await anonContext(browser, baseURL);
        try {
            const page = await visitor.newPage();
            const register = new RegisterPage(page, tag, {origin});
            await register.goto();
            await register.expectForm();
            await fillJournalForm(register, who);
            await register.submitWithSpamCheck();

            // "Registration awaiting verification": not signed in, the
            // breadcrumb's "Home" its only link (Rules 11, 15: the username
            // and email were still free).
            await expect(page.getByRole('heading', {name: AWAITING_VERIFICATION})).toBeVisible({
                timeout: 30_000,
            });
            await expect(
                page.getByText(
                    `We've sent a confirmation email to you at ${who.email}. Please follow the instructions in that email to activate your new account. If you do not see an email, please check to see if it was put in your spam folder.`
                )
            ).toBeVisible();
            await expect(page.getByRole('main').getByRole('link')).toHaveText(['Home']);
            await expect(siteHeader(page).getByRole('link', {name: 'Register', exact: true})).toBeVisible();
            await expect(siteHeader(page).getByRole('link', {name: 'Login', exact: true})).toBeVisible();

            // The same username and email again: the unvalidated account
            // already claims them (Rule 15).
            await register.goto();
            await register.expectForm();
            await fillJournalForm(register, who);
            await register.submitWithSpamCheck();
            await register.expectErrors([USERNAME_TAKEN, EMAIL_TAKEN]);

            // Signing in before activating is refused with the same sentence.
            await signInWithSpamCheck(page, journalLogin, who);
            await expect(
                page.getByText(
                    `Your account has been disabled for the following reason: We've sent a confirmation email to you at ${who.email}.`
                )
            ).toBeVisible();

            // One "Validate Your Account" email from the journal's technical
            // support contact, carrying the activation link (Rule 12); the
            // refused attempt without JavaScript sent nothing.
            const mail = await validationMail(pkpMail, who.email, origin);
            expect(mail.summary.From.Address).toBe(support.email);
            expect(mail.summary.From.Name).toBe(support.name);
            expect(await pkpMail.count({to: who.email})).toBe(1);

            // The link: "Confirm and activate your account" › "Activate
            // Account" › the thank-you sentence (Rule 13).
            const activation = new ActivationPage(page);
            await page.goto(mail.link);
            const activateAddress = await activation.activate();
            expect(activateAddress).toMatch(/\/user\/activateUser\//);

            // The button's own address reopened: the Login page, silently
            // (Rule 13).
            await page.goto(activateAddress);
            await expect(page.locator('form#login')).toBeVisible();
            await expect(page.getByRole('heading', {name: 'Login', exact: true})).toBeVisible();
            await expect(activation.thankYou).toHaveCount(0);
            await expect(activation.confirmText).toHaveCount(0);

            // Signing in on the journal's Login page now works, with the
            // credentials refused before activating (Control), and lands on
            // the journal homepage.
            await signInWithSpamCheck(page, journalLogin, who);
            await page.waitForURL((url) => !url.pathname.includes('/login'), {
                waitUntil: 'commit',
                timeout: 30_000,
            });
            await expect(page).toHaveURL(new RegExp(`^${origin}/index\\.php/${tag}(/en)?(/index)?/?$`));
            await expect(siteHeader(page)).toContainText(who.username);

            // The emailed link once more: "Invitation Unavailable" with
            // "Login" and "Register" (Rule 14).
            await page.goto(mail.link);
            await expect(activation.unavailableHeading).toBeVisible();
            await expect(activation.unavailableLanding.getByRole('link', {name: 'Login', exact: true})).toBeVisible();
            await expect(activation.unavailableLanding.getByRole('link', {name: 'Register', exact: true})).toBeVisible();
            await expect(activation.activateButton).toHaveCount(0);
        } finally {
            await visitor.close();
        }

        // The second visitor, in a browser of their own: the variant's
        // site-level page, "Reader" under the seeded journal and its consent
        // line; "Registration awaiting verification" again (Rule 11); the
        // mail from the site's contact reads "an account with , but…", the
        // site having no title (Rule 12); after activating, sign-in on the
        // site's Login page lands on the site's journal list (Rule 13).
        const secondBrowser = await anonContext(browser, baseURL);
        try {
            const page = await secondBrowser.newPage();
            const register = new RegisterPage(page, null, {origin});
            await register.goto();
            await register.expectForm();
            await expect(register.contextsLegend).toBeVisible();
            const seededBlock = register.contextBlock(JOURNAL_NAME);
            await expect(seededBlock).toHaveCount(1);
            await register.contextRoleBox(seededBlock, 'Reader').check();
            await register.expectConsentShown(seededBlock);
            await register.contextConsentBox(seededBlock).check();
            await register.fillProfile();
            await register.fillLogin(second);
            await register.submitWithSpamCheck();
            await expect(page.getByRole('heading', {name: AWAITING_VERIFICATION})).toBeVisible({
                timeout: 30_000,
            });
            await expect(siteHeader(page).getByRole('link', {name: 'Login', exact: true})).toBeVisible();

            const mail = await validationMail(pkpMail, second.email, origin);
            expect(mail.summary.From.Address).toBe('admin@mail.test');
            expect(mail.body).toContain('You have created an account with , but before you can start using it');
            expect(await pkpMail.count({to: second.email})).toBe(1);

            const activation = new ActivationPage(page);
            await page.goto(mail.link);
            await activation.activate();

            await signInWithSpamCheck(page, `${origin}/index.php/index/login`, second);
            await page.waitForURL((url) => !url.pathname.includes('/login'), {
                waitUntil: 'commit',
                timeout: 30_000,
            });
            await expect(page).toHaveURL(new RegExp(`^${origin}/index\\.php/index(/en)?(/index)?/?$`));
            await expect(siteHeader(page)).toContainText(second.username);
            await expect(page.getByRole('heading', {name: JOURNAL_NAME})).toBeVisible();
        } finally {
            await secondBrowser.close();
        }
    });

    test('S8: a signed-in user opening Register sees the completion page', async ({asUser}) => {
        // A Reader/Author account: the three journal-level links, not the form,
        // and no "View Submissions" (Rules 4, 10).
        const alexPage = await (await asUser('author.alex')).newPage();
        await alexPage.goto(`/index.php/${JOURNAL}/user/register`);
        const alexComplete = new RegistrationCompletePage(alexPage);
        await alexComplete.expectOpen();
        await expect(alexPage.locator('form#register')).toHaveCount(0);
        await alexComplete.expectLinks(['Make a New Submission', 'Edit My Profile', 'Continue Browsing']);
        await expect(alexComplete.link('View Submissions')).toHaveCount(0);

        // A Section Editor sees "View Submissions" as well; pressing it opens
        // the list headed "Assigned to me".
        const anaPage = await (await asUser('sectioneditor.ana')).newPage();
        await anaPage.goto(`/index.php/${JOURNAL}/user/register`);
        const anaComplete = new RegistrationCompletePage(anaPage);
        await anaComplete.expectOpen();
        await anaComplete.expectLinks([
            'View Submissions',
            'Make a New Submission',
            'Edit My Profile',
            'Continue Browsing',
        ]);
        await anaComplete.link('View Submissions').click();
        await expect(anaPage.getByRole('heading', {name: /^Assigned to me/})).toBeVisible({
            timeout: 30_000,
        });

        // The site-level address answers with two links, for the Section
        // Editor too.
        await anaPage.goto('/index.php/index/user/register');
        await anaComplete.expectOpen();
        await anaComplete.expectLinks(['Edit My Profile', 'Continue Browsing']);
        await expect(anaComplete.link('View Submissions')).toHaveCount(0);
        await expect(anaComplete.link('Make a New Submission')).toHaveCount(0);
    });
});
