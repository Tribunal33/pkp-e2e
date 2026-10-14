// @ts-check
/**
 * @file playwright/tests/U02-registration-and-account-validation.spec.js
 *
 * U2 — Registration & account validation, OPS suite. One test per canonical
 * scenario of docs/specs/U02-registration-and-account-validation.md, in OPS
 * vocabulary (preprint server, Server Manager, Moderators; no reviewer role
 * at all). Scenario 3 is {OJS OMP} — a preprint server installs no reviewer
 * role, so it costs one absence test with a positive control per assertion
 * (RUNBOOK multi-app rule 3, spec Rule 7). Scenario 7 runs against the
 * fleet's fixed validation-variant server (`variants.validation`: email
 * validation and the ALTCHA spam check on, same database), reached by
 * explicit navigation; the ALTCHA widget verifies in the browser as a user
 * would see it, and the wait is on the browser's own POST carrying the
 * widget's field. Every registration uses a throwaway account; the seeded
 * server's settings are never touched (settings changes happen on scratch
 * servers), and Mailpit reads are scoped by a unique throwaway recipient
 * (PRINCIPLES A8).
 *
 * Not covered, by register ID (the spec's Coverage section is the record
 * of everything else left out): A1, A2 (the activation pages are asserted
 * by their sentences, never by a heading), A3, A4, A5, A6 (S7 sets the
 * technical support contact first, as fn-s says), A7, OPS1 (S6 and S7 leave
 * the site-level interests box alone). Scenario 3 is {OJS OMP}: only its
 * absence control runs here (Rule 7).
 *
 * Every registration and every sign-in that follows one runs in a browser
 * context the test opens itself (`newVisitor`), never the shared `.auth`
 * storage state; "a second browser" is a second such context, and S7's
 * browser without JavaScript is one created with `javaScriptEnabled: false`
 * (fn-s). S5's disabled server is a second scratch context seeded with
 * `enabled: false`, and its server that requires sign-in a third, seeded
 * with `restrictSiteAccess: true` and registration left open (fn-s).
 */
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getEmail} = require('../../../../shared/playwright/data/users.js');
const {disableMotion} = require('../../../../shared/playwright/support/motion.js');
const {
    RegisterPage,
    RegistrationCompletePage,
    ProfileRolesTab,
    ProfileNotificationsTab,
    ProfileNameTabs,
    ActivationPage,
    ServerSettingsPages,
    loginFormRegisterLink,
} = require('../pages/RegistrationPages.js');

const APP = 'ops';
const PK = 'publicknowledge';
const PK_NAME = 'Public Knowledge Preprint Server';
const COUNTRY = 'Iceland';
const ERRORS_HEADING = 'Errors occurred processing this form:';
const USERNAME_TAKEN = 'The selected username is already in use by another user.';
const EMAIL_TAKEN = 'The selected email address is already in use by another user.';
const PASSWORDS_DIFFER = 'The passwords do not match.';
const PASSWORD_SHORT = 'The password must be at least 6 characters.';
const CONSENT_REQUIRED = 'You must agree to the terms of the privacy statement.';
const CONSENT_LABEL = 'Yes, I agree to have my data collected and stored according to the privacy statement.';
const CONTEXT_CONSENT_LABEL =
    "Yes, I agree to have my data collected and stored according to this server's privacy statement.";
const EMAIL_OPTIN_LABEL = 'Yes, I would like to be notified of new publications and announcements.';
const REVIEWER_OPTIN_TEXT = 'Yes, I would like to be contacted with requests to review';
const CLOSED_MESSAGE = 'This server is currently not accepting user registrations.';
const CONTEXTS_PROMPT = 'Which servers on this site would you like to register with?';
// Site-level page: the role boxes under a default preprint server, and the
// words a screen reader reads before them (not on screen).
const SITE_ROLE_BOXES = ['Reader'];
const ROLES_PROMPT = 'Request the following roles.';
const PENDING_TITLE = 'Registration awaiting verification';
const pendingSentence = (email) =>
    `We've sent a confirmation email to you at ${email}. Please follow the instructions in that email to activate your new account. If you do not see an email, please check to see if it was put in your spam folder.`;
const DISABLED_PREFIX = 'Your account has been disabled for the following reason: ';
const ACTIVATE_DESCRIPTION = 'Confirm and activate your account';
const ACTIVATED =
    'Thank you for activating your account. You may now log in using the credentials you supplied when you created your account.';
const VALIDATE_SUBJECT = 'Validate Your Account';
const INVITATION_UNAVAILABLE = 'Invitation Unavailable';
const SPAM_CHECK = 'You must complete the validation check used to prevent spam submissions.';
const ACCESS_DENIED = 'The current role does not have access to this operation.';
/** The site's contact, the sender of site-level mail (fn-s). */
const SITE_CONTACT = {name: 'Open Preprint Systems', email: 'admin@mail.test'};

/** Single hyphenless alphanumeric token — tag conventions in patterns.md. */
function makeTag(prefix) {
    return prefix + Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 7);
}

/** A throwaway registrant: username, email (names app + test) and password. */
function makeRegistrant(tag, suffix = '') {
    const username = `${tag}${suffix}`;
    return {
        username,
        email: `${username}-${APP}@mail.test`,
        password: `Pw${username}x`,
        givenName: `Given${username}`,
        familyName: 'Registrant',
        affiliation: 'Test University',
    };
}

/** The signed-out / signed-in user menu in the site header. */
function userNav(page) {
    return page.locator('#navigationUser');
}

/** Fill the whole "Profile" + "Login" part of the form for a registrant. */
async function fillRegistrant(register, r) {
    await register.fill({
        givenName: r.givenName,
        familyName: r.familyName,
        affiliation: r.affiliation,
        country: COUNTRY,
        email: r.email,
        username: r.username,
        password: r.password,
        password2: r.password,
    });
}

/**
 * A fresh signed-out browser context (never inherits any storage state).
 * `javaScriptEnabled: false` makes S7's browser without JavaScript.
 */
async function newVisitor(browser, baseURL, {javaScriptEnabled = true} = {}) {
    const context = await browser.newContext({
        baseURL,
        javaScriptEnabled,
        storageState: {cookies: [], origins: []},
    });
    await disableMotion(context);
    return context;
}

/** The "Validate Your Account" email for an address: its summary, full body and the emailed `invitation/accept` link. */
async function validationMail(pkpMail, email) {
    const summary = await pkpMail.find({to: email, subject: VALIDATE_SUBJECT});
    const full = await pkpMail.fullMessage(summary.ID);
    const haystack = `${full.Text || ''}\n${full.HTML || ''}`;
    const match = haystack.match(/https?:\/\/[^\s"'<>]*\/invitation\/accept\?[^\s"'<>]+/);
    expect(match, 'validation email must carry the activation link').not.toBeNull();
    return {summary, full, link: match[0].replace(/&amp;/g, '&')};
}

/**
 * Sign in through a given server's Login form on an arbitrary base URL
 * (the validation variant included). Returns once the form has answered:
 * either the browser left /login, or the page re-rendered with a message.
 */
async function signInAt(page, base, contextPath, username, password) {
    const login = new LoginPage(page);
    await page.goto(`${base}/index.php/${contextPath}/login`);
    await login.usernameInput.fill(username);
    await login.fillPassword(password);
    const answered = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().includes('/login/signIn')
    );
    await login.submitButton.click();
    await answered;
}

test.describe('registration & account validation (U2) — OPS', () => {
    test('S1: register with the server and land on the completion page', async ({browser, baseURL, pkpMail}) => {
        test.slow();
        const tag = makeTag('u02s1');
        const r = makeRegistrant(tag);
        const visitor = await newVisitor(browser, baseURL);
        const page = await visitor.newPage();
        const register = new RegisterPage(page);

        // From the server homepage, the header's "Register" (Rule 1).
        await page.goto(`/index.php/${PK}`);
        await userNav(page).getByRole('link', {name: 'Register', exact: true}).click();
        await expect(register.heading).toBeVisible();
        await expect(page.getByText('Required fields are marked with an asterisk: *')).toBeVisible();

        await fillRegistrant(register, r);
        await register.privacyConsentBox.check();
        // The notification box arrives unticked and is left so (Rule 6).
        await expect(register.emailConsentBox).toBeVisible();
        await expect(register.emailConsentBox).not.toBeChecked();
        await register.submit();

        // "Registration complete" with the three server-level links and no
        // "View Submissions" (Rules 9, 10).
        const complete = new RegistrationCompletePage(page);
        await complete.expectShown();
        await complete.expectActions(['Make a New Submission', 'Edit My Profile', 'Continue Browsing']);

        // Signed in: the header shows the new username where "Register" and
        // "Login" were.
        await expect(userNav(page)).toContainText(r.username);
        await expect(userNav(page).getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);
        await expect(userNav(page).getByRole('link', {name: 'Login', exact: true})).toHaveCount(0);

        // "Edit My Profile" › Roles: "Reader" ticked and nothing else (Rule 7).
        await complete.editProfileLink.click();
        const roles = new ProfileRolesTab(page);
        await roles.tab.click();
        await expect(roles.ownBox('Reader')).toBeChecked();
        await expect(roles.ownBox('Author')).not.toBeChecked();
        expect(await roles.ownContextBoxes.evaluateAll((els) => els.filter((el) => el.checked).length)).toBe(1);

        // Notifications: the server's public-announcement email off ("Do not
        // send me an email…" ticked on the "Public Announcements" row), the
        // in-app notification itself still on; a row of another group at
        // its default (email not blocked) is the contrast (Rule 6, fn-e).
        const notifications = new ProfileNotificationsTab(page);
        await notifications.select();
        await expect(notifications.publicAnnouncementsHeading).toBeVisible();
        await expect(notifications.allowBox('notificationNewAnnouncement')).toBeChecked();
        await expect(notifications.emailBox('notificationNewAnnouncement')).toBeChecked();
        await expect(notifications.allowBox('notificationSubmissionSubmitted')).toBeChecked();
        await expect(notifications.emailBox('notificationSubmissionSubmitted')).not.toBeChecked();

        // The mail catcher: nothing for the new address (no welcome email;
        // the registration's request has long answered, so the read is
        // settled). The positive control that the catcher receives this
        // app's mail is S7's "Validate Your Account" message in the same run.
        expect(await pkpMail.count({to: r.email})).toBe(0);

        // The second visitor: a private address typed while signed out → the
        // Login page; its "Register" link BELOW the form carries the
        // destination; registering there continues to the typed address and
        // is refused as a Reader (Rule 9, fn-h).
        const second = await (await newVisitor(browser, baseURL)).newPage();
        const secondR = makeRegistrant(tag, 'b');
        await second.goto(`/index.php/${PK}/en/dashboard/mySubmissions`);
        await new LoginPage(second).expectForm();
        await expect(second).toHaveURL(/\/login/);
        await loginFormRegisterLink(second).click();
        const register2 = new RegisterPage(second);
        await expect(register2.heading).toBeVisible();
        await fillRegistrant(register2, secondR);
        await register2.privacyConsentBox.check();
        await register2.submit();
        await expect(second.getByText(ACCESS_DENIED)).toBeVisible({timeout: 20_000});
        await expect(second).toHaveURL(/\/user\/authorizationDenied/);
        await expect(new RegistrationCompletePage(second).heading).toHaveCount(0);
        await expect(userNav(second)).toContainText(secondR.username);

        // The third visitor: the server's French Register page; the profile's
        // [en] boxes then show the copy into the site's primary language
        // (Rule 16, fn-k). The French page's own strings are not asserted.
        const third = await (await newVisitor(browser, baseURL)).newPage();
        const thirdR = makeRegistrant(tag, 'c');
        const register3 = new RegisterPage(third);
        await register3.gotoFrench(PK);
        await expect(register3.form).toBeVisible();
        await register3.fill({
            givenName: 'Prénom',
            familyName: 'Nom',
            affiliation: 'Laboratoire FR',
            countryCode: 'IS',
            email: thirdR.email,
            username: thirdR.username,
            password: thirdR.password,
            password2: thirdR.password,
        });
        await register3.privacyConsentBox.check();
        await register3.submitInPageLanguage();
        await expect(register3.form).toHaveCount(0);
        await expect(userNav(third)).toContainText(thirdR.username);
        const names = new ProfileNameTabs(third);
        await names.goto(PK);
        await names.selectIdentity();
        await expect(names.givenName('en')).toHaveValue('Prénom');
        await expect(names.familyName('en')).toHaveValue('Nom');
        await names.selectContact();
        await expect(names.affiliation('en')).toHaveValue('Laboratoire FR');
    });

    test('S2: the form refuses bad input', async ({page}) => {
        const r = makeRegistrant(makeTag('u02s2'));
        const register = new RegisterPage(page);
        await register.goto(PK);
        await expect(register.heading).toBeVisible();

        // A taken username typed with a capital, that account's email in
        // capitals, a short password and a different repeat (Rule 15).
        await fillRegistrant(register, r);
        await register.fill({
            username: 'Reader.Rosa',
            email: getEmail('reader.rosa').toUpperCase(),
            password: 'abc',
            password2: 'xyz',
        });
        await register.privacyConsentBox.check();
        await register.submit();

        await expect(register.errorBox).toContainText(ERRORS_HEADING);
        await expect(register.errorLines).toHaveText([USERNAME_TAKEN, PASSWORDS_DIFFER, EMAIL_TAKEN]);
        await expect(register.usernameInput).toHaveValue('Reader.Rosa');
        await expect(register.passwordInput).toHaveValue('');
        await expect(register.password2Input).toHaveValue('');

        // A fresh username and email with a password below the site minimum.
        await register.fill({username: r.username, email: r.email, password: 'abc', password2: 'abc'});
        await register.privacyConsentBox.check();
        await register.submit();
        await expect(register.errorLines).toHaveText([PASSWORD_SHORT]);
    });

    test('S3 {OJS OMP}: the server\'s Register offers no reviewer box (absence)', async ({page}) => {
        const register = new RegisterPage(page);
        await register.goto(PK);
        await expect(register.heading).toBeVisible();

        // Control: the boxes that sit beside the reviewer offer on a journal
        // are here — the notification opt-in and the privacy consent.
        await expect(register.emailConsentBox).toBeVisible();
        await expect(page.getByText(EMAIL_OPTIN_LABEL)).toBeVisible();
        await expect(register.privacyConsentBox).toBeVisible();

        // Absence: no reviewer checkbox, no reviewer prompt, no "Reviewing
        // interests" box (Rule 7: a preprint server installs no reviewer role).
        await expect(register.reviewerBoxes).toHaveCount(0);
        await expect(register.reviewerFieldset).toHaveCount(0);
        await expect(page.getByText(REVIEWER_OPTIN_TEXT)).toHaveCount(0);
        await expect(page.getByText('Reviewing interests')).toHaveCount(0);
        await expect(register.reviewerInterestsInput).toHaveCount(0);
    });

    test('S4: privacy consent is required when a statement exists', async ({page, context, browser, baseURL, opsApi, asUser}) => {
        test.slow();
        const tag = makeTag('u02s4');
        const manager = `m${tag}`;
        await opsApi.createContext({tag, users: [{username: manager, roles: ['manager']}]});
        const first = makeRegistrant(tag, 'a');
        const second = makeRegistrant(tag, 'b');

        const register = new RegisterPage(page);
        await register.goto(tag);
        await expect(register.heading).toBeVisible();

        // The consent box is present; "privacy statement" opens the server's
        // Privacy Statement page in a new tab (Rule 5).
        await expect(register.privacyConsentBox).toBeVisible();
        await expect(page.getByText(CONSENT_LABEL)).toBeVisible();
        const [statementTab] = await Promise.all([
            context.waitForEvent('page'),
            register.privacyStatementLink.click(),
        ]);
        await expect(statementTab.getByRole('heading', {name: 'Privacy Statement'})).toBeVisible();
        await statementTab.close();

        // A valid form with the box unticked is refused with one line.
        await fillRegistrant(register, first);
        await register.submit();
        await expect(register.errorLines).toHaveText([CONSENT_REQUIRED]);

        // Ticked, with the passwords retyped: "Registration complete".
        await register.privacyConsentBox.check();
        await register.fill({password: first.password, password2: first.password});
        await register.submit();
        await new RegistrationCompletePage(page).expectShown();

        // The Server Manager empties the statement and saves.
        const managerPage = await (await asUser(manager)).newPage();
        await new ServerSettingsPages(managerPage, tag).clearPrivacyStatement();

        // A signed-out visitor: no consent box (control: the notification
        // box beside it is still there), and the form registers without it.
        const visitor = await newVisitor(browser, baseURL);
        try {
            const visitorPage = await visitor.newPage();
            const register2 = new RegisterPage(visitorPage);
            await register2.goto(tag);
            await expect(register2.heading).toBeVisible();
            await expect(register2.emailConsentBox).toBeVisible();
            await expect(register2.privacyConsentBox).toHaveCount(0);
            await expect(visitorPage.getByText(CONSENT_LABEL)).toHaveCount(0);

            await fillRegistrant(register2, second);
            await register2.submit();
            await new RegistrationCompletePage(visitorPage).expectShown();
        } finally {
            await visitor.close();
        }
    });

    test('S5: closed registration', async ({browser, baseURL, opsApi, asUser}) => {
        test.slow();
        const tag = makeTag('u02s5');
        const manager = `m${tag}`;
        await opsApi.createContext({tag, users: [{username: manager, roles: ['manager']}]});
        // The second scratch server, disabled since its creation (fn-s).
        const disabled = makeTag('u02s5d');
        await opsApi.createContext({tag: disabled, context: {enabled: false}});
        // The third, requiring sign-in to view its pages, registration left
        // open (fn-s).
        const restricted = makeTag('u02s5r');
        await opsApi.createContext({tag: restricted, restrictSiteAccess: true});

        // The Server Manager closes registration on Site Access Options.
        const managerPage = await (await asUser(manager)).newPage();
        await new ServerSettingsPages(managerPage, tag).closeRegistration();

        // The Server Manager, still signed in, at the closed server's Register
        // address: "Registration complete", "Make a New Submission" included,
        // never the closed message (Rule 4).
        const managerRegister = new RegisterPage(managerPage);
        await managerRegister.goto(tag);
        const managerComplete = new RegistrationCompletePage(managerPage);
        await managerComplete.expectShown();
        await expect(managerComplete.newSubmissionLink).toBeVisible();
        await expect(managerPage.getByText(CLOSED_MESSAGE)).toHaveCount(0);
        await expect(managerRegister.form).toHaveCount(0);

        // …and at the disabled server's Register address: "Registration
        // complete" even there (Rules 2 and 4).
        await managerRegister.goto(disabled);
        await managerComplete.expectShown();
        await expect(managerRegister.form).toHaveCount(0);
        await expect(new LoginPage(managerPage).form).toHaveCount(0);

        // A visitor, signed out, in a second browser.
        const page = await (await newVisitor(browser, baseURL)).newPage();

        // The server's header offers "Login" (control) and no "Register".
        await page.goto(`/index.php/${tag}`);
        await expect(userNav(page).getByRole('link', {name: 'Login', exact: true})).toBeVisible();
        await expect(userNav(page).getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);

        // The Login page: form and "Forgot your password?" (control), no
        // "Register" link below the form.
        await page.goto(`/index.php/${tag}/login`);
        const login = new LoginPage(page);
        await expect(login.usernameInput).toBeVisible();
        await expect(page.getByRole('main').getByRole('link', {name: 'Forgot your password?'})).toBeVisible();
        await expect(page.getByRole('main').getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);

        // The typed Register address: title "Register", the closed message,
        // a "Login" link, no form (Rule 2).
        const register = new RegisterPage(page);
        await register.goto(tag);
        await expect(register.heading).toBeVisible();
        await expect(page.getByText(CLOSED_MESSAGE)).toBeVisible();
        await expect(page.getByRole('main').getByRole('link', {name: 'Login', exact: true})).toBeVisible();
        await expect(register.form).toHaveCount(0);

        // The disabled server's Register address: its Login page instead,
        // whose own "Register" links (header and in-form) lead straight back
        // to that Login page, with no word that the server is disabled
        // (Rule 2, fn-s).
        const disabledLogin = new LoginPage(page);
        const disabledLoginUrl = new RegExp(`/index\\.php/${disabled}/login`);
        await register.goto(disabled);
        await disabledLogin.expectForm();
        await expect(page).toHaveURL(disabledLoginUrl);
        await expect(register.form).toHaveCount(0);
        await expect(page.getByText(/disabled/i)).toHaveCount(0);
        await userNav(page).getByRole('link', {name: 'Register', exact: true}).click();
        await disabledLogin.expectForm();
        await expect(page).toHaveURL(disabledLoginUrl);
        await expect(register.form).toHaveCount(0);
        await loginFormRegisterLink(page).click();
        await disabledLogin.expectForm();
        await expect(page).toHaveURL(disabledLoginUrl);
        await expect(register.form).toHaveCount(0);
        await expect(page.getByText(/disabled/i)).toHaveCount(0);

        // The server that requires sign-in: its homepage shows that server's
        // Login page instead (Rule 3, fn-s)…
        const restrictedLogin = new LoginPage(page);
        await page.goto(`/index.php/${restricted}`);
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${restricted}/login\\?source=`));
        await restrictedLogin.expectForm();
        await expect(page.getByRole('heading', {name: 'Login', exact: true})).toBeVisible();
        await expect(register.form).toHaveCount(0);
        // …while its typed Register address shows the full form, not the
        // closed message, and the header there offers "Register" beside
        // "Login" (Rules 1 and 3).
        await register.goto(restricted);
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${restricted}/user/register$`));
        await expect(register.heading).toBeVisible();
        await expect(register.form).toBeVisible();
        for (const field of [
            register.givenNameInput,
            register.affiliationInput,
            register.countrySelect,
            register.emailInput,
            register.usernameInput,
            register.passwordInput,
            register.password2Input,
            register.privacyConsentBox,
            register.emailConsentBox,
            register.registerButton,
        ]) {
            await expect(field).toBeVisible();
        }
        await expect(page.getByText(CLOSED_MESSAGE)).toHaveCount(0);
        await expect(restrictedLogin.form).toHaveCount(0);
        await expect(userNav(page).getByRole('link')).toHaveText(['Register', 'Login']);
        await expect(userNav(page).getByRole('link', {name: 'Register', exact: true})).toHaveAttribute(
            'href',
            new RegExp(`/index\\.php/${restricted}/user/register$`)
        );
        await expect(userNav(page).getByRole('link', {name: 'Login', exact: true})).toHaveAttribute(
            'href',
            new RegExp(`/index\\.php/${restricted}/login$`)
        );

        // The site homepage's "Register" still opens the site-level page,
        // because the seeded server is open.
        await page.goto('/index.php/index');
        await userNav(page).getByRole('link', {name: 'Register', exact: true}).click();
        await expect(register.heading).toBeVisible();
        await expect(register.form).toBeVisible();
        await expect(register.contextsLegend).toHaveText(CONTEXTS_PROMPT);
        await expect(register.readerBox(PK_NAME)).toBeVisible();
    });

    test('S6: register from the site homepage with roles in two servers', async ({browser, baseURL, opsApi}) => {
        test.slow();
        const tag = makeTag('u02s6');
        const scratchName = `Scratch server ${tag}`;
        await opsApi.createContext({tag, context: {name: scratchName}});
        const r = makeRegistrant(tag);
        const page = await (await newVisitor(browser, baseURL)).newPage();

        // The site homepage (the server list) → header "Register" (Rule 1).
        await page.goto('/index.php/index');
        await userNav(page).getByRole('link', {name: 'Register', exact: true}).click();
        const register = new RegisterPage(page);
        await expect(register.heading).toBeVisible();
        await expect(register.contextsLegend).toHaveText(CONTEXTS_PROMPT);

        // Both servers are listed by name, each with its role boxes under
        // the name: one "Reader" box (a preprint server offers Reader only,
        // Rule 8). "Request the following roles." is not on screen: a
        // screen reader reads it before each server's boxes.
        for (const name of [PK_NAME, scratchName]) {
            const block = register.contextBlock(name);
            await expect(block).toBeVisible();
            await register.expectContextListed(name, SITE_ROLE_BOXES);
            await register.expectRolesPromptForScreenReaderOnly(name, ROLES_PROMPT, SITE_ROLE_BOXES);
            await expect(register.readerBox(name)).toBeVisible();
            await expect(register.contextRoleBoxes(name)).toHaveCount(1);
        }

        // Before anything is ticked: no box ticked, no consent line under
        // either server (on a preprint server the line appears only once a
        // role is ticked), and no site consent box, the site having no
        // statement of its own (Rule 5).
        await expect(register.checkedBoxes).toHaveCount(0);
        for (const name of [PK_NAME, scratchName]) {
            await expect(register.contextConsentLine(name)).not.toHaveClass(/context_privacy_visible/);
            await register.expectConsentLineOnScreen(name, false);
        }
        await expect(register.siteConsentBox).toHaveCount(0);

        // Ticking a role brings that server's consent line into view (the
        // positive control of the off-screen read above).
        for (const name of [PK_NAME, scratchName]) {
            await register.readerBox(name).check();
            await expect(register.contextConsentLine(name)).toHaveClass(/context_privacy_visible/);
            await register.expectConsentLineOnScreen(name, true);
            await expect(register.contextConsentLine(name)).toContainText(CONTEXT_CONSENT_LABEL);
            await register.contextConsentBox(name).check();
        }

        await fillRegistrant(register, r);
        await register.submit();

        // Site-level completion: "Edit My Profile" and "Continue Browsing"
        // only (Rule 10).
        const complete = new RegistrationCompletePage(page);
        await complete.expectShown();
        await complete.expectActions(['Edit My Profile', 'Continue Browsing']);

        // "Edit My Profile" › Roles: exactly the ticked roles in their
        // servers, nothing else (Rule 8).
        await complete.editProfileLink.click();
        const roles = new ProfileRolesTab(page);
        await roles.tab.click();
        await expect(roles.roleBoxes.first()).toBeVisible({timeout: 20_000});
        for (const name of [PK_NAME, scratchName]) {
            const section = roles.contextSection(name);
            await expect(section.getByRole('checkbox', {name: 'Reader', exact: true})).toBeChecked();
            await expect(section.getByRole('checkbox', {name: 'Author', exact: true})).not.toBeChecked();
        }
        expect(await roles.roleBoxes.evaluateAll((els) => els.filter((el) => el.checked).length)).toBe(2);

        // The second visitor: the site-level page with nothing ticked, no
        // server and no role: no consent line on the page, and the form
        // registers with no consent at all (Rule 5); "Registration complete"
        // with the two site-level links only (Control), then the Roles tab
        // with no role ticked in any server (Rule 8).
        const second = await (await newVisitor(browser, baseURL)).newPage();
        const secondR = makeRegistrant(tag, 'b');
        const register2 = new RegisterPage(second);
        await register2.goto('index');
        await expect(register2.heading).toBeVisible();
        await expect(register2.contextsLegend).toHaveText(CONTEXTS_PROMPT);
        await expect(register2.checkedBoxes).toHaveCount(0);
        for (const name of [PK_NAME, scratchName]) {
            await expect(register2.contextConsentLine(name)).not.toHaveClass(/context_privacy_visible/);
            await register2.expectConsentLineOnScreen(name, false);
        }
        await expect(register2.siteConsentBox).toHaveCount(0);
        await fillRegistrant(register2, secondR);
        await register2.submit();
        const complete2 = new RegistrationCompletePage(second);
        await complete2.expectShown();
        await expect(register2.errorLines).toHaveCount(0);
        await complete2.expectActions(['Edit My Profile', 'Continue Browsing']);
        const roles2 = new ProfileRolesTab(second);
        await roles2.goto(PK);
        // Both servers are listed (the positive control) and no box is ticked.
        await expect(roles2.ownBox('Reader')).toBeVisible();
        await expect(roles2.contextSection(scratchName).first()).toBeAttached();
        await expect(roles2.roleBoxes.first()).toBeAttached();
        await expect(roles2.form.locator('input[type="checkbox"]:checked')).toHaveCount(0);
    });

    test('S7: email validation', async ({browser, opsApi, asUser, pkpMail, variants}) => {
        test.slow();
        const tag = makeTag('u02s7');
        const manager = `m${tag}`;
        const support = {name: `Support ${tag}`, email: `${tag}-support-${APP}@mail.test`};
        await opsApi.createContext({tag, users: [{username: manager, roles: ['manager']}]});
        const r = makeRegistrant(tag);
        const base = variants.validation;
        const registerUrl = `${base}/index.php/${tag}/user/register`;

        // The scratch server needs a technical support contact to send the
        // validation email (Rule 12; the seeded server has none — A6).
        const managerPage = await (await asUser(manager)).newPage();
        await new ServerSettingsPages(managerPage, tag).setTechnicalSupportContact(support);

        // A browser without JavaScript: the ALTCHA widget posts nothing, the
        // form comes back refused with the spam line, no account created
        // (Fields & validation "Spam check", fn-f).
        const noJs = await (await newVisitor(browser, base, {javaScriptEnabled: false})).newPage();
        await noJs.goto(registerUrl);
        const registerNoJs = new RegisterPage(noJs);
        await expect(registerNoJs.heading).toBeVisible();
        await fillRegistrant(registerNoJs, r);
        await registerNoJs.privacyConsentBox.check();
        await registerNoJs.submit();
        await expect(registerNoJs.errorBox).toContainText(ERRORS_HEADING);
        await expect(registerNoJs.errorLines).toHaveText([SPAM_CHECK]);
        await expect(noJs.getByRole('heading', {name: PENDING_TITLE})).toHaveCount(0);

        // With JavaScript on, the same username and email register: the
        // refused attempt created no account (Rule 15). ALTCHA verifies in
        // the browser as "Register" is pressed.
        const page = await (await newVisitor(browser, base)).newPage();
        const register = new RegisterPage(page);
        await page.goto(registerUrl);
        await expect(register.heading).toBeVisible();
        await fillRegistrant(register, r);
        await register.privacyConsentBox.check();
        await register.submitThroughAltcha();

        // "Registration awaiting verification": the sentence with the
        // address, the breadcrumb's "Home" as the only link, still signed
        // out (Rule 11).
        await expect(page.getByRole('heading', {name: PENDING_TITLE})).toBeVisible();
        await expect(page.getByText(pendingSentence(r.email))).toBeVisible();
        await expect(page.getByRole('main').getByRole('link')).toHaveText(['Home']);
        await expect(userNav(page).getByRole('link', {name: 'Login', exact: true})).toBeVisible();
        await expect(userNav(page).getByRole('link', {name: 'Register', exact: true})).toBeVisible();
        await expect(userNav(page)).not.toContainText(r.username);

        // The same username and email again: the unvalidated account already
        // claims them (Rule 15).
        await page.goto(registerUrl);
        await expect(register.heading).toBeVisible();
        await fillRegistrant(register, r);
        await register.privacyConsentBox.check();
        await register.submitThroughAltcha();
        await expect(register.errorBox).toContainText(ERRORS_HEADING);
        await expect(register.errorLines).toHaveText([USERNAME_TAKEN, EMAIL_TAKEN]);

        // Signing in before activating is refused with the disabled reason.
        await signInAt(page, base, tag, r.username, r.password);
        await expect(page.getByText(DISABLED_PREFIX + pendingSentence(r.email))).toBeVisible();
        await expect(page).toHaveURL(/\/login/);

        // The "Validate Your Account" email, from the technical support
        // contact, carries the activation link (Rule 12).
        const mail = await validationMail(pkpMail, r.email);
        expect(mail.summary.From.Address).toBe(support.email);
        expect(mail.summary.From.Name).toBe(support.name);
        const activationLink = mail.link;
        expect(activationLink.startsWith(base)).toBe(true);

        // The link: "Confirm and activate your account" + "Activate Account";
        // the button's own address is captured at the press; pressing it
        // activates (Rule 13).
        await page.goto(activationLink);
        const activation = new ActivationPage(page);
        await expect(activation.description).toBeVisible();
        await expect(activation.activateButton).toBeVisible();
        const activateHref = await activation.activateHref();
        expect(activateHref).toMatch(/\/user\/activateUser\//);
        await activation.activateButton.click();
        await expect(activation.activated).toBeVisible();

        // The button's own address reopened: the Login page, silently (Rule 13).
        await page.goto(activateHref);
        await new LoginPage(page).expectForm();
        await expect(page.getByRole('heading', {name: 'Login', exact: true})).toBeVisible();
        await expect(activation.activated).toHaveCount(0);
        await expect(page.getByRole('heading', {name: INVITATION_UNAVAILABLE})).toHaveCount(0);

        // Sign-in on the server's Login page works now, the same credentials
        // as before activation (Control), and lands on the server homepage.
        await signInAt(page, base, tag, r.username, r.password);
        await page.waitForURL((url) => !url.pathname.includes('/login'), {waitUntil: 'commit'});
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tag}(/index)?/?$`));
        await expect(userNav(page)).toContainText(r.username);

        // The emailed link once more: "Invitation Unavailable" with "Login"
        // and "Register" (Rule 14).
        await page.goto(activationLink);
        await expect(page.getByRole('heading', {name: INVITATION_UNAVAILABLE})).toBeVisible();
        await expect(page.getByRole('link', {name: 'Login', exact: true})).toBeVisible();
        await expect(page.getByRole('link', {name: 'Register', exact: true})).toBeVisible();
        await expect(activation.activateButton).toHaveCount(0);

        // The second visitor: the variant's site-level page, "Reader" under
        // the seeded server (its only box) and its consent line →
        // "Registration awaiting verification" (Rule 11); the mail From the
        // site contact reading "an account with , but…" (Rule 12); activate;
        // sign in on the site's Login page, landing on the site's server
        // list (Rule 13).
        const second = await (await newVisitor(browser, base)).newPage();
        const secondR = makeRegistrant(tag, 'b');
        const siteRegister = new RegisterPage(second);
        await second.goto(`${base}/index.php/index/user/register`);
        await expect(siteRegister.heading).toBeVisible();
        await expect(siteRegister.contextsLegend).toHaveText(CONTEXTS_PROMPT);
        await expect(siteRegister.contextRoleBoxes(PK_NAME)).toHaveCount(1);
        await siteRegister.readerBox(PK_NAME).check();
        await expect(siteRegister.contextConsentLine(PK_NAME)).toHaveClass(/context_privacy_visible/);
        await siteRegister.contextConsentBox(PK_NAME).check();
        await fillRegistrant(siteRegister, secondR);
        await siteRegister.submitThroughAltcha();
        await expect(second.getByRole('heading', {name: PENDING_TITLE})).toBeVisible();
        await expect(second.getByText(pendingSentence(secondR.email))).toBeVisible();
        await expect(userNav(second)).not.toContainText(secondR.username);
        // Before activating, the same credentials are refused (Control).
        await signInAt(second, base, 'index', secondR.username, secondR.password);
        await expect(second.getByText(DISABLED_PREFIX + pendingSentence(secondR.email))).toBeVisible();
        const siteMail = await validationMail(pkpMail, secondR.email);
        expect(siteMail.summary.From.Address).toBe(SITE_CONTACT.email);
        expect(siteMail.summary.From.Name).toBe(SITE_CONTACT.name);
        expect(siteMail.full.Text).toContain('You have created an account with , but');
        await second.goto(siteMail.link);
        const siteActivation = new ActivationPage(second);
        await expect(siteActivation.description).toBeVisible();
        await siteActivation.activateButton.click();
        await expect(siteActivation.activated).toBeVisible();
        await signInAt(second, base, 'index', secondR.username, secondR.password);
        await second.waitForURL((url) => !url.pathname.includes('/login'), {waitUntil: 'commit'});
        await expect(second).toHaveURL(/\/index\.php\/index(\/en)?(\/index)?\/?$/);
        await expect(userNav(second)).toContainText(secondR.username);
    });

    test('S8: a signed-in user opening Register sees the completion page', async ({asUser, appContext}) => {
        // A plain Reader/Author account: the three server-level links, no
        // "View Submissions" (Rule 10).
        const authorPage = await (await asUser(appContext.seed.actors.author)).newPage();
        const complete = new RegistrationCompletePage(authorPage);
        await authorPage.goto(`/index.php/${PK}/user/register`);
        await complete.expectShown();
        await expect(authorPage.locator('form#register')).toHaveCount(0);
        await complete.expectActions(['Make a New Submission', 'Edit My Profile', 'Continue Browsing']);
        await expect(complete.viewSubmissionsLink).toHaveCount(0);

        // A Moderator (OPS's Section Editor) sees "View Submissions" as well
        // (Rule 10); pressing it opens the list headed "Assigned to me".
        const moderatorPage = await (await asUser(appContext.seed.actors.sectionEditor)).newPage();
        const moderatorComplete = new RegistrationCompletePage(moderatorPage);
        await moderatorPage.goto(`/index.php/${PK}/user/register`);
        await moderatorComplete.expectShown();
        await moderatorComplete.expectActions([
            'View Submissions',
            'Make a New Submission',
            'Edit My Profile',
            'Continue Browsing',
        ]);
        await moderatorComplete.viewSubmissionsLink.click();
        await moderatorPage.waitForURL(/\/dashboard\/editorial/, {waitUntil: 'commit'});
        await expect(moderatorPage.getByRole('heading', {name: /^Assigned to me/})).toBeVisible({timeout: 20_000});

        // Control: the Author, then the Moderator, types the site-level
        // Register address: for each of them alike "Registration complete"
        // offers "Edit My Profile" and "Continue Browsing" only (Rule 10).
        await authorPage.goto('/index.php/index/user/register');
        await complete.expectShown();
        await complete.expectActions(['Edit My Profile', 'Continue Browsing']);
        await moderatorPage.goto('/index.php/index/user/register');
        await moderatorComplete.expectShown();
        await moderatorComplete.expectActions(['Edit My Profile', 'Continue Browsing']);
    });
});
